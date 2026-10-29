import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { describe, it, expect, vi } from 'vitest'
import Catalog from '../features/Catalog'
import ProductDetail from '../features/ProductDetail'
import { defaults, useStore } from '../lib/data'
import { unit } from './fixtures'
vi.mock('../lib/data', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../lib/data')>()),
  useStore: vi.fn(),
}))
const mocked = vi.mocked(useStore)
function store(products = [unit()]) {
  mocked.mockReturnValue({
    data: {
      products,
      brands: [unit().brands!],
      categories: [unit().categories!],
      promotions: [],
      reviews: [],
      settings: { ...defaults, whatsapp_number: '081234567890' },
    },
    isPending: false,
    isError: false,
    refetch: vi.fn(),
  } as unknown as ReturnType<typeof useStore>)
}
function Location() {
  const { search } = useLocation()
  return <output data-testid="url">{search}</output>
}
describe('public user journeys', () => {
  it('synchronizes filters to URL and resets to the full catalog', () => {
    store()
    render(
      <MemoryRouter initialEntries={['/gadget?q=missing&grade=B']}>
        <Catalog />
        <Location />
      </MemoryRouter>,
    )
    expect(screen.getByText('Belum ketemu yang cocok.')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Reset semua' }))
    expect(screen.getByRole('heading', { name: 'iPhone 13' })).toBeInTheDocument()
    fireEvent.change(screen.getByLabelText('Cari gadget'), { target: { value: 'Midnight' } })
    expect(screen.getByTestId('url')).toHaveTextContent('q=Midnight')
    fireEvent.click(screen.getAllByLabelText('Apple')[0])
    expect(screen.getByTestId('url')).toHaveTextContent('brand=apple')
  })
  it('sold product direct URLs stay accessible without a transaction link', () => {
    store([unit({ status: 'sold', stock_quantity: 0 })])
    render(
      <MemoryRouter initialEntries={['/gadget/test-iphone']}>
        <Routes>
          <Route path="/gadget/:slug" element={<ProductDetail />} />
        </Routes>
      </MemoryRouter>,
    )
    expect(screen.getByText('Unit ini sudah terjual')).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /Tanya stok/ })).not.toBeInTheDocument()
    expect(screen.getByText('Catatan kondisi khusus pengujian')).toBeInTheDocument()
  })
  it('available product contact uses the configured number, current price, and detail URL', () => {
    store()
    render(
      <MemoryRouter initialEntries={['/gadget/test-iphone']}>
        <Routes>
          <Route path="/gadget/:slug" element={<ProductDetail />} />
        </Routes>
      </MemoryRouter>,
    )
    const link = screen.getByRole('link', { name: /Tanya stok/ }) as HTMLAnchorElement
    expect(link.href).toContain('wa.me/6281234567890')
    const message = new URL(link.href).searchParams.get('text')!
    expect(message).toContain('iPhone 13')
    expect(message).toContain('6.000.000')
    expect(message).toContain('/gadget/test-iphone')
  })
})
