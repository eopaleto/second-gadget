import type { ReactNode } from 'react'
import { render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import Home from '../features/Home'
import PromotionBanners from '../components/PromotionBanners'
import { defaults, useStore } from '../lib/data'
import { promo, unit } from './fixtures'

vi.mock('../lib/data', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../lib/data')>()),
  useStore: vi.fn(),
}))
vi.mock('../lib/supabase', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../lib/supabase')>()),
  imageUrl: (path: string | null) => (path ? `/uploaded/${path}` : ''),
}))
vi.mock('../components/BrandMarquee', () => ({ default: () => null }))
vi.mock('../components/ui', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../components/ui')>()),
  Reveal: ({ children, className }: { children: ReactNode; className?: string }) => (
    <div className={className}>{children}</div>
  ),
}))
const active = () =>
  promo({
    id: 'november',
    slug: 'november',
    title: 'Promo dari admin',
    banner_path: 'content/promotions/admin-design.webp',
    start_at: '2000-01-01T00:00:00Z',
    end_at: '2099-01-01T00:00:00Z',
  })
function renderHome(promotions = [active()]) {
  vi.mocked(useStore).mockReturnValue({
    data: {
      products: [unit()],
      brands: [unit().brands!],
      categories: [unit().categories!],
      promotions,
      reviews: [],
      settings: defaults,
    },
    isPending: false,
    isError: false,
    refetch: vi.fn(),
  } as unknown as ReturnType<typeof useStore>)
  return render(
    <MemoryRouter>
      <Home />
    </MemoryRouter>,
  )
}

describe('admin-managed homepage promotion banners', () => {
  it('places the uploaded artwork after the first collection and preserves the main hero photo', () => {
    renderHome()
    const image = screen.getByRole('img', { name: 'Promo dari admin' })
    expect(image).toHaveAttribute('src', '/uploaded/content/promotions/admin-design.webp')
    expect(image.closest('a')).toHaveAttribute('href', '/promo#november')
    const first = screen.getByRole('heading', { name: 'Baru masuk.' })
    const next = screen.getByRole('heading', { name: 'Koleksi HP Bekas Bergaransi' })
    expect(first.compareDocumentPosition(image) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(image.compareDocumentPosition(next) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(screen.getByRole('img', { name: /detail iPhone/ })).toHaveAttribute(
      'src',
      '/images/editorial-iphone.webp',
    )
    expect(screen.queryByText('Tanya promo November')).not.toBeInTheDocument()
  })

  it('excludes inactive, expired, upcoming, unavailable and imageless promotions from the banner slot', () => {
    renderHome([
      active(),
      { ...active(), id: 'inactive', title: 'Inactive', is_active: false },
      { ...active(), id: 'expired', title: 'Expired', end_at: '2001-01-01T00:00:00Z' },
      { ...active(), id: 'future', title: 'Future', start_at: '2098-01-01T00:00:00Z' },
      {
        ...active(),
        id: 'unavailable',
        title: 'Unavailable',
        promotion_products: [{ product_id: 'missing' }],
      },
      { ...active(), id: 'no-image', title: 'No image', banner_path: null },
    ])
    const slot = screen.getByRole('region', { name: 'Banner promo toko' })
    expect(within(slot).getAllByRole('img')).toHaveLength(1)
    expect(within(slot).getByRole('img', { name: 'Promo dari admin' })).toBeInTheDocument()
  })

  it('reflects replaced admin artwork and removes the slot when its image is removed', () => {
    const view = render(
      <MemoryRouter>
        <PromotionBanners promotions={[active()]} />
      </MemoryRouter>,
    )
    view.rerender(
      <MemoryRouter>
        <PromotionBanners promotions={[{ ...active(), banner_path: 'content/new-artwork.webp' }]} />
      </MemoryRouter>,
    )
    expect(screen.getByRole('img', { name: 'Promo dari admin' })).toHaveAttribute(
      'src',
      '/uploaded/content/new-artwork.webp',
    )
    view.rerender(
      <MemoryRouter>
        <PromotionBanners promotions={[{ ...active(), banner_path: null }]} />
      </MemoryRouter>,
    )
    expect(screen.queryByRole('region', { name: 'Banner promo toko' })).not.toBeInTheDocument()
  })
})
