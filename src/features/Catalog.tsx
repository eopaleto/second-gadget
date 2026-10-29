import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Search, SlidersHorizontal, X } from 'lucide-react'
import { useStore } from '../lib/data'
import { filterProducts } from '../lib/utils'
import { CONDITIONS } from '../lib/catalog'
import {
  Button,
  container,
  Dialog,
  EmptyState,
  ErrorState,
  Eyebrow,
  Field,
  inputClass,
  Loading,
} from '../components/ui'
import ProductCard from '../components/ProductCard'
import { useSeo } from '../hooks/useSeo'

const filterLabels: Record<string, string> = {
  q: 'Cari',
  brand: 'Brand',
  category: 'Kategori',
  min: 'Min Rp',
  max: 'Maks Rp',
  storage: 'Kapasitas',
  grade: 'Grade',
  status: 'Status',
  battery: 'Baterai min.',
  condition: 'Kondisi',
  color: 'Warna',
  collection: 'Koleksi bergaransi',
  used: 'Unit bekas',
}
export default function Catalog() {
  useSeo('Semua gadget')
  const { data, isPending, isError, refetch } = useStore(),
    [params, setParams] = useSearchParams()
  const [filterOpen, setFilterOpen] = useState(false)
  const products = filterProducts(data?.products || [], params)
  const perPage = 12,
    page = Math.max(
      1,
      Math.min(Math.ceil(products.length / perPage) || 1, Number(params.get('page')) || 1),
    )
  const filters = [...params.entries()].filter(([key, value]) => key in filterLabels && value)
  function change(key: string, value: string) {
    const next = new URLSearchParams(params)
    value ? next.set(key, value) : next.delete(key)
    next.delete('page')
    setParams(next, { replace: true })
  }
  function reset() {
    const next = new URLSearchParams()
    if (params.get('sort')) next.set('sort', params.get('sort')!)
    setParams(next)
  }
  const controls = (prefix: string) => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-sm font-bold">
          <SlidersHorizontal size={16} />
          Filter
        </h2>
        {filters.length > 0 && (
          <button
            onClick={reset}
            className="min-h-11 text-xs font-semibold text-muted underline underline-offset-4"
          >
            Reset filter
          </button>
        )}
      </div>
      <fieldset>
        <legend className="mb-3 text-xs font-bold">Brand</legend>
        {data?.brands.length ? (
          data.brands.map((b) => (
            <label
              key={b.id}
              className="flex min-h-10 cursor-pointer items-center gap-3 text-xs text-muted"
            >
              <input
                type="checkbox"
                className="size-4 accent-navy"
                checked={params.getAll('brand').includes(b.slug)}
                onChange={(e) => {
                  const next = new URLSearchParams(params)
                  next.delete('brand')
                  ;[
                    ...params.getAll('brand').filter((v) => v !== b.slug),
                    ...(e.target.checked ? [b.slug] : []),
                  ].forEach((v) => next.append('brand', v))
                  next.delete('page')
                  setParams(next, { replace: true })
                }}
              />
              {b.name}
            </label>
          ))
        ) : (
          <p className="text-xs text-muted">Brand akan mengikuti stok toko.</p>
        )}
      </fieldset>
      <Field label="Kategori" htmlFor={`${prefix}-category`}>
        <select
          id={`${prefix}-category`}
          className={inputClass}
          value={params.get('category') || ''}
          onChange={(e) => change('category', e.target.value)}
        >
          <option value="">Semua kategori</option>
          {data?.categories.map((c) => (
            <option value={c.slug} key={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </Field>
      <fieldset>
        <legend className="mb-3 text-xs font-bold">Rentang harga (Rp)</legend>
        <div className="grid gap-3">
          <label className="sr-only" htmlFor={`${prefix}-min`}>
            Harga minimum
          </label>
          <input
            id={`${prefix}-min`}
            type="number"
            min="0"
            step="10000"
            className={inputClass}
            placeholder="Minimum"
            value={params.get('min') || ''}
            onChange={(e) => change('min', e.target.value)}
          />
          <label className="sr-only" htmlFor={`${prefix}-max`}>
            Harga maksimum
          </label>
          <input
            id={`${prefix}-max`}
            type="number"
            min="0"
            step="10000"
            className={inputClass}
            placeholder="Maksimum"
            value={params.get('max') || ''}
            onChange={(e) => change('max', e.target.value)}
          />
        </div>
        {Number(params.get('min')) > Number(params.get('max')) && params.get('max') && (
          <p className="mt-2 text-xs text-danger" role="alert">
            Harga maksimum lebih kecil dari minimum.
          </p>
        )}
      </fieldset>
      <Field label="Penyimpanan" htmlFor={`${prefix}-storage`}>
        <select
          id={`${prefix}-storage`}
          className={inputClass}
          value={params.get('storage') || ''}
          onChange={(e) => change('storage', e.target.value)}
        >
          <option value="">Semua kapasitas</option>
          {[
            ...new Set(
              (data?.products || [])
                .map((p) => p.storage_gb)
                .filter((n): n is number => n !== null),
            ),
          ]
            .sort((a, b) => a - b)
            .map((n) => (
              <option key={n} value={n}>
                {n} GB
              </option>
            ))}
        </select>
      </Field>
      <Field label="Kondisi unit" htmlFor={`${prefix}-condition`}>
        <select
          id={`${prefix}-condition`}
          className={inputClass}
          value={params.get('condition') || ''}
          onChange={(e) => change('condition', e.target.value)}
        >
          <option value="">Semua kondisi</option>
          {CONDITIONS.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Warna tersedia" htmlFor={`${prefix}-color`}>
        <select
          id={`${prefix}-color`}
          className={inputClass}
          value={params.get('color') || ''}
          onChange={(e) => change('color', e.target.value)}
        >
          <option value="">Semua warna</option>
          {[
            ...new Set(
              (data?.products || [])
                .filter(
                  (p) =>
                    p.status === 'available' &&
                    (!params.getAll('brand').length ||
                      params.getAll('brand').includes(p.brands?.slug || '')),
                )
                .map((p) => p.color)
                .filter(Boolean),
            ),
          ]
            .sort()
            .map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
        </select>
      </Field>
      <Field label="Grade data lama (opsional)" htmlFor={`${prefix}-grade`}>
        <select
          id={`${prefix}-grade`}
          className={inputClass}
          value={params.get('grade') || ''}
          onChange={(e) => change('grade', e.target.value)}
        >
          <option value="">Semua grade</option>
          {['A', 'B', 'C'].map((v) => (
            <option key={v} value={v}>
              Grade {v}
            </option>
          ))}
        </select>
        <p className="mt-2 text-[10px] leading-5 text-muted">
          Baca catatan kondisi masing-masing unit untuk detail grade yang diberikan toko.
        </p>
      </Field>
      <Field label="Ketersediaan" htmlFor={`${prefix}-status`}>
        <select
          id={`${prefix}-status`}
          className={inputClass}
          value={params.get('status') || ''}
          onChange={(e) => change('status', e.target.value)}
        >
          <option value="">Tersedia & dipesan</option>
          <option value="available">Tersedia</option>
          <option value="reserved">Dipesan</option>
        </select>
      </Field>
      {data?.products.some((p) => p.battery_health !== null) && (
        <Field label="Battery health minimum (%)" htmlFor={`${prefix}-battery`}>
          <input
            id={`${prefix}-battery`}
            className={inputClass}
            type="number"
            min="0"
            max="100"
            value={params.get('battery') || ''}
            onChange={(e) => change('battery', e.target.value)}
          />
          <p className="mt-2 text-[10px] text-muted">Hanya unit dengan data baterai.</p>
        </Field>
      )}
    </div>
  )
  return (
    <section className={`${container} py-10 sm:py-14`}>
      <Eyebrow>Katalog Second Device</Eyebrow>
      <h1 className="text-4xl font-extrabold tracking-[-0.055em] sm:text-5xl">
        Temukan pilihanmu.
      </h1>
      <p className="mt-4 text-sm leading-7 text-muted">
        Kenali perangkatnya. Cek kondisinya. Pilih dengan yakin.
      </p>
      <div className="relative mt-8">
        <Search className="absolute left-4 top-3.5 text-muted" size={18} />
        <label htmlFor="catalog-search" className="sr-only">
          Cari gadget
        </label>
        <input
          id="catalog-search"
          type="search"
          className={`${inputClass} !min-h-12 !pl-12`}
          placeholder="Cari nama gadget, brand, atau kapasitas…"
          value={params.get('q') || ''}
          onChange={(e) => change('q', e.target.value)}
        />
      </div>
      <div className="mt-8 grid items-start gap-8 lg:grid-cols-[250px_minmax(0,1fr)]">
        <aside className="hidden rounded-xl border border-line p-5 lg:block">
          {controls('desktop')}
        </aside>
        <div className="min-w-0">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <p role="status" aria-live="polite" className="text-xs text-muted">
              <strong className="text-ink">{products.length}</strong> unit ditemukan
            </p>
            <div className="flex w-full min-w-0 flex-wrap gap-2 sm:w-auto">
              <Button
                secondary
                onClick={() => setFilterOpen(true)}
                className="!px-3 !text-xs lg:hidden"
              >
                <SlidersHorizontal size={15} />
                Filter{filters.length > 0 && ` (${filters.length})`}
              </Button>
              <label className="sr-only" htmlFor="sort">
                Urutkan produk
              </label>
              <select
                id="sort"
                className={`${inputClass} min-w-0 flex-1 !w-auto !text-xs sm:flex-none`}
                value={params.get('sort') || 'newest'}
                onChange={(e) => change('sort', e.target.value)}
              >
                <option value="newest">Terbaru</option>
                <option value="price-asc">Harga terendah</option>
                <option value="price-desc">Harga tertinggi</option>
                <option value="name">Nama A–Z</option>
              </select>
            </div>
          </div>
          {filters.length > 0 && (
            <div className="mb-5 flex flex-wrap gap-2">
              {filters.map(([key, value]) => (
                <button
                  key={`${key}-${value}`}
                  onClick={() => {
                    const next = new URLSearchParams(params)
                    next.delete(key, value)
                    next.delete('page')
                    setParams(next, { replace: true })
                  }}
                  className="flex min-h-9 items-center gap-2 rounded-md bg-paper px-3 text-[10px] font-semibold"
                  aria-label={`Hapus filter ${filterLabels[key]} ${value}`}
                >
                  {filterLabels[key]}: {value}
                  <X size={12} />
                </button>
              ))}
              <button onClick={reset} className="px-2 text-xs underline">
                Reset semua
              </button>
            </div>
          )}
          {isPending ? (
            <Loading />
          ) : isError ? (
            <ErrorState retry={() => void refetch()} />
          ) : products.length ? (
            <>
              <div className="grid grid-cols-1 gap-4 min-[360px]:grid-cols-2 xl:grid-cols-3">
                {products.slice((page - 1) * perPage, page * perPage).map((p) => (
                  <ProductCard key={p.id} product={p} />
                ))}
              </div>
              {products.length > perPage && (
                <nav
                  aria-label="Halaman katalog"
                  className="mt-8 flex flex-wrap items-center justify-center gap-2 sm:gap-4"
                >
                  <Button
                    secondary
                    disabled={page <= 1}
                    onClick={() => {
                      const next = new URLSearchParams(params)
                      next.set('page', String(page - 1))
                      setParams(next)
                    }}
                  >
                    Sebelumnya
                  </Button>
                  <span className="text-xs">
                    {page} / {Math.ceil(products.length / perPage)}
                  </span>
                  <Button
                    secondary
                    disabled={page * perPage >= products.length}
                    onClick={() => {
                      const next = new URLSearchParams(params)
                      next.set('page', String(page + 1))
                      setParams(next)
                    }}
                  >
                    Berikutnya
                  </Button>
                </nav>
              )}
            </>
          ) : (
            <EmptyState
              title={filters.length ? 'Belum ketemu yang cocok.' : 'Katalog sedang disiapkan.'}
              description={
                filters.length
                  ? 'Coba kata kunci lain atau kurangi filter untuk melihat pilihan yang tersedia.'
                  : 'Unit yang sudah dipublikasikan toko akan muncul di sini, lengkap dengan foto, kondisi, dan harga.'
              }
              action={
                filters.length ? (
                  <Button secondary onClick={reset}>
                    Reset filter
                  </Button>
                ) : undefined
              }
            />
          )}
        </div>
      </div>
      <Dialog open={filterOpen} onClose={() => setFilterOpen(false)} title="Filter gadget">
        {controls('mobile')}
        <Button className="mt-7 w-full" onClick={() => setFilterOpen(false)}>
          Lihat {products.length} hasil
        </Button>
      </Dialog>
    </section>
  )
}
