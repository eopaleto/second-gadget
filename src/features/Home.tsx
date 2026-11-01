import PromotionBanners from '../components/PromotionBanners'
import BrandMarquee from '../components/BrandMarquee'
import CustomerReviews from '../components/CustomerReviews'
import EditorialBanner from '../components/EditorialBanner'
import Collections, { StoreVisit } from './Collections'
import { Link } from 'react-router-dom'
import {
  ArrowRight,
  ArrowUpRight,
  Camera,
  CheckCheck,
  MessageCircle,
  Plus,
  ShieldCheck,
  Smartphone,
} from 'lucide-react'
import { useStore, defaults } from '../lib/data'
import { FaWhatsapp } from 'react-icons/fa'
import { activePromotions, safeHttpUrl, whatsappLink } from '../lib/utils'
import {
  buttonClass,
  container,
  EmptyState,
  ErrorState,
  Eyebrow,
  Loading,
  Reveal,
  SectionTitle,
  secondaryClass,
} from '../components/ui'
import ProductCard from '../components/ProductCard'
import { useSeo } from '../hooks/useSeo'

export default function Home() {
  useSeo('Gadget second pilihan')
  const { data, isPending, isError, refetch } = useStore()
  const settings = data?.settings || defaults,
    wa = whatsappLink(settings.whatsapp_number)
  const stock = data?.products.filter((p) => p.status === 'available' && p.stock_quantity > 0) || []
  const brands = data?.brands.filter((b) => stock.some((p) => p.brand_id === b.id)) || []
  const promos = activePromotions(data?.promotions || [], data?.products || [])
  return (
    <>
      <section className={`${container} pt-8 sm:pt-12 lg:pt-14`}>
        <div className="storefront-soft-panel grid min-w-0 overflow-hidden rounded-2xl bg-[#f1f2f3] lg:min-h-[520px] lg:grid-cols-[minmax(0,1.06fr)_minmax(0,1fr)]">
          <div className="relative flex flex-col justify-center px-6 py-10 sm:px-10 sm:py-14 lg:px-12">
            <Eyebrow>Second device. A better choice.</Eyebrow>
            <h1 className="max-w-xl text-[42px] font-extrabold leading-[1.12] tracking-[-0.06em] sm:text-[54px] xl:text-[64px]">
              Gadget second.
              <br />
              Pilihan <span className="text-[#7b828c]">pertama.</span>
            </h1>
            <p className="mt-6 max-w-[360px] text-sm leading-7 text-muted">
              Kondisi jelas, harga transparan. Temukan perangkat untuk cerita berikutnya, dengan
              pilihan yang sesuai kebutuhanmu.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link to="/gadget" className={buttonClass}>
                Lihat semua gadget
                <ArrowUpRight size={17} />
              </Link>
              <a
                href={wa ?? undefined}
                target="_blank"
                rel="noopener noreferrer"
                className={`${secondaryClass} !border-transparent !text-white !bg-[#1EBE5D] !px-4`}
              >
                <FaWhatsapp size={18} />
                Tanya dulu
              </a>
            </div>
            <div className="mt-10 flex items-center gap-2 text-[10px] font-semibold tracking-wide text-muted">
              <span className="size-1.5 rounded-full bg-navy" />
              TRADE IN<span className="mx-2 text-gray-400">/</span>BUY
              <span className="mx-2 text-gray-400">/</span>SELL
            </div>
            <Plus size={17} strokeWidth={1} className="absolute right-5 top-5 text-gray-400" />
          </div>
          <EditorialBanner />
        </div>
        <div className="grid gap-6 border-b border-line py-7 sm:grid-cols-3">
          {[
            { icon: Camera, title: 'Lihat kondisi sebenarnya', text: 'Foto dan catatan per unit' },
            {
              icon: CheckCheck,
              title: 'Pilih dengan informasi jelas',
              text: 'Spesifikasi, kapasitas, dan harga',
            },
            {
              icon: MessageCircle,
              title: 'Bicara langsung dengan toko',
              text: 'Konfirmasi sebelum transaksi',
            },
          ].map((item) => (
            <div key={item.title} className="flex items-center gap-3 sm:justify-center">
              <item.icon size={23} strokeWidth={1.3} className="shrink-0 text-navy" />
              <div>
                <h2 className="text-[11px] font-bold sm:text-xs">{item.title}</h2>
                <p className="mt-1 text-[10px] text-muted sm:text-[11px]">{item.text}</p>
              </div>
            </div>
          ))}
        </div>
      </section>
      <BrandMarquee brands={data?.brands || []} />
      <Reveal className={`${container} py-10 sm:py-12`}>
        <SectionTitle
          eyebrow="Temukan yang cocok"
          title="Baru masuk."
          description="Setiap unit punya cerita. Cek detailnya, pilih yang sesuai."
          to="/gadget"
          link="Jelajahi katalog"
        />
        {isPending ? (
          <Loading />
        ) : isError ? (
          <ErrorState retry={() => void refetch()} />
        ) : stock.length ? (
          <div className="grid grid-cols-1 gap-4 min-[360px]:grid-cols-2 lg:grid-cols-4">
            {[...stock]
              .sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at))
              .slice(0, 4)
              .map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
          </div>
        ) : (
          <EmptyState
            title="Pilihan baru sedang disiapkan."
            description="Belum ada unit yang dipublikasikan. Informasi foto, kondisi, dan harga akan tampil di sini setelah tersedia."
            action={
              <Link to="/gadget" className="inline-flex items-center gap-2 text-xs font-bold">
                Buka katalog
                <ArrowRight size={15} />
              </Link>
            }
          />
        )}
        {data?.categories.some((c) => stock.some((p) => p.category_id === c.id)) && (
          <div className="mt-6 flex flex-wrap gap-2">
            {data.categories
              .filter((c) => stock.some((p) => p.category_id === c.id))
              .map((c) => (
                <Link
                  key={c.id}
                  to={`/gadget?category=${c.slug}`}
                  className="flex items-center gap-2 rounded-lg border border-line px-4 py-3 text-xs font-semibold"
                >
                  <Smartphone size={15} />
                  {c.name}
                  <ArrowUpRight size={13} />
                </Link>
              ))}
          </div>
        )}
      </Reveal>
      {!isPending && !isError && <PromotionBanners promotions={promos} />}
      {!isPending && !isError && <Collections products={data?.products || []} />}
      <Reveal className={container}>
        <div className="grid overflow-hidden rounded-2xl bg-navy text-white md:grid-cols-[1.3fr_1fr]">
          <div className="px-7 py-10 sm:px-12 sm:py-14">
            <Eyebrow light>Make room for what's next</Eyebrow>
            <h2 className="text-3xl font-extrabold leading-tight tracking-[-0.045em] sm:text-[42px]">
              Gadget lama kamu.
              <br />
              Awal cerita yang baru.
            </h2>
            <p className="mt-5 max-w-sm text-sm leading-7 text-white/65">
              Punya perangkat yang ingin ditukar? Kenali proses trade in dan diskusikan kondisi
              perangkatmu dengan admin.
            </p>
            <Link
              to="/trade-in"
              className="mt-8 inline-flex min-h-11 items-center gap-8 rounded-lg bg-white px-5 py-3 text-xs font-bold text-navy transition hover:bg-paper"
            >
              Kenali trade in
              <ArrowUpRight size={18} />
            </Link>
          </div>
          <div className="relative aspect-[5/4] overflow-hidden bg-navy md:aspect-auto md:min-h-[360px]">
            <img
              src="/images/trade-in-editorial-v3.webp"
              alt="Dua perangkat graphite dan silver di atas podium navy untuk trade in"
              width="1402"
              height="1122"
              loading="lazy"
              className="absolute size-full object-contain"
            />
          </div>
        </div>
      </Reveal>
      {promos.length > 0 && (
        <Reveal className={`${container} pt-20`}>
          <SectionTitle title="Sedang promo." eyebrow="Kesempatan saat ini" to="/promo" />
          {promos.slice(0, 2).map((p) => (
            <Link
              key={p.id}
              to={`/promo#${p.slug}`}
              className="mb-4 flex items-center justify-between gap-6 rounded-xl border border-line bg-paper p-7"
            >
              <div>
                <h3 className="text-xl font-bold">{p.title}</h3>
                <p className="mt-2 text-sm text-muted">{p.description}</p>
              </div>
              <ArrowUpRight className="shrink-0" />
            </Link>
          ))}
        </Reveal>
      )}
      <Reveal className={`${container} py-20 sm:py-24`}>
        <div className="grid gap-12 lg:grid-cols-[0.9fr_1.4fr]">
          <div>
            <Eyebrow>Bukan sekadar second</Eyebrow>
            <h2 className="text-3xl font-extrabold leading-tight tracking-[-0.045em] sm:text-4xl">
              Lebih tahu.
              <br />
              Lebih yakin memilih.
            </h2>
            <p className="mt-5 max-w-xs text-sm leading-7 text-muted">
              Keputusan yang tepat dimulai dari informasi yang jelas, sampai ke detail kecilnya.
            </p>
            <Link to="/tentang" className="mt-6 inline-flex items-center gap-3 text-xs font-bold">
              Tentang Second Device
              <ArrowUpRight size={16} />
            </Link>
          </div>
          <div>
            {[
              {
                n: '01',
                title: 'Kondisi per unit, bukan sekadar model.',
                text: 'Periksa foto, grade, battery health yang dicatat, dan kelengkapan pada halaman masing-masing unit.',
                icon: Smartphone,
              },
              {
                n: '02',
                title: 'Harga terlihat sejak awal.',
                text: 'Lihat harga yang dipublikasikan toko sebelum menghubungi admin. Konfirmasikan stok sebelum transaksi.',
                icon: ShieldCheck,
              },
              {
                n: '03',
                title: 'Ada ruang untuk bertanya.',
                text: 'Diskusikan kebutuhan dan detail perangkat langsung dengan admin melalui kontak resmi yang tersedia.',
                icon: MessageCircle,
              },
            ].map((x, i) => (
              <div
                key={x.n}
                className={`flex gap-5 py-6 ${i === 0 ? 'border-t' : ''} border-b border-line`}
              >
                <span className="pt-1 text-[10px] font-bold text-muted">{x.n}</span>
                <div className="flex-1">
                  <h3 className="text-sm font-bold sm:text-base">{x.title}</h3>
                  <p className="mt-2 max-w-md text-xs leading-6 text-muted">{x.text}</p>
                </div>
                <x.icon
                  size={20}
                  strokeWidth={1.3}
                  className="hidden shrink-0 text-muted sm:block"
                />
              </div>
            ))}
          </div>
        </div>
      </Reveal>
      <Reveal className={`${container}`}>
        <CustomerReviews
          reviews={data?.reviews || []}
          loading={isPending}
          error={isError}
          onRetry={() => void refetch()}
        />
      </Reveal>
      <StoreVisit settings={settings} />
    </>
  )
}
