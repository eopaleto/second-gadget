import { Link } from 'react-router-dom'
import {
  ArrowUpRight,
  Facebook,
  Instagram,
  Youtube,
  Music2,
  Landmark,
  Wallet,
  QrCode,
} from 'lucide-react'
import { FaWhatsapp } from 'react-icons/fa'
import type { Product, StoreSettings } from '../types'
import { availableUnits, isUsed } from '../lib/catalog'
import { safeHttpUrl, whatsappLink } from '../lib/utils'
import { imageUrl } from '../lib/supabase'
import { container } from './ui'

const paymentLogos = [
  { src: '/payments/qris.png', alt: 'QRIS' },
  { src: '/payments/dana.png', alt: 'DANA' },
  { src: '/payments/linkaja.png', alt: 'LinkAja' },
  { src: '/payments/shopeepay.png', alt: 'ShopeePay' },
  { src: '/payments/gopay.png', alt: 'GoPay' },
  { src: '/payments/ovo.png', alt: 'OVO' },
  { src: '/payments/bri.png', alt: 'Bank BRI' },
  { src: '/payments/bca.png', alt: 'BCA' },
  { src: '/payments/cimb-niaga.png', alt: 'CIMB Niaga' },
  { src: '/payments/mandiri.png', alt: 'Mandiri' },
  { src: '/payments/permatabank.png', alt: 'PermataBank' },
  { src: '/payments/bni.png', alt: 'BNI' },
  { src: '/payments/visa.png', alt: 'Visa' },
  { src: '/payments/indomaret.png', alt: 'Indomaret' },
  { src: '/payments/alfamart.png', alt: 'Alfamart' },
  { src: '/payments/mastercard.webp', alt: 'Mastercard' },
]
export function purchaseLinks(products: Product[]) {
  const ready = availableUnits(products).filter(isUsed),
    links: { label: string; to: string }[] = []
  for (const slug of ['iphone', 'tablet', 'laptop'])
    if (ready.some((p) => p.categories?.slug === slug))
      links.push({
        label: `Beli ${slug === 'iphone' ? 'iPhone' : slug === 'tablet' ? 'tablet' : 'laptop'} bekas`,
        to: `/gadget?category=${slug}&used=1&status=available`,
      })
  const brands = [
    ...new Map(
      ready.filter((p) => p.brands?.slug !== 'apple').map((p) => [p.brands?.slug, p.brands]),
    ).values(),
  ].filter((b) => b != null)
  for (const b of brands)
    links.push({
      label: `Beli ${b.name} bekas`,
      to: `/gadget?brand=${b.slug}&used=1&status=available`,
    })
  return links
}
function PaymentMark({ id }: { id: string }) {
  if (id === 'bank') return <Landmark size={25} />
  if (id === 'ewallet') return <Wallet size={25} />
  if (id === 'kredivo')
    return <span className="text-xl font-extrabold tracking-tight text-[#f47735]">kredivo</span>
  if (id === 'qris')
    return (
      <span className="flex items-center gap-1 text-lg font-extrabold tracking-tight">
        <QrCode size={22} />
        QRIS
      </span>
    )
  return (
    <img
      src={`/payments/${id}.svg`}
      alt=""
      width="76"
      height="28"
      loading="lazy"
      className="h-7 max-w-20 object-contain"
    />
  )
}
export default function StoreFooter({
  settings,
  products,
}: {
  settings: StoreSettings
  products: Product[]
}) {
  const wa = whatsappLink(settings.whatsapp_number),
    links = purchaseLinks(products)
  const socials = [
    { name: 'Instagram', url: settings.instagram_url, icon: Instagram },
    { name: 'Facebook', url: settings.facebook_url || '', icon: Facebook },
    { name: 'TikTok', url: settings.tiktok_url || '', icon: Music2 },
    { name: 'YouTube', url: settings.youtube_url || '', icon: Youtube },
    { name: 'WhatsApp', url: wa || '', icon: FaWhatsapp  },
  ].filter((s) => safeHttpUrl(s.url))
  return (
    <footer className="mt-20 bg-[#111720] py-12 text-white sm:mt-24 sm:py-16">
      <div className={container}>
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-[1.3fr_1fr_1fr_1.2fr]">
          <div>
            <Link
              to="/"
              aria-label={`${settings.store_name} — Beranda`}
              className="inline-flex min-h-11 shrink-0 items-center"
            >
              <img
                src={imageUrl(settings.logo_path)}
                alt={settings.store_name}
                width="160"
                height="48"
                className="max-h-12 max-w-40 object-contain brightness-0 invert"
              />
            </Link>
            <p className="mt-5 text-sm text-white/65">{settings.tagline}</p>
            <p className="mt-3 max-w-xs text-xs leading-7 text-white/50">
              Temukan perangkat untuk cerita berikutnya. Jual, beli, dan diskusikan trade in
              langsung dengan toko.
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              {socials.map((s) => (
                <a
                  key={s.name}
                  href={s.url}
                  aria-label={s.name}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex size-11 items-center justify-center rounded-lg border border-white/15 transition hover:bg-white/10"
                >
                  <s.icon size={20} />
                </a>
              ))}
            </div>
            {safeHttpUrl(settings.google_maps_url) && (
              <a
                href={safeHttpUrl(settings.google_maps_url)!}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-3 inline-flex min-h-11 items-center gap-2 text-xs font-bold bg-white/10 px-3 py-2 text-white transition hover:bg-white/20 rounded-lg"
              >
                Buka Google Maps
                <ArrowUpRight size={14} />
              </a>
            )}
          </div>
          <div>
            <h2 className="mb-4 text-xs font-bold uppercase tracking-widest text-white/50">
              Tentang kami
            </h2>
            <div className="flex flex-col text-sm">
              {[
                ['/tentang', 'Tentang Second Device'],
                ['/trade-in', 'Trade In'],
                ['/ulasan', 'Ulasan pengguna'],
                ['/kontak', 'Kontak & lokasi'],
                ['/privasi', 'Kebijakan privasi'],
              ].map(([path, label]) => (
                <Link key={path} to={path} className="py-2 text-white/75 hover:text-white">
                  {label}
                </Link>
              ))}
            </div>
          </div>
          <div>
            <h2 className="mb-4 text-xs font-bold uppercase tracking-widest text-white/50">
              Belanja sesuai stok
            </h2>
            <div className="flex flex-col text-sm">
              {links.slice(0, 12).map((l) => (
                <Link key={l.to} to={l.to} className="py-2 text-white/75 hover:text-white">
                  {l.label}
                </Link>
              ))}
              <Link to="/gadget" className="py-2 text-white/75 hover:text-white">
                Semua gadget
                <ArrowUpRight size={13} className="ml-2 inline" />
              </Link>
              <Link to="/promo" className="py-2 text-white/75 hover:text-white">
                Promo aktif
              </Link>
            </div>
          </div>
          <div>
            <h2 className="mb-4 text-xs font-bold uppercase tracking-widest text-white/50">
              Kunjungi toko
            </h2>
            <p className="whitespace-pre-line text-xs leading-7 text-white/65">
              {settings.address || 'Informasi alamat sedang disiapkan.'}
            </p>

            {!!settings.payment_methods?.length && (
              <div className="mt-5 border-t border-white/10 pt-5">
                <h2 className="mb-4 text-lg font-semibold text-white">Metode Pembayaran</h2>

                <div className="w-full max-w-[390px] rounded-lg bg-white/80 p-3 sm:p-4">
                  <div className="grid grid-cols-4 items-center gap-x-2 gap-y-4 sm:gap-x-3 sm:gap-y-5">
                    {paymentLogos.map((logo) => (
                      <div key={logo.alt} className="flex h-10 items-center justify-center">
                        <img
                          src={logo.src}
                          alt={logo.alt}
                          loading="lazy"
                          className="max-h-9 w-full object-contain"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

          </div>
        </div>

        <div className="mt-10 flex flex-wrap items-center justify-between gap-2 border-t border-white/10 pt-4 text-[11px] text-white/45">
          <p>
            © {new Date().getFullYear()} {settings.store_name}. Seluruh hak dilindungi.
          </p>
          <Link
            to="/admin/login"
            className="inline-flex min-h-11 items-center gap-1 hover:text-white"
          >
            Admin toko
            <ArrowUpRight size={12} />
          </Link>
        </div>
      </div>
    </footer>
  )
}
