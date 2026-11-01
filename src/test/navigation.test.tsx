import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter, useLocation } from 'react-router-dom'
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest'
import PublicLayout from '../components/layout'
import { defaults, useStore } from '../lib/data'

vi.mock('../lib/data', async (original) => ({
  ...(await original<typeof import('../lib/data')>()),
  useStore: vi.fn(),
}))
function RouteLocation() {
  const location = useLocation()
  return (
    <output data-testid="location">
      {location.pathname}
      {location.search}
    </output>
  )
}
beforeEach(() => {
  vi.stubGlobal(
    'matchMedia',
    vi.fn(() => ({ matches: true, addEventListener: vi.fn(), removeEventListener: vi.fn() })),
  )
  vi.stubGlobal('scrollTo', vi.fn())
  vi.mocked(useStore).mockReturnValue({
    data: {
      products: [],
      brands: [],
      categories: [],
      promotions: [],
      reviews: [],
      settings: {
        ...defaults,
        instagram_url: 'https://www.instagram.com/example',
        whatsapp_number: '081234567890',
      },
    },
    isPending: false,
    isError: false,
  } as unknown as ReturnType<typeof useStore>)
})
afterEach(() => {
  vi.unstubAllGlobals()
  localStorage.removeItem('storefront-theme')
})
describe('responsive navigation search', () => {
  it('shows a rectangular navbar search, opens menu suggestions, and submits an encoded query', async () => {
    render(
      <MemoryRouter>
        <PublicLayout />
        <RouteLocation />
      </MemoryRouter>,
    )
    const input = screen.getByRole('searchbox', { name: 'Cari gadget di navbar' })
    fireEvent.focus(input)
    fireEvent.click(input)
    const form = screen.getByRole('search', { name: 'Pencarian navbar' })
    expect(input).toHaveFocus()
    expect(screen.queryByRole('dialog', { name: 'Cari gadget' })).not.toBeInTheDocument()
    expect(screen.getAllByRole('link', { name: 'Semua Gadget' }).length).toBeGreaterThan(0)
    fireEvent.change(input, { target: { value: '  iPhone 13 & 128 GB  ' } })
    fireEvent.submit(form)
    await waitFor(() =>
      expect(screen.getByTestId('location')).toHaveTextContent(
        '/gadget?q=iPhone%2013%20%26%20128%20GB',
      ),
    )
    expect(screen.getByRole('search', { name: 'Pencarian navbar' })).toBeInTheDocument()
    expect(input).toHaveValue('')
  })
  it('opens the global search with Ctrl+K and finds matching menu pages', async () => {
    render(
      <MemoryRouter>
        <PublicLayout />
        <RouteLocation />
      </MemoryRouter>,
    )
    fireEvent.keyDown(window, { key: 'k', ctrlKey: true })
    const input = screen.getByRole('searchbox', { name: 'Cari gadget di navbar' })
    fireEvent.change(input, { target: { value: 'trade in' } })
    fireEvent.click(screen.getAllByRole('link', { name: 'Trade In' })[0])
    await waitFor(() => expect(screen.getByTestId('location')).toHaveTextContent('/trade-in'))
  })
  it('uses a search icon on mobile and opens a dropdown search field', () => {
    vi.stubGlobal(
      'matchMedia',
      vi.fn(() => ({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() })),
    )
    render(
      <MemoryRouter>
        <PublicLayout />
        <RouteLocation />
      </MemoryRouter>,
    )
    fireEvent.click(screen.getByRole('button', { name: 'Buka pencarian navbar' }))
    expect(screen.getByRole('search', { name: 'Pencarian navbar mobile' })).toBeInTheDocument()
    expect(document.getElementById('mobile-navbar-search-input')).toHaveFocus()
  })
  it('finds available gadgets by brand and storage and opens their product page', async () => {
    vi.mocked(useStore).mockReturnValue({
      data: {
        products: [
          {
            id: 'iphone-13',
            sku: 'IPH13',
            slug: 'iphone-13',
            name: 'iPhone 13',
            model: 'iPhone 13',
            brand_id: 'apple',
            category_id: 'phone',
            price: 5000000,
            storage_gb: 128,
            ram_gb: 4,
            color: 'Midnight',
            status: 'available',
            stock_quantity: 1,
            brands: { name: 'Apple' },
            categories: { name: 'Smartphone' },
          },
        ],
        brands: [],
        categories: [],
        promotions: [],
        reviews: [],
        settings: defaults,
      },
      isPending: false,
      isError: false,
    } as unknown as ReturnType<typeof useStore>)
    render(
      <MemoryRouter>
        <PublicLayout />
        <RouteLocation />
      </MemoryRouter>,
    )
    const input = screen.getByRole('searchbox', { name: 'Cari gadget di navbar' })
    fireEvent.focus(input)
    fireEvent.click(input)
    fireEvent.change(input, { target: { value: 'Apple 128' } })
    fireEvent.click(screen.getByRole('link', { name: /iPhone 13/ }))
    await waitFor(() =>
      expect(screen.getByTestId('location')).toHaveTextContent('/gadget/iphone-13'),
    )
  })
  it('toggles and persists the storefront theme', async () => {
    render(
      <MemoryRouter>
        <PublicLayout />
        <RouteLocation />
      </MemoryRouter>,
    )
    fireEvent.click(screen.getByRole('button', { name: 'Aktifkan mode malam' }))
    expect(document.querySelector('.storefront.theme-dark')).toBeInTheDocument()
    await waitFor(() => expect(localStorage.getItem('storefront-theme')).toBe('dark'))
    fireEvent.click(screen.getByRole('button', { name: 'Aktifkan mode terang' }))
    expect(document.querySelector('.storefront.theme-dark')).not.toBeInTheDocument()
  })
  it('keeps mobile search reachable from the prominent bottom button and labels social links', () => {
    render(
      <MemoryRouter>
        <PublicLayout />
        <RouteLocation />
      </MemoryRouter>,
    )
    expect(screen.getByRole('heading', { name: 'Ikuti Kami' })).toBeInTheDocument()
    fireEvent.click(
      within(screen.getByRole('navigation', { name: 'Navigasi mobile' })).getByRole('button', {
        name: 'Buka pencarian gadget',
      }),
    )
    const dialog = screen.getByRole('dialog', { name: 'Cari gadget' })
    fireEvent.change(
      within(dialog).getByLabelText('Cari menu, merek, model, atau kapasitas perangkat'),
      {
        target: { value: 'Samsung' },
      },
    )
    fireEvent.submit(within(dialog).getByRole('button', { name: 'Cari gadget' }).closest('form')!)
    expect(screen.getByTestId('location')).toHaveTextContent('/gadget?q=Samsung')
  })
})
