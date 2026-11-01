import { Link } from 'react-router-dom'
import type { Promotion } from '../types'
import { imageUrl } from '../lib/supabase'
import { container, Reveal } from './ui'

export default function PromotionBanners({ promotions }: { promotions: Promotion[] }) {
  const banners = promotions.flatMap((promotion) => {
    const src = imageUrl(promotion.banner_path)
    return src ? [{ promotion, src }] : []
  })
  if (!banners.length) return null

  return (
    <Reveal className={`${container} pb-8 sm:pb-10`}>
      <section aria-label="Banner promo toko" className="space-y-4">
        {banners.map(({ promotion, src }) => (
          <Link
            key={promotion.id}
            to={`/promo#${promotion.slug}`}
            aria-label={`Lihat promo: ${promotion.title}`}
            className="block overflow-hidden rounded-xl border border-line bg-paper transition-opacity hover:opacity-95 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-navy"
          >
            <img
              src={src}
              alt={promotion.title}
              loading="lazy"
              decoding="async"
              className="block h-auto w-full"
            />
          </Link>
        ))}
      </section>
    </Reveal>
  )
}
