import { Link } from 'react-router-dom'
import { ArrowUpRight } from 'lucide-react'
import type { Review } from '../types'
import { ErrorState, Loading, SectionTitle } from './ui'
import { RatingStars } from './StarRating'
import ReviewSummary, { reviewStats } from './ReviewSummary'

export default function CustomerReviews({
  reviews,
  loading = false,
  error = false,
  onRetry,
}: {
  reviews: Review[]
  loading?: boolean
  error?: boolean
  onRetry?: () => void
}) {
  const { published } = reviewStats(reviews)
  return (
    <section aria-label="Kata pelanggan">
      <SectionTitle title="Kata pelanggan." eyebrow="Cerita setelah memilih" to="/ulasan" />
      {loading ? (
        <Loading label="Memuat ulasan pelanggan..." />
      ) : error ? (
        <ErrorState retry={onRetry} />
      ) : (
        <>
          <ReviewSummary reviews={published} />
          {published.length ? (
            <div className="grid gap-5 md:grid-cols-3">
              {published.slice(0, 3).map((review) => (
                <blockquote
                  key={review.id}
                  className="flex flex-col rounded-xl border border-line p-6 sm:p-7"
                >
                  <RatingStars value={review.rating ?? 0} className="mb-4" />
                  <p className="flex-1 whitespace-pre-line break-words text-sm leading-7">
                    {review.body}
                  </p>
                  <footer className="mt-5 text-xs font-bold">{review.display_name}</footer>
                </blockquote>
              ))}
            </div>
          ) : (
            <div className="flex flex-wrap items-center justify-between gap-5 border-y border-line py-7">
              <p className="text-sm text-muted">Belum ada ulasan yang dipublikasikan.</p>
              <Link
                to="/ulasan"
                className="inline-flex min-h-11 items-center gap-2 text-xs font-bold"
              >
                Tentang ulasan kami
                <ArrowUpRight size={15} />
              </Link>
            </div>
          )}
        </>
      )}
    </section>
  )
}
