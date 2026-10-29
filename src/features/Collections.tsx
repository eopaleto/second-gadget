import { Link } from 'react-router-dom'
import { ArrowUpRight, Laptop, Smartphone, Tablet, MapPin, Navigation } from 'lucide-react'
import type { Product, StoreSettings } from '../types'
import { availableUnits, isUsed, isWarranted } from '../lib/catalog'
import ProductCard from '../components/ProductCard'
import { buttonClass, container, EmptyState, Eyebrow, Reveal, SectionTitle } from '../components/ui'
import { safeHttpUrl } from '../lib/utils'

export const collectionDefinitions = [
  {
    id: 'phone',
    title: 'Koleksi HP Bekas Bergaransi',
    label: 'HP',
    categories: ['iphone', 'android'],
    icon: Smartphone,
  },
  {
    id: 'tablet',
    title: 'Koleksi Tablet Bekas Bergaransi',
    label: 'Tablet',
    categories: ['tablet'],
    icon: Tablet,
  },
  {
    id: 'laptop',
    title: 'Koleksi Laptop Bekas Bergaransi',
    label: 'Laptop',
    categories: ['laptop'],
    icon: Laptop,
  },
]
export function selectCollection(products: Product[], id: string) {
  const definition = collectionDefinitions.find((c) => c.id === id)
  return availableUnits(products)
    .filter(
      (p) =>
        isUsed(p) && isWarranted(p) && definition?.categories.includes(p.categories?.slug || ''),
    )
    .sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at))
}
export default function Collections({ products }: { products: Product[] }) {
  const cheapest = [...availableUnits(products)].sort((a, b) => a.price - b.price).slice(0, 4)
  return (
    <div className="space-y-16 py-16 sm:space-y-20 sm:py-20">
      {collectionDefinitions.map((c, i) => {
        const units = selectCollection(products, c.id)
        return (
          <Reveal key={c.id} className={container}>
            <SectionTitle
              eyebrow={`Pilihan untuk keseharian / 0${i + 1}`}
              title={c.title}
              description="Cek kondisi dan ketentuan garansi pada masing-masing unit."
              to={`/gadget?collection=${c.id}&status=available`}
              link="Lihat koleksi"
            />
            {units.length ? (
              <div className="grid grid-cols-1 gap-4 min-[360px]:grid-cols-2 lg:grid-cols-4">
                {units.slice(0, 4).map((p) => (
                  <ProductCard key={p.id} product={p} />
                ))}
              </div>
            ) : (
              <div className="flex flex-wrap items-center gap-5 rounded-xl border border-line bg-paper/50 p-7">
                <c.icon size={36} strokeWidth={1.2} className="text-navy" />
                <div className="flex-1">
                  <h3 className="font-bold">Pilihan {c.label.toLowerCase()} sedang disiapkan.</h3>
                  <p className="mt-2 text-xs leading-6 text-muted">
                    Belum ada unit bekas bergaransi yang tersedia pada koleksi ini.
                  </p>
                </div>
                <Link
                  to={`/gadget?collection=${c.id}&status=available`}
                  className="inline-flex min-h-11 items-center gap-2 text-xs font-bold"
                >
                  Cek koleksi
                  <ArrowUpRight size={16} />
                </Link>
              </div>
            )}
          </Reveal>
        )
      })}
      <Reveal className={container}>
        <SectionTitle
          eyebrow="Pilihan hemat"
          title="Gadget paling murah."
          description="Diurutkan dari harga terendah di antara unit yang sedang tersedia."
          to="/gadget?sort=price-asc&status=available"
          link="Lihat harga terendah"
        />
        {cheapest.length ? (
          <div className="grid grid-cols-1 gap-4 min-[360px]:grid-cols-2 lg:grid-cols-4">
            {cheapest.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        ) : (
          <EmptyState
            compact
            title="Pilihan hemat segera menyusul."
            description="Harga terendah akan mengikuti stok nyata yang dipublikasikan toko."
          />
        )}
      </Reveal>
    </div>
  )
}

export function StoreVisit({ settings }: { settings: StoreSettings }) {
  const address = settings.address?.trim()
  const map = safeHttpUrl(settings.google_maps_url)

  const embedUrl = address
    ? `https://www.google.com/maps?q=${encodeURIComponent(address)}&output=embed`
    : null

  const directionsUrl = map || (address
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`
    : null)

  return (
    <Reveal className={`${container} pt-20`}>
      <div className="grid overflow-hidden rounded-2xl bg-paper md:grid-cols-[1.4fr_1fr]">
        <div className="p-7 sm:p-12">
          <Eyebrow>Lihat langsung. Pilih lebih yakin.</Eyebrow>

          <h2 className="max-w-lg text-3xl font-extrabold leading-tight tracking-tight sm:text-4xl">
            Kunjungi Toko Gadget Second Terdekat.
          </h2>

          <p className="mt-5 max-w-lg text-sm leading-7 text-muted">
            {address ||
              'Alamat dan lokasi toko sedang disiapkan. Informasi kunjungan akan muncul setelah dikonfirmasi.'}
          </p>

          {settings.opening_hours && (
            <p className="mt-3 whitespace-pre-line text-xs leading-6 text-muted">
              {settings.opening_hours}
            </p>
          )}

          {directionsUrl ? (
            <a
              href={directionsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={`${buttonClass} mt-6`}
            >
              <Navigation size={16} />
              Lihat rute ke toko
              <ArrowUpRight size={16} />
            </a>
          ) : (
            <Link to="/kontak" className={`${buttonClass} mt-6`}>
              Informasi toko
              <ArrowUpRight size={16} />
            </Link>
          )}
        </div>

        <div className="relative min-h-[320px] overflow-hidden border-t border-line bg-[#e8ebef] md:min-h-[420px] md:border-l md:border-t-0">
          {embedUrl ? (
            <iframe
              title="Lokasi Second Device di Google Maps"
              src={embedUrl}
              className="absolute inset-0 h-full w-full border-0"
              loading="lazy"
              allowFullScreen
              referrerPolicy="no-referrer-when-downgrade"
            />
          ) : (
            <div className="flex h-full min-h-[320px] flex-col items-center justify-center p-8 text-center">
              <MapPin size={36} className="text-muted" strokeWidth={1.5} />
              <p className="mt-4 text-sm font-medium text-navy">
                Lokasi toko belum tersedia
              </p>
              <p className="mt-2 text-xs text-muted">
                Peta akan ditampilkan setelah alamat toko ditambahkan.
              </p>
            </div>
          )}
        </div>
      </div>
    </Reveal>
  )
}
