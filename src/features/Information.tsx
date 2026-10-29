import ReviewForm from './ReviewForm'
import { Link, useLocation } from 'react-router-dom'
import {
  ArrowRight,
  ArrowUpRight,
  Clock,
  Instagram,
  MapPin,
  MessageCircle,
  Star,
} from 'lucide-react'
import { useStore, defaults } from '../lib/data'
import { activePromotions, dateLabel, safeHttpUrl, whatsappLink } from '../lib/utils'
import {
  buttonClass,
  container,
  EmptyState,
  ErrorState,
  Eyebrow,
  Loading,
  SectionTitle,
} from '../components/ui'
import { FaWhatsapp } from 'react-icons/fa'
import { imageUrl } from '../lib/supabase'
import { useSeo } from '../hooks/useSeo'
import ProductCard from '../components/ProductCard'

export default function Information() {
  const { pathname } = useLocation(),
    { data, isPending, isError, refetch } = useStore()
  const settings = data?.settings || defaults,
    wa = whatsappLink(settings.whatsapp_number)
  const title =
    (
      {
        '/promo': 'Promosi',
        '/tentang': 'Tentang toko',
        '/kontak': 'Kontak & lokasi',
        '/ulasan': 'Ulasan pelanggan',
        '/privasi': 'Kebijakan privasi',
      } as Record<string, string>
    )[pathname] || 'Halaman tidak ditemukan'
  useSeo(title)
  const state = isPending ? (
    <Loading />
  ) : isError ? (
    <ErrorState retry={() => void refetch()} />
  ) : null
  return (
    <section className={`${container} py-12 sm:py-16`}>
      <Eyebrow>Second Device</Eyebrow>
      <h1 className="mb-5 text-4xl font-extrabold tracking-[-0.05em] sm:text-5xl">{title}.</h1>
      {pathname === '/promo' && (
        <>
          <p className="mb-10 text-sm text-muted">
            Penawaran yang sedang berjalan, dengan ketentuan yang jelas.
          </p>
          {state ||
            (activePromotions(data?.promotions || [], data?.products || []).length ? (
              activePromotions(data?.promotions || [], data?.products || []).map((p) => (
                <article
                  id={p.slug}
                  key={p.id}
                  className="mb-12 scroll-mt-28 rounded-xl border border-line p-5 sm:p-8"
                >
                  {p.banner_path && (
                    <img
                      src={imageUrl(p.banner_path)}
                      alt={p.title}
                      width="1100"
                      height="400"
                      className="mb-6 max-h-80 w-full rounded-lg object-cover"
                    />
                  )}
                  <h2 className="text-2xl font-bold">{p.title}</h2>
                  <p className="mt-3 whitespace-pre-line text-sm leading-7 text-muted">
                    {p.description}
                  </p>
                  <p className="mt-4 text-xs font-semibold">
                    {dateLabel(p.start_at)} – {dateLabel(p.end_at)}
                  </p>
                  <details className="my-5 rounded-lg bg-paper p-4 text-xs">
                    <summary className="cursor-pointer font-bold">Syarat dan ketentuan</summary>
                    <p className="mt-3 whitespace-pre-line leading-7">{p.terms}</p>
                  </details>
                  <div className="grid grid-cols-1 gap-4 min-[360px]:grid-cols-2 lg:grid-cols-4">
                    {data?.products
                      .filter(
                        (product) =>
                          product.status === 'available' &&
                          p.promotion_products.some((link) => link.product_id === product.id),
                      )
                      .map((product) => (
                        <ProductCard key={product.id} product={product} />
                      ))}
                  </div>
                </article>
              ))
            ) : (
              <EmptyState
                title="Belum ada promo aktif."
                description="Penawaran terbaru akan muncul di sini saat tersedia. Kamu tetap bisa menjelajahi unit yang sudah dipublikasikan."
                action={
                  <Link to="/gadget" className={buttonClass}>
                    Lihat katalog
                    <ArrowRight size={17} />
                  </Link>
                }
              />
            ))}
        </>
      )}
      {pathname === '/tentang' && (
        <div className="mt-10 grid gap-12 lg:grid-cols-2">
          <div>
            <h2 className="text-3xl font-bold leading-snug tracking-tight">
              Perangkat yang sama.
              <br />
              Kemungkinan yang baru.
            </h2>
            <p className="mt-6 whitespace-pre-line text-sm leading-8 text-muted">
              {settings.about_text ||
                'Second Device adalah etalase jual beli gadget second dan informasi trade in. Temukan perangkat berdasarkan kebutuhanmu, baca kondisi masing-masing unit, lalu hubungi toko untuk berdiskusi dan mengonfirmasi stok.'}
            </p>
            <p className="mt-5 text-sm leading-8 text-muted">
              Perangkat bekas memiliki kondisi yang berbeda. Karena itu, foto, kapasitas, catatan
              fisik, kelengkapan, dan informasi baterai yang tersedia disajikan per unit. Informasi
              yang belum dicatat tidak dianggap sebagai jaminan kondisi.
            </p>
            <div className="my-8 flex gap-6 border-y border-line py-5 text-xs font-bold tracking-widest">
              <span>TRADE IN</span>
              <span>BUY</span>
              <span>SELL</span>
            </div>
            <Link to="/gadget" className={buttonClass}>
              Jelajahi gadget
              <ArrowUpRight size={17} />
            </Link>
          </div>
          <div className="overflow-hidden rounded-xl bg-paper">
            <img
              src="/images/editorial-iphone.webp"
              alt="Fotografi editorial iPhone, bukan foto stok atau toko"
              width="600"
              height="700"
              className="h-[400px] w-full object-cover sm:h-[500px]"
            />
            <p className="p-3 text-center text-[10px] text-muted">
              Foto editorial · bukan foto unit stok atau toko
            </p>
          </div>
        </div>
      )}
      {pathname === '/kontak' && (
        <>
          <p className="mb-10 text-sm leading-7 text-muted">
            Tanyakan perangkat pilihanmu atau rencanakan kunjungan ke toko.
          </p>
          {state ||
            (!wa && !settings.instagram_url && !settings.address && !settings.opening_hours ? (
              <EmptyState
                title="Informasi kontak sedang disiapkan."
                description="Kontak resmi, lokasi, dan jam buka akan ditampilkan setelah dikonfirmasi oleh toko."
                action={
                  <Link to="/gadget" className={buttonClass}>
                    Jelajahi katalog
                    <ArrowRight size={16} />
                  </Link>
                }
              />
            ) : (
              <div className="grid gap-6 md:grid-cols-2">
                {wa && (
                  <a
                    href={wa}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded-xl border border-line p-8 transition hover:border-navy"
                  >
                    <FaWhatsapp size={28} strokeWidth={1.3} />
                    <h2 className="mt-5 text-lg font-bold">
                      WhatsApp toko
                      <ArrowUpRight className="ml-3 inline" size={18} />
                    </h2>
                    <p className="mt-2 text-sm text-muted">{settings.whatsapp_number}</p>
                  </a>
                )}
                {safeHttpUrl(settings.instagram_url) && (
                  <a
                    href={safeHttpUrl(settings.instagram_url)!}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded-xl border border-line p-8 hover:border-navy"
                  >
                    <Instagram size={28} strokeWidth={1.3} />
                    <h2 className="mt-5 text-lg font-bold">
                      Instagram resmi
                      <ArrowUpRight className="ml-3 inline" size={18} />
                    </h2>
                    <p className="mt-2 text-sm text-muted">Lihat kabar dari Second Device</p>
                  </a>
                )}
                {settings.address && (
                  <div className="rounded-xl bg-paper p-8">
                    <MapPin size={28} strokeWidth={1.3} />
                    <h2 className="mt-5 text-lg font-bold">Kunjungi toko</h2>
                    <p className="mt-3 whitespace-pre-line text-sm leading-7 text-muted">
                      {settings.address}
                    </p>
                    {safeHttpUrl(settings.google_maps_url) && (
                      <a
                        href={safeHttpUrl(settings.google_maps_url)!}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-5 inline-flex min-h-11 items-center gap-2 text-sm font-bold"
                      >
                        Buka Google Maps
                        <ArrowUpRight size={16} />
                      </a>
                    )}
                  </div>
                )}
                {settings.opening_hours && (
                  <div className="rounded-xl bg-paper p-8">
                    <Clock size={28} strokeWidth={1.3} />
                    <h2 className="mt-5 text-lg font-bold">Jam operasional</h2>
                    <p className="mt-3 whitespace-pre-line text-sm leading-8 text-muted">
                      {settings.opening_hours}
                    </p>
                  </div>
                )}
              </div>
            ))}
        </>
      )}
      {pathname === '/ulasan' && (
        <>
          <ReviewForm />
          <p className="mb-10 text-sm leading-7 text-muted">
            Pengalaman pelanggan yang sudah disetujui untuk dipublikasikan.
          </p>
          {state ||
            (data?.reviews.length ? (
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {data.reviews.map((r) => (
                  <article key={r.id} className="rounded-xl border border-line p-7">
                    {r.rating && (
                      <div className="mb-4 flex gap-1" aria-label={`${r.rating} dari 5 bintang`}>
                        {Array.from({ length: r.rating }, (_, i) => (
                          <Star key={i} size={15} className="fill-navy text-navy" />
                        ))}
                      </div>
                    )}
                    <p className="whitespace-pre-line text-sm leading-7">“{r.body}”</p>
                    <h2 className="mt-5 text-sm font-bold">{r.display_name}</h2>
                    <p className="mt-2 text-[10px] text-muted">{dateLabel(r.created_at)}</p>
                    {r.source &&
                      (safeHttpUrl(r.source) ? (
                        <a
                          href={safeHttpUrl(r.source)!}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mt-3 inline-flex min-h-11 items-center gap-1 text-xs underline"
                        >
                          Sumber ulasan
                          <ArrowUpRight size={12} />
                        </a>
                      ) : (
                        <p className="mt-3 text-xs text-muted">Sumber: {r.source}</p>
                      ))}
                  </article>
                ))}
              </div>
            ) : (
              <EmptyState
                title="Cerita pelanggan segera menyusul."
                description="Belum ada ulasan yang dipublikasikan. Kami hanya menampilkan ulasan yang telah dimoderasi dan memiliki izin publikasi."
              />
            ))}
        </>
      )}
      {pathname === '/privasi' && (
        <div className="mt-10 max-w-2xl space-y-8 text-sm leading-8 text-muted">
          {[
            [
              'Data yang digunakan',
              'Katalog dapat dijelajahi tanpa akun pelanggan. Saat mengajukan trade in, nama, nomor WhatsApp, informasi perangkat, foto opsional, dan persetujuan disimpan untuk menindaklanjuti pengajuan. Jangan mengunggah IMEI lengkap, nomor serial, identitas pribadi, atau informasi pemilik sebelumnya.',
            ],
            [
              'Akses dan penggunaan',
              'Pengajuan dan fotonya hanya dapat dibaca oleh admin toko yang berwenang. Data tidak ditampilkan sebagai konten publik. Admin menghubungi kamu untuk pemeriksaan dan pembahasan penawaran. Pengajuan bukan persetujuan trade in.',
            ],
            [
              'Ulasan pelanggan',
              'Saat mengirim ulasan, nama tampilan, rating, isi tulisan, dan waktu pengiriman disimpan. Dengan persetujuanmu, informasi tersebut ditampilkan untuk publik setelah moderasi. Admin hanya menyetujui atau menyembunyikan ulasan, tanpa mengubah isi atau rating. Hindari data pribadi di dalam ulasan. Hubungi toko untuk meminta penghapusan.',
            ],
            [
              'Layanan pihak ketiga',
              'Data aplikasi disimpan melalui Supabase. Formulir menggunakan Cloudflare Turnstile untuk mencegah spam. Membuka WhatsApp, Instagram, atau Google Maps akan membawa kamu ke layanan tersebut dan kebijakan privasinya berlaku. Situs ini tidak memasang pelacak analitik.',
            ],
            [
              'Penyimpanan dan permintaan data',
              'Data pengajuan disimpan sampai tindak lanjut selesai dan tidak lagi diperlukan, lalu harus dihapus oleh admin sesuai kebijakan operasional toko. Hubungi kontak resmi yang ditampilkan pada halaman kontak untuk meminta koreksi atau penghapusan data. Sesi login admin disimpan pada browser agar dashboard dapat digunakan.',
            ],
          ].map(([t, b]) => (
            <div key={t}>
              <h2 className="mb-2 text-lg font-bold text-ink">{t}</h2>
              <p>{b}</p>
            </div>
          ))}
          <Link to="/kontak" className={buttonClass}>
            Kontak toko
            <ArrowRight size={16} />
          </Link>
        </div>
      )}
      {!['/promo', '/tentang', '/kontak', '/ulasan', '/privasi'].includes(pathname) && (
        <div className="mt-10">
          <SectionTitle
            title="Sepertinya kamu salah jalan."
            description="Halaman ini tidak ditemukan. Pilihan gadgetmu mungkin ada di katalog."
          />
          <Link to="/gadget" className={buttonClass}>
            Kembali ke katalog
            <ArrowRight size={16} />
          </Link>
        </div>
      )}
    </section>
  )
}
