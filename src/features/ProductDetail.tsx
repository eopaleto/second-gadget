import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, ArrowUpRight, MessageCircle } from 'lucide-react'
import { useStore, defaults } from '../lib/data'
import { conditionText } from '../lib/catalog'
import { imageUrl } from '../lib/supabase'
import { rupiah, stockLabel, whatsappLink } from '../lib/utils'
import { FaWhatsapp } from 'react-icons/fa'
import {
  buttonClass,
  container,
  Dialog,
  EmptyState,
  ErrorState,
  Loading,
  SectionTitle,
} from '../components/ui'
import { useSeo } from '../hooks/useSeo'
import ProductCard from '../components/ProductCard'
import ProductImageViewer from '../components/ProductImageViewer'

export default function ProductDetail() {
  const { slug } = useParams(),
    { data, isPending, isError, refetch } = useStore()
  const [selection, setSelection] = useState({ slug, index: 0 }),
    [zoom, setZoom] = useState(false)
  const product = data?.products.find((p) => p.slug === slug),
    settings = data?.settings || defaults
  const pictures = [...(product?.product_images || [])].sort(
    (a, b) => Number(b.is_primary) - Number(a.is_primary) || a.sort_order - b.sort_order,
  )
  const selected =
    selection.slug === slug && selection.index < pictures.length ? selection.index : 0
  const setSelected = (index: number) => setSelection({ slug, index })
  const picture = pictures[selected]
  useSeo(
    product?.name || 'Detail gadget',
    product ? `${product.name}. ${rupiah(product.price)}. ${product.condition_notes}` : undefined,
    imageUrl(pictures[0]?.storage_path),
  )
  if (isPending) return <Loading />
  if (isError)
    return (
      <div className={`${container} py-12`}>
        <ErrorState retry={() => void refetch()} />
      </div>
    )
  if (!product)
    return (
      <div className={`${container} py-14`}>
        <EmptyState
          title="Unit tidak ditemukan."
          description="Tautan mungkin berubah atau unit sudah diarsipkan. Lihat pilihan lain di katalog."
          action={
            <Link className={buttonClass} to="/gadget">
              Kembali ke katalog
            </Link>
          }
        />
      </div>
    )
  const available = product.status === 'available' && product.stock_quantity > 0
  const wa = whatsappLink(
    settings.whatsapp_number,
    `Halo ${settings.store_name}, saya tertarik dengan ${product.name} ${product.storage_gb ? `${product.storage_gb} GB` : ''} — ${product.color}. Harga yang tampil ${rupiah(product.price)}. Apakah unit ini masih tersedia? ${window.location.origin}/gadget/${product.slug}`,
  )
  const related =
    data?.products
      .filter(
        (p) =>
          p.id !== product.id &&
          p.status === 'available' &&
          (p.brand_id === product.brand_id || p.category_id === product.category_id),
      )
      .slice(0, 4) || []
  return (
    <section className={`${container} py-8 sm:py-12`}>
      <nav
        aria-label="Breadcrumb"
        className="mb-8 flex flex-wrap items-center gap-2 text-xs text-muted"
      >
        <Link to="/gadget" className="inline-flex min-h-11 items-center gap-2 hover:text-ink">
          <ArrowLeft size={14} />
          Semua gadget
        </Link>
        <span>/</span>
        <span className="text-ink">{product.name}</span>
      </nav>
      <div className="grid gap-9 lg:grid-cols-2 lg:gap-14">
        <div>
          <ProductImageViewer
            pictures={pictures}
            name={product.name}
            selected={selected}
            onSelect={setSelected}
            onOpen={() => setZoom(true)}
          />
          <div className="mt-4 flex gap-3 overflow-x-auto pb-2">
            {pictures.map((im, i) => (
              <button
                key={im.storage_path}
                aria-label={`Lihat foto ${i + 1}: ${im.alt_text}`}
                aria-pressed={selected === i}
                onClick={() => setSelected(i)}
                className={`size-20 shrink-0 overflow-hidden rounded-lg border-2 bg-paper ${selected === i ? 'border-navy' : 'border-transparent'}`}
              >
                <img
                  src={imageUrl(im.storage_path)}
                  alt={im.alt_text}
                  loading="lazy"
                  width="80"
                  height="80"
                  className="size-full object-contain"
                />
              </button>
            ))}
          </div>
        </div>
        <div>
          <div className="mb-4 flex items-center gap-3 text-xs">
            <span
              className={`rounded-md px-3 py-1.5 font-bold ${available ? 'bg-success/10 text-success' : 'bg-paper text-muted'}`}
            >
              {stockLabel[product.status]}
            </span>
            <span className="text-muted">{conditionText(product)}</span>
          </div>
          <h1 className="text-3xl font-extrabold leading-tight tracking-[-0.045em] sm:text-4xl">
            {product.name}
          </h1>
          <p className="mt-3 text-sm text-muted">
            {product.storage_gb ? `${product.storage_gb} GB · ` : ''}
            {product.color}
          </p>
          <p className="my-7 text-3xl font-extrabold tracking-tight">{rupiah(product.price)}</p>
          <div className="border-y border-line py-6">
            <h2 className="text-sm font-bold">Kondisi unit</h2>
            <p className="mt-3 whitespace-pre-line text-sm leading-7 text-muted">
              {product.condition_notes}
            </p>
          </div>
          <dl className="mt-4 grid grid-cols-2 gap-x-5">
            {[
              ['Brand', product.brands?.name],
              ['Model', product.model],
              ['Penyimpanan', product.storage_gb ? `${product.storage_gb} GB` : null],
              ['RAM', product.ram_gb ? `${product.ram_gb} GB` : null],
              [
                'Battery health',
                product.battery_health !== null ? `${product.battery_health}%` : 'Tidak dicatat',
              ],
              ['Warna', product.color],
              ['Layar', product.screen_notes],
              ['Bodi', product.body_notes],
              ['Jaringan', product.network_notes],
              ['Kelengkapan', product.accessories],
              ['Garansi', product.warranty_notes],
            ].map(([label, value]) => (
              <div key={label} className="border-b border-line py-3">
                <dt className="text-[10px] text-muted">{label}</dt>
                <dd className="mt-1 whitespace-pre-line text-xs font-semibold leading-6">
                  {value || 'Belum tersedia'}
                </dd>
              </div>
            ))}
          </dl>
          <div className="sticky bottom-[calc(6.5rem+env(safe-area-inset-bottom))] z-20 -mx-2 mt-7 bg-white/95 p-2 backdrop-blur-sm lg:static">
            {available && wa ? (
              <a
                href={wa}
                className={`${buttonClass} w-full`}
                target="_blank"
                rel="noopener noreferrer"
              >
                <FaWhatsapp size={18} />
                Tanya stok via WhatsApp
                <ArrowUpRight size={17} />
              </a>
            ) : (
              <div className="rounded-lg bg-paper p-4 text-center text-sm font-semibold">
                {product.status === 'sold'
                  ? 'Unit ini sudah terjual'
                  : product.status === 'reserved'
                    ? 'Unit ini sedang dipesan'
                    : 'Kontak toko belum tersedia'}
              </div>
            )}
            <p className="mt-3 text-center text-[10px] leading-5 text-muted">
              Ketersediaan dan transaksi dikonfirmasi langsung oleh admin.
            </p>
          </div>
        </div>
      </div>
      {related.length > 0 && (
        <div className="mt-20">
          <SectionTitle title="Pilihan lainnya." to="/gadget" />
          <div className="grid grid-cols-1 gap-4 min-[360px]:grid-cols-2 lg:grid-cols-4">
            {related.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </div>
      )}
      <Dialog
        open={zoom}
        onClose={() => setZoom(false)}
        title={picture?.alt_text || product.name}
        wide
      >
        <ProductImageViewer
          pictures={pictures}
          name={product.name}
          selected={selected}
          onSelect={setSelected}
          enlarged
        />
      </Dialog>
    </section>
  )
}
