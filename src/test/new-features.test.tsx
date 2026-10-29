import { act, fireEvent, render, screen, within, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, it, expect, vi } from 'vitest'
import { catalogBrands, catalogCategories, referenceModels } from '../lib/catalog'
import ProductEditor from '../features/admin/ProductEditor'
import { inventorySeries } from '../features/admin/InventoryCharts'
import { selectCollection } from '../features/Collections'
import { purchaseLinks } from '../components/StoreFooter'
import { filterProducts } from '../lib/utils'
import { validateReviewInput } from '../../supabase/functions/_shared/validation'
import { unit } from './fixtures'
const backend = vi.hoisted(() => ({ rpc: vi.fn().mockResolvedValue({ error: null }) }))
vi.mock('../lib/supabase', () => ({
  supabase: null,
  isConfigured: false,
  imageUrl: (path: string) => path,
  requireSupabase: () => ({ rpc: backend.rpc }),
}))

describe('guided product entry', () => {
  it('filters models by brand, fills category, generates codes and supports custom variants', () => {
    render(
      <MemoryRouter>
        <ProductEditor
          product={null}
          brands={catalogBrands}
          categories={catalogCategories}
          models={referenceModels(catalogBrands, catalogCategories)}
          onSaved={vi.fn()}
          onCancel={vi.fn()}
          onBusyChange={vi.fn()}
        />
      </MemoryRouter>,
    )
    fireEvent.change(screen.getByLabelText('Brand'), {
      target: { value: catalogBrands.find((b) => b.slug === 'apple')!.id },
    })
    const choice = screen.getByLabelText('Model')
    expect(within(choice).queryByRole('option', { name: 'Galaxy A55 5G' })).not.toBeInTheDocument()
    const iphone = within(choice).getByRole('option', { name: 'iPhone 13' }) as HTMLOptionElement
    fireEvent.change(choice, { target: { value: iphone.value } })
    expect(screen.getByLabelText('Nama tampilan')).toHaveValue('iPhone 13')
    expect((screen.getByLabelText('SKU otomatis') as HTMLInputElement).value).toMatch(/^SD-/)
    expect(screen.getByLabelText('Kategori')).toHaveValue(
      catalogCategories.find((c) => c.slug === 'iphone')!.id,
    )
    expect(
      within(screen.getByLabelText('Penyimpanan')).getByRole('option', { name: '128 GB' }),
    ).toBeInTheDocument()
    fireEvent.change(screen.getByLabelText('Warna unit'), { target: { value: 'custom' } })
    const custom = screen.getByLabelText('Varian lain Warna unit')
    fireEvent.change(custom, { target: { value: 'Warna khusus unit' } })
    expect(custom).toHaveValue('Warna khusus unit')
    fireEvent.change(screen.getByLabelText('Brand'), {
      target: { value: catalogBrands.find((b) => b.slug === 'samsung')!.id },
    })
    expect(screen.getByLabelText('Penyimpanan')).toHaveValue('')
    expect(screen.getByLabelText('Model')).toHaveValue('')
    expect(
      within(screen.getByLabelText('Model')).queryByRole('option', { name: 'iPhone 13' }),
    ).not.toBeInTheDocument()
  })
  it('ships a model for every built-in brand and correct older iPhone capacity choices', () => {
    const models = referenceModels(catalogBrands, catalogCategories)
    for (const brand of catalogBrands)
      expect(models.some((m) => m.brand_id === brand.id)).toBe(true)
    expect(models.find((m) => m.name === 'iPhone 11')?.storage_options).toEqual([64, 128, 256])
    expect(models.find((m) => m.name === 'iPhone 12 Pro')?.storage_options).toEqual([128, 256, 512])
  })
  it('saves the automatically selected category and variants through the new atomic RPC', async () => {
    backend.rpc.mockClear()
    const onSaved = vi.fn(),
      brand = catalogBrands.find((b) => b.slug === 'apple')!,
      category = catalogCategories.find((c) => c.slug === 'iphone')!
    render(
      <MemoryRouter>
        <ProductEditor
          product={unit({ brand_id: brand.id, category_id: category.id, status: 'draft' })}
          brands={catalogBrands}
          categories={catalogCategories}
          models={referenceModels(catalogBrands, catalogCategories)}
          onSaved={onSaved}
          onCancel={vi.fn()}
          onBusyChange={vi.fn()}
        />
      </MemoryRouter>,
    )
    const model = within(screen.getByLabelText('Model')).getByRole('option', {
      name: 'iPhone 13',
    }) as HTMLOptionElement
    fireEvent.change(screen.getByLabelText('Model'), { target: { value: model.value } })
    fireEvent.change(screen.getByLabelText('Penyimpanan'), { target: { value: '128' } })
    fireEvent.change(screen.getByLabelText('Warna unit'), { target: { value: 'midnight' } })
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Simpan unit' }))
    })
    expect(screen.queryAllByRole('alert').map((e) => e.textContent)).toEqual([])
    await waitFor(() => expect(onSaved).toHaveBeenCalled())
    expect(backend.rpc).toHaveBeenCalledWith(
      'save_product_v2',
      expect.objectContaining({
        record_data: expect.objectContaining({
          model_id: model.value,
          brand_id: brand.id,
          category_id: category.id,
          storage_gb: 128,
          color: 'midnight',
        }),
      }),
    )
  })
})
describe('collections, footer and charts', () => {
  it('only places available used units with explicit warranty into collections and matching catalog links', () => {
    const products = [
      unit({ has_warranty: true, warranty_notes: '7 hari' }),
      unit({ id: 'no-warranty' }),
      unit({
        id: 'new',
        condition_label: 'Brand New In Box',
        has_warranty: true,
        warranty_notes: '1 tahun',
      }),
      unit({ id: 'sold', status: 'sold', has_warranty: true, warranty_notes: '7 hari' }),
    ]
    expect(selectCollection(products, 'phone').map((p) => p.id)).toEqual([unit().id])
    expect(
      filterProducts(products, new URLSearchParams('collection=phone&status=available')).map(
        (p) => p.id,
      ),
    ).toEqual([unit().id])
    expect(purchaseLinks([unit({ status: 'sold' })])).toEqual([])
    expect(purchaseLinks(products).map((l) => l.label)).toContain('Beli iPhone bekas')
  })
  it('counts actual incoming and sold timestamps in Jakarta time, excluding unknown historical sale dates', () => {
    const rows = inventorySeries(
      [
        unit({
          created_at: '2026-10-28T18:00:00Z',
          status: 'sold',
          sold_at: '2026-10-29T00:00:00Z',
        }),
        unit({ id: 'legacy', created_at: '2026-09-01T00:00:00Z', status: 'sold', sold_at: null }),
      ],
      7,
      new Date('2026-10-29T12:00:00Z'),
    )
    expect(rows.at(-1)).toMatchObject({ day: '2026-10-29', incoming: 1, sold: 1 })
    expect(rows.reduce((n, r) => n + r.sold, 0)).toBe(1)
  })
})
describe('user review validation', () => {
  it('requires genuine consent, bounded text, rating and CAPTCHA while ignoring author-supplied approval', () => {
    const input = {
      display_name: 'Customer',
      body: 'Pengalaman pribadi saya di toko.',
      rating: 5,
      consent: true,
      website: '',
      captcha_token: 'captcha',
      is_approved: true,
    }
    expect(validateReviewInput(input)).toEqual({
      display_name: 'Customer',
      body: 'Pengalaman pribadi saya di toko.',
      rating: 5,
    })
    for (const change of [
      { consent: false },
      { rating: 6 },
      { body: 'x' },
      { captcha_token: '' },
      { website: 'spam' },
    ])
      expect(() => validateReviewInput({ ...input, ...change })).toThrow()
  })
})
