import { Star } from 'lucide-react'

const stars = [1, 2, 3, 4, 5] as const
const starColor = (selected: boolean) =>
  selected ? 'fill-yellow-400 text-yellow-500' : 'fill-transparent text-slate-300'

export function RatingStars({ value, className = '' }: { value: number; className?: string }) {
  return (
    <div
      role="img"
      aria-label={`${value} dari 5 bintang`}
      className={`flex items-center gap-1 ${className}`}
    >
      {stars.map((star) => (
        <Star key={star} size={17} aria-hidden="true" className={starColor(star <= value)} />
      ))}
    </div>
  )
}

export default function StarRating({
  value,
  onChange,
}: {
  value: number
  onChange: (value: number) => void
}) {
  return (
    <fieldset className="min-w-0">
      <legend className="mb-2 text-xs font-bold">Penilaian</legend>
      <div className="flex items-center gap-0.5">
        {stars.map((star) => (
          <label
            key={star}
            className="relative flex size-11 shrink-0 cursor-pointer items-center justify-center rounded-lg hover:bg-yellow-50"
          >
            <input
              type="radio"
              name="rating"
              value={star}
              required
              checked={value === star}
              onChange={() => onChange(star)}
              className="peer sr-only"
            />
            <Star
              size={28}
              aria-hidden="true"
              className={`rounded-sm transition-colors peer-focus-visible:outline-2 peer-focus-visible:outline-offset-4 peer-focus-visible:outline-navy ${starColor(star <= value)}`}
            />
            <span className="sr-only">{star} bintang</span>
          </label>
        ))}
      </div>
    </fieldset>
  )
}
