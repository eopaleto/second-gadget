import { ArrowUpRight, Smartphone } from 'lucide-react'
import { Link } from 'react-router-dom'
import type { Product } from '../types'
import { imageUrl } from '../lib/supabase'
import { rupiah, stockLabel } from '../lib/utils'
import { conditionText, isWarranted } from '../lib/catalog'

export default function ProductCard({ product }: { product: Product }) {
  const picture = [...product.product_images].sort(
    (a, b) => Number(b.is_primary) - Number(a.is_primary) || a.sort_order - b.sort_order,
  )[0]
  return (
    <Link
      to={`/gadget/${product.slug}`}
      className="group flex min-w-0 flex-col rounded-xl border border-line bg-white p-3 transition duration-200 hover:border-navy/50 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-navy sm:p-4"
    >
      <div className="relative flex aspect-[4/3] items-center justify-center overflow-hidden rounded-lg bg-paper">
        {picture ? (
          <img
            src={imageUrl(picture.storage_path)}
            alt={picture.alt_text || product.name}
            loading="lazy"
            width="400"
            height="300"
            className="size-full object-contain transition-transform duration-200 group-hover:scale-[1.02] motion-reduce:transform-none"
          />
        ) : (
          <Smartphone size={48} strokeWidth={1} className="text-muted" />
        )}
        <span className="absolute left-2 top-2 rounded bg-white/95 px-2 py-1 text-[9px] font-bold">
          {conditionText(product)}
        </span>
        {product.is_featured && (
          <span className="absolute bottom-2 left-2 rounded bg-navy px-2 py-1 text-[9px] font-bold text-white">
            Pilihan toko
          </span>
        )}
      </div>
      <div className="flex flex-1 flex-col pt-4">
        <p className="mb-1 text-[10px] font-semibold uppercase tracking-widest text-muted">
          {product.brands?.name}
        </p>
        <h3 className="text-sm font-bold leading-6 sm:text-base">{product.name}</h3>
        {isWarranted(product) && (
          <span className="mt-1 text-[10px] font-bold text-success">
            Bergaransi · lihat ketentuan unit
          </span>
        )}
        <p className="mt-1 text-[11px] leading-5 text-muted">
          {product.storage_gb ? `${product.storage_gb} GB` : 'Kapasitas tidak dicatat'} ·{' '}
          {product.color}
        </p>
        <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm font-extrabold sm:text-base">{rupiah(product.price)}</p>
          <span
            className={`text-[10px] font-semibold ${product.status === 'available' ? 'text-success' : 'text-muted'}`}
          >
            {stockLabel[product.status]}
          </span>
        </div>
        <div className="mt-4 flex items-center justify-between border-t border-line pt-3 text-[11px] font-bold">
          Lihat detail
          <ArrowUpRight size={15} />
        </div>
      </div>
    </Link>
  )
}
