import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Pause, Play } from 'lucide-react'
import { catalogBrands, brandLogo } from '../lib/catalog'
import { imageUrl } from '../lib/supabase'
import type { Brand } from '../types'
import { container } from './ui'

export default function BrandMarquee({ brands }: { brands: Brand[] }) {
  const [paused, setPaused] = useState(false)
  const all = [
    ...catalogBrands.filter((b) => !brands.some((x) => x.slug === b.slug)),
    ...brands,
  ].sort((a, b) => a.sort_order - b.sort_order)
  return (
    <section className={`${container} pt-12`} aria-label="Jelajahi brand perangkat">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-extrabold">Satu tempat. Banyak pilihan brand.</h2>
          <p className="mt-1 text-[11px] text-muted">
            Jelajahi merek favoritmu. Stok mengikuti unit yang tersedia.
          </p>
        </div>
      </div>
      <div className="group overflow-hidden border-y border-line py-6">
        <div
          className={`flex w-max animate-brand-scroll gap-0 group-hover:[animation-play-state:paused] group-focus-within:[animation-play-state:paused] motion-reduce:animate-none motion-reduce:w-full motion-reduce:flex-wrap ${paused ? '[animation-play-state:paused]' : ''}`}
        >
          {[0, 1].map((copy) => (
            <div
              key={copy}
              aria-hidden={copy === 1 ? true : undefined}
              className={`flex shrink-0 items-center motion-reduce:w-full motion-reduce:flex-wrap ${copy === 1 ? 'motion-reduce:hidden' : ''}`}
            >
              {all.map((b) => (
                <Link
                  key={b.slug}
                  to={`/gadget?brand=${encodeURIComponent(b.slug)}`}
                  tabIndex={copy === 1 ? -1 : 0}
                  aria-label={`Lihat gadget ${b.name}`}
                  className="flex h-16 w-32 shrink-0 items-center justify-center px-6 transition-transform hover:scale-105 focus-visible:rounded-lg focus-visible:outline-2 focus-visible:outline-navy sm:w-36 sm:px-7 motion-reduce:w-28 motion-reduce:transform-none"
                >
                  {brandLogo(b) ? (
                    <img
                      src={imageUrl(brandLogo(b))}
                      alt={b.name}
                      width="100"
                      height="60"
                      loading="lazy"
                      className="max-h-9 w-full object-contain"
                    />
                  ) : (
                    <span className="text-sm font-extrabold">{b.name}</span>
                  )}
                </Link>
              ))}
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
