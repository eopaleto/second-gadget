import { render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import CustomerReviews from '../components/CustomerReviews'
import ReviewSummary, { reviewStats } from '../components/ReviewSummary'
import type { Review } from '../types'

function review(id: string, rating: number | null, overrides: Partial<Review> = {}): Review {
  return {
    id,
    display_name: `Pelanggan ${id}`,
    body: `Pengalaman pelanggan ${id}`,
    rating,
    source: 'Website',
    is_approved: true,
    permission_to_publish: true,
    created_at: '2026-11-01T00:00:00Z',
    ...overrides,
  }
}
function renderReviews(reviews: Review[]) {
  return render(
    <MemoryRouter>
      <CustomerReviews reviews={reviews} />
    </MemoryRouter>,
  )
}
describe('customer review summaries', () => {
  it('shows zero out of five and zero reviewers before any review is published', () => {
    renderReviews([])
    expect(screen.getByText('Rata-rata rating').nextElementSibling).toHaveTextContent('0/5')
    expect(screen.getByText('Total reviewers').nextElementSibling).toHaveTextContent('0')
    expect(screen.getByText('Belum ada ulasan yang dipublikasikan.')).toBeInTheDocument()
  })
  it('uses all published reviews for the summary even when only three cards are displayed', () => {
    renderReviews([review('1', 5), review('2', 4), review('3', 3), review('4', 2)])
    expect(screen.getByText('Rata-rata rating').nextElementSibling).toHaveTextContent('3,5/5')
    expect(screen.getByText('Total reviewers').nextElementSibling).toHaveTextContent('4')
    expect(document.querySelectorAll('blockquote')).toHaveLength(3)
    expect(screen.queryByText('Pengalaman pelanggan 4')).not.toBeInTheDocument()
  })
  it('renders the correct yellow and gray stars for each customer card', () => {
    renderReviews([review('1', 1), review('2', 3), review('3', 5)])
    for (const [id, rating] of [
      ['1', 1],
      ['2', 3],
      ['3', 5],
    ] as const) {
      const card = screen.getByText(`Pengalaman pelanggan ${id}`).closest('blockquote')!
      const stars = within(card).getByRole('img', { name: `${rating} dari 5 bintang` })
      expect(stars.querySelectorAll('svg')).toHaveLength(5)
      expect(stars.querySelectorAll('svg.fill-yellow-400')).toHaveLength(rating)
      expect(stars.querySelectorAll('svg.fill-transparent')).toHaveLength(5 - rating)
    }
  })
  it('excludes unapproved or nonconsenting reviews from both the cards and statistics', () => {
    renderReviews([
      review('visible', 2),
      review('pending', 5, { is_approved: false }),
      review('private', 5, { permission_to_publish: false }),
    ])
    expect(screen.getByText('Rata-rata rating').nextElementSibling).toHaveTextContent('2/5')
    expect(screen.getByText('Total reviewers').nextElementSibling).toHaveTextContent('1')
    expect(screen.queryByText('Pengalaman pelanggan pending')).not.toBeInTheDocument()
    expect(screen.queryByText('Pengalaman pelanggan private')).not.toBeInTheDocument()
  })
  it('does not treat legacy unrated reviews as zero-star ratings', () => {
    const reviews = [review('rated', 4), review('unrated', null)]
    expect(reviewStats(reviews)).toMatchObject({ total: 2, average: 4 })
    render(<ReviewSummary reviews={reviews} />)
    expect(screen.getByText('Rata-rata rating').nextElementSibling).toHaveTextContent('4/5')
    expect(screen.getByText('Total reviewers').nextElementSibling).toHaveTextContent('2')
  })
  it('does not show misleading zero statistics while the reviews are still loading', () => {
    render(
      <MemoryRouter>
        <CustomerReviews reviews={[]} loading />
      </MemoryRouter>,
    )
    expect(screen.getByRole('status')).toHaveTextContent('Memuat ulasan pelanggan')
    expect(screen.queryByText('Total reviewers')).not.toBeInTheDocument()
  })
})
