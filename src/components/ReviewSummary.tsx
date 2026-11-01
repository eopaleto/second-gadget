import { Star } from 'lucide-react'
import type { Review } from '../types'

export function reviewStats(reviews: Review[]) {
  const published = reviews.filter((review) => review.is_approved && review.permission_to_publish)
  const ratings = published
    .map((review) => review.rating)
    .filter(
      (rating): rating is number =>
        typeof rating === 'number' && Number.isInteger(rating) && rating >= 1 && rating <= 5,
    )
  const average = ratings.length
    ? ratings.reduce((total, rating) => total + rating, 0) / ratings.length
    : 0
  return { published, total: published.length, average }
}

export default function ReviewSummary({ reviews }: { reviews: Review[] }) {
  const { average, total } = reviewStats(reviews)
  const score = new Intl.NumberFormat('id-ID', { maximumFractionDigits: 1 }).format(average)
  const reviewers = new Intl.NumberFormat('id-ID').format(total)
  return (
    <dl
      aria-label="Ringkasan rating pelanggan"
      className="mb-6 grid gap-5 rounded-xl border border-line bg-paper/50 p-5 min-[360px]:grid-cols-2 sm:p-6"
    >
      <div>
        <dt className="text-xs font-semibold text-muted">Rata-rata rating</dt>
        <dd className="mt-2 flex items-center gap-3">
          <Star size={25} aria-hidden="true" className="shrink-0 fill-yellow-400 text-yellow-500" />
          <span className="text-3xl font-extrabold tracking-tight text-navy">
            {score}
            <span className="text-base font-semibold text-muted">/5</span>
          </span>
        </dd>
      </div>
      <div>
        <dt className="text-xs font-semibold text-muted">Total reviewers</dt>
        <dd className="mt-2 text-3xl font-extrabold tracking-tight text-navy">{reviewers}</dd>
      </div>
    </dl>
  )
}
