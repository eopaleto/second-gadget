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
afterEach(() => vi.unstubAllGlobals())
describe('responsive navigation search', () => {
  it('opens desktop search in the navbar and submits an encoded query without opening a modal', async () => {
    render(
      <MemoryRouter>
        <PublicLayout />
        <RouteLocation />
      </MemoryRouter>,
    )
    fireEvent.click(screen.getByRole('button', { name: 'Cari gadget di navbar' }))
    const form = screen.getByRole('search', { name: 'Pencarian navbar' })
    const input = within(form).getByRole('searchbox', { name: 'Cari gadget di navbar' })
    expect(input).toHaveFocus()
    expect(screen.queryByRole('dialog', { name: 'Cari gadget' })).not.toBeInTheDocument()
    fireEvent.change(input, { target: { value: '  iPhone 13 & 128 GB  ' } })
    fireEvent.submit(form)
    await waitFor(() =>
      expect(screen.getByTestId('location')).toHaveTextContent(
        '/gadget?q=iPhone%2013%20%26%20128%20GB',
      ),
    )
    expect(screen.queryByRole('search', { name: 'Pencarian navbar' })).not.toBeInTheDocument()
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
    fireEvent.change(within(dialog).getByLabelText('Nama, merek, atau kapasitas perangkat'), {
      target: { value: 'Samsung' },
    })
    fireEvent.submit(within(dialog).getByRole('button', { name: 'Cari gadget' }).closest('form')!)
    expect(screen.getByTestId('location')).toHaveTextContent('/gadget?q=Samsung')
  })
})
