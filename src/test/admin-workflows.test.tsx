import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { Package, Settings, Users } from 'lucide-react'
import { catalogBrands, catalogCategories, referenceModels } from '../lib/catalog'
import ProductEditor from '../features/admin/ProductEditor'
import AdminShell from '../features/admin/AdminShell'
import CrudPanel from '../features/admin/CrudPanel'
import { unit } from './fixtures'

const mock = vi.hoisted(() => ({
  drafts: new Map<string, unknown>(),
  rpc: vi.fn().mockResolvedValue({ error: null }),
}))
vi.mock('../lib/product-drafts', () => ({
  readProductDraft: async (key: string) => mock.drafts.get(key),
  writeProductDraft: async (key: string, value: unknown) => {
    mock.drafts.set(key, value)
  },
  clearProductDraft: async (key: string) => {
    mock.drafts.delete(key)
  },
}))
vi.mock('../lib/supabase', () => ({
  supabase: null,
  isConfigured: true,
  imageUrl: (path: string) => path,
  requireSupabase: () => ({ rpc: mock.rpc, auth: { signOut: vi.fn() } }),
}))
beforeEach(() => {
  mock.drafts.clear()
  mock.rpc.mockClear()
  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    value: () => ({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() }),
  })
  URL.createObjectURL = vi.fn(() => 'blob:preview')
  URL.revokeObjectURL = vi.fn()
})
function editor(
  product = null as ReturnType<typeof unit> | null,
  key = 'product:owner:new',
  saved = vi.fn(),
) {
  return (
    <MemoryRouter>
      <ProductEditor
        product={product}
        brands={catalogBrands}
        categories={catalogCategories}
        models={referenceModels(catalogBrands, catalogCategories)}
        draftKey={key}
        onSaved={saved}
        onCancel={vi.fn()}
        onBusyChange={vi.fn()}
      />
    </MemoryRouter>
  )
}
describe('product drafts', () => {
  it('restores entered fields and selected photos after modal contents unmount', async () => {
    const view = render(editor())
    fireEvent.change(await screen.findByLabelText('Brand'), {
      target: { value: catalogBrands.find((brand) => brand.slug === 'apple')!.id },
    })
    const model = within(screen.getByLabelText('Model')).getByRole('option', {
      name: 'iPhone 13',
    }) as HTMLOptionElement
    fireEvent.change(screen.getByLabelText('Model'), { target: { value: model.value } })
    fireEvent.change(screen.getByLabelText('Nama tampilan'), {
      target: { value: 'Draf unit belum disimpan' },
    })
    const file = new File(['photo'], 'unit-asli.webp', { type: 'image/webp' })
    fireEvent.change(document.getElementById('unit-photos')!, { target: { files: [file] } })
    await waitFor(() =>
      expect(mock.drafts.get('product:owner:new')).toMatchObject({
        files: [file],
        values: { name: 'Draf unit belum disimpan' },
      }),
    )
    view.unmount()
    render(editor())
    expect(await screen.findByLabelText('Nama tampilan')).toHaveValue('Draf unit belum disimpan')
    expect(screen.getByAltText('foto baru 1')).toBeInTheDocument()
    expect(screen.getByText('unit-asli.webp')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Hapus foto baru 1' }))
    expect(screen.queryByAltText('foto baru 1')).not.toBeInTheDocument()
    await waitFor(() => expect(mock.drafts.get('product:owner:new')).toMatchObject({ files: [] }))
  })
  it('clears a local draft only after a successful product save', async () => {
    const saved = vi.fn()
    const product = unit({
      brand_id: catalogBrands.find((brand) => brand.slug === 'apple')!.id,
      category_id: catalogCategories.find((category) => category.slug === 'iphone')!.id,
      status: 'draft',
    })
    render(editor(product, 'product:owner:existing', saved))
    await screen.findByLabelText('Brand')
    fireEvent.click(screen.getByRole('button', { name: 'Simpan unit' }))
    await waitFor(() => expect(saved).toHaveBeenCalledOnce())
    expect(mock.drafts.has('product:owner:existing')).toBe(false)
  })
})
describe('admin navigation and store management', () => {
  const items = [
    ['produk', 'Produk', Package],
    ['pengaturan', 'Pengaturan', Settings],
    ['akun', 'Akun admin', Users],
  ] as const
  function shell(role: 'owner' | 'admin') {
    return (
      <QueryClientProvider client={new QueryClient()}>
        <MemoryRouter initialEntries={['/admin/produk']}>
          <AdminShell profile={{ user_id: 'viewer', display_name: 'Viewer', role }} items={items}>
            <p>Isi halaman</p>
          </AdminShell>
        </MemoryRouter>
      </QueryClientProvider>
    )
  }
  it('opens a left menu and closes it after selecting another page', () => {
    render(shell('owner'))
    const activeLink = screen.getByRole('link', { name: 'Produk' })
    expect(activeLink).toHaveAttribute('aria-current', 'page')
    expect(activeLink).toHaveClass('bg-navy', 'text-white')
    fireEvent.click(screen.getByRole('button', { name: 'Buka menu admin' }))
    const menu = screen.getByRole('dialog', { name: 'Menu admin' })
    expect(menu).toHaveAttribute('open')
    fireEvent.click(within(menu).getByRole('link', { name: 'Pengaturan' }))
    expect(menu).not.toHaveAttribute('open')
    expect(document.body.style.overflow).not.toBe('hidden')
  })
  it('does not expose account management to admins', () => {
    render(shell('admin'))
    expect(screen.queryByRole('link', { name: 'Akun admin' })).not.toBeInTheDocument()
  })
  it('provides add/edit controls for store managers', () => {
    render(
      <MemoryRouter>
        <CrudPanel
          table="brands"
          rows={[{ id: 'brand', name: 'Apple', is_active: true }]}
          products={[]}
          onSaved={vi.fn()}
        />
      </MemoryRouter>,
    )
    expect(screen.getByRole('heading', { name: 'Apple' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Tambah brand' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Ubah' })).toBeInTheDocument()
  })
  it.each(['owner', 'admin'] as const)(
    'does not show profile/role captions in the sidebar for %s',
    (role) => {
      render(shell(role))
      expect(screen.queryByText('Viewer')).not.toBeInTheDocument()
      expect(screen.queryByText(/Pengelolaan toko|Monitoring toko/)).not.toBeInTheDocument()
      expect(screen.queryByText(role, { exact: true })).not.toBeInTheDocument()
    },
  )
})
