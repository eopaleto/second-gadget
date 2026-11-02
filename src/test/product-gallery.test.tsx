import { fireEvent, render, screen, within } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import ProductDetail from '../features/ProductDetail'
import ProductCard from '../components/ProductCard'
import StoreFavicon from '../components/StoreFavicon'
import { defaults, useStore } from '../lib/data'
import { unit } from './fixtures'

vi.mock('../lib/data', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../lib/data')>()),
  useStore: vi.fn(),
}))
const product = () =>
  unit({
    product_images: [
      {
        storage_path: '/test/back.webp',
        alt_text: 'Bagian belakang',
        sort_order: 1,
        is_primary: false,
      },
      { storage_path: '/test/front.webp', alt_text: 'Foto utama', sort_order: 2, is_primary: true },
      {
        storage_path: '/test/detail.webp',
        alt_text: 'Detail unit',
        sort_order: 3,
        is_primary: false,
      },
    ],
  })
function store(products = [product()], logo = '') {
  vi.mocked(useStore).mockReturnValue({
    data: {
      products,
      brands: [],
      categories: [],
      promotions: [],
      reviews: [],
      settings: { ...defaults, logo_path: logo },
    },
    isPending: false,
    isError: false,
    refetch: vi.fn(),
  } as unknown as ReturnType<typeof useStore>)
}
function detail(products = [product()]) {
  store(products)
  render(
    <MemoryRouter initialEntries={['/gadget/test-iphone']}>
      <Routes>
        <Route path="/gadget/:slug" element={<ProductDetail />} />
      </Routes>
    </MemoryRouter>,
  )
  return screen.getByRole('group', { name: 'Foto produk iPhone 13' })
}
afterEach(() => {
  document.head.querySelectorAll('link[rel="icon"]').forEach((link) => link.remove())
})

describe('product-detail photo navigation', () => {
  it('cycles through uploaded images in both directions and keeps thumbnails synchronized', () => {
    const gallery = detail()
    expect(within(gallery).getByRole('img')).toHaveAccessibleName('Foto utama')
    fireEvent.click(within(gallery).getByRole('button', { name: /Foto sebelumnya/ }))
    expect(within(gallery).getByRole('img')).toHaveAccessibleName('Detail unit')
    expect(within(gallery).getByRole('status')).toHaveTextContent('3 / 3')
    fireEvent.click(within(gallery).getByRole('button', { name: /Foto berikutnya/ }))
    expect(within(gallery).getByRole('img')).toHaveAccessibleName('Foto utama')
    fireEvent.click(within(gallery).getByRole('button', { name: /Foto berikutnya/ }))
    expect(screen.getByRole('button', { name: 'Lihat foto 2: Bagian belakang' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('supports horizontal touch swipes without opening zoom and ignores vertical scrolling', () => {
    const gallery = detail()
    const swipe = (from: [number, number], to: [number, number]) => {
      fireEvent.touchStart(gallery, { touches: [{ clientX: from[0], clientY: from[1] }] })
      fireEvent.touchEnd(gallery, { changedTouches: [{ clientX: to[0], clientY: to[1] }] })
    }
    swipe([250, 120], [100, 125])
    expect(within(gallery).getByRole('img')).toHaveAccessibleName('Bagian belakang')
    fireEvent.click(within(gallery).getByRole('button', { name: 'Perbesar foto unit' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    swipe([100, 120], [250, 125])
    expect(within(gallery).getByRole('img')).toHaveAccessibleName('Foto utama')
    swipe([150, 100], [155, 250])
    expect(within(gallery).getByRole('img')).toHaveAccessibleName('Foto utama')
  })

  it('allows arrows and keyboard navigation inside the enlarged photo dialog', () => {
    const gallery = detail()
    fireEvent.click(within(gallery).getByRole('button', { name: 'Perbesar foto unit' }))
    const dialog = screen.getByRole('dialog')
    fireEvent.click(within(dialog).getByRole('button', { name: /Foto berikutnya/ }))
    expect(within(dialog).getByRole('img')).toHaveAccessibleName('Bagian belakang')
    fireEvent.keyDown(within(dialog).getByRole('group'), { key: 'ArrowLeft' })
    expect(within(dialog).getByRole('img')).toHaveAccessibleName('Foto utama')
    fireEvent.click(within(dialog).getByRole('button', { name: 'Tutup dialog' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('does not display navigation for a single image', () => {
    const gallery = detail([unit({ product_images: [product().product_images[0]] })])
    expect(
      within(gallery).queryByRole('button', { name: /Foto berikutnya|Foto sebelumnya/ }),
    ).not.toBeInTheDocument()
  })

  it('keeps gallery controls off catalog product cards', () => {
    render(
      <MemoryRouter>
        <ProductCard product={product()} />
      </MemoryRouter>,
    )
    expect(
      screen.queryByRole('button', { name: /Foto berikutnya|Foto sebelumnya/ }),
    ).not.toBeInTheDocument()
    expect(screen.getAllByRole('img')).toHaveLength(1)
    expect(screen.getByRole('link')).toHaveAttribute('href', '/gadget/test-iphone')
  })
})

describe('store favicon', () => {
  it('uses the configured store logo, updates it after changes, and restores the fallback on removal', () => {
    const icon = document.createElement('link')
    icon.rel = 'icon'
    icon.type = 'image/svg+xml'
    icon.href = '/favicon.svg'
    document.head.append(icon)
    store([], '/logos/store.png')
    const view = render(<StoreFavicon />)
    expect(icon).toHaveAttribute('href', '/logos/store.png')
    expect(icon).not.toHaveAttribute('type')
    store([], '/logos/new-store.webp')
    view.rerender(<StoreFavicon />)
    expect(icon).toHaveAttribute('href', '/logos/new-store.webp')
    store([], '')
    view.rerender(<StoreFavicon />)
    expect(icon).toHaveAttribute('href', '/favicon.svg')
    expect(icon).toHaveAttribute('type', 'image/svg+xml')
  })

  it('creates a favicon link if the initial document has none', () => {
    store([], '/logos/store.png')
    render(<StoreFavicon />)
    const icons = document.head.querySelectorAll('link[rel="icon"]')
    expect(icons).toHaveLength(1)
    expect(icons[0]).toHaveAttribute('href', '/logos/store.png')
  })
})
