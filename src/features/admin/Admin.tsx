import { useEffect, useState } from 'react'
import { Link, Navigate, useLocation } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Archive,
  Trash2,
  ArrowLeft,
  ArrowUpRight,
  ClipboardList,
  LayoutDashboard,
  Package,
  Pencil,
  Plus,
  Settings,
  ShieldCheck,
  Tag,
  Users,
  X,
} from 'lucide-react'
import { useAuth } from '../../app/Auth'
import { Logo } from '../../components/layout'
import {
  Button,
  Dialog,
  EmptyState,
  ErrorState,
  Field,
  inputClass,
  Loading,
  buttonClass,
} from '../../components/ui'
import { defaults, productSelect, readAll } from '../../lib/data'
import { isConfigured, requireSupabase } from '../../lib/supabase'
import { activePromotions, dateLabel, rupiah, stockLabel } from '../../lib/utils'
import type {
  AdminProfile,
  Brand,
  Category,
  DeviceModel,
  Product,
  Promotion,
  TradeIn,
  Review,
} from '../../types'
import InventoryCharts from './InventoryCharts'
import { conditionText } from '../../lib/catalog'
import ReviewModeration from './ReviewModeration'
import { useSeo } from '../../hooks/useSeo'
import ProductEditor from './ProductEditor'
import CrudPanel, { configs, type Row } from './CrudPanel'
import AdminShell from './AdminShell'
import Accounts from './Accounts'

const nav = [
  ['', 'Ringkasan', LayoutDashboard],
  ['produk', 'Produk', Package],
  ['brand', 'Brand', Tag],
  ['kategori', 'Kategori', ClipboardList],
  ['promo', 'Promo', Tag],
  ['trade-in', 'Trade In', ClipboardList],
  ['ulasan', 'Ulasan', Users],
  ['pengaturan', 'Pengaturan', Settings],
  ['akun', 'Akun admin', ShieldCheck],
] as const
export default function Admin() {
  const { session, profile, loading } = useAuth(),
    location = useLocation()
  useSeo('Admin toko')
  useEffect(() => {
    let meta = document.querySelector('meta[name="robots"]')
    if (!meta) {
      meta = document.createElement('meta')
      meta.setAttribute('name', 'robots')
      document.head.append(meta)
    }
    meta.setAttribute('content', 'noindex,nofollow')
    return () => meta?.remove()
  }, [])
  if (loading) return <Loading label="Memeriksa sesi admin…" />
  if (location.pathname === '/admin/login')
    return profile ? <Navigate to="/admin" replace /> : <Login signedIn={!!session} />
  if (!session) return <Navigate to="/admin/login" replace />
  if (!profile) return <Login signedIn />
  return <Dashboard profile={profile} />
}
function Login({ signedIn }: { signedIn: boolean }) {
  const [email, setEmail] = useState(''),
    [password, setPassword] = useState(''),
    [busy, setBusy] = useState(false),
    [error, setError] = useState('')
  async function login(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError('')
    try {
      const { error: err } = await requireSupabase().auth.signInWithPassword({ email, password })
      if (err) throw new Error('Email atau password tidak sesuai, atau akun belum aktif.')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Login gagal.')
    } finally {
      setBusy(false)
    }
  }
  return (
    <main className="grid min-h-dvh place-items-center bg-paper px-5 py-12">
      <div className="mx-auto w-full max-w-md rounded-2xl border border-line bg-white p-7 sm:p-10">
        <div className="justify-center text-center flex">
          <Logo />
        </div>
        <h1 className="mt-9 text-2xl font-extrabold tracking-tight">Ruang pengelolaan toko.</h1>
        <p className="mb-7 mt-3 text-xs leading-6 text-muted">
          Akses khusus admin Second Device. Akun dibuat langsung oleh owner.
        </p>
        {!isConfigured && (
          <p role="status" className="mb-6 rounded-lg bg-paper p-4 text-xs leading-6">
            Supabase belum terhubung. Isi environment sesuai README dan jalankan migration untuk
            mengaktifkan login.
          </p>
        )}
        {signedIn ? (
          <>
            <p role="alert" className="text-sm leading-7 text-danger">
              Akun ini belum memiliki akses admin. Minta owner memeriksa role akun.
            </p>
            <Button className="mt-5" onClick={() => void requireSupabase().auth.signOut()}>
              Keluar dari akun
            </Button>
          </>
        ) : (
          <form onSubmit={login} className="space-y-5">
            <Field label="Email admin" htmlFor="email">
              <input
                id="email"
                type="email"
                autoComplete="username"
                required
                className={inputClass}
                disabled={!isConfigured || busy}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </Field>
            <Field label="Password" htmlFor="password">
              <input
                id="password"
                type="password"
                autoComplete="current-password"
                required
                className={inputClass}
                disabled={!isConfigured || busy}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </Field>
            {error && (
              <p role="alert" className="text-xs text-danger">
                {error}
              </p>
            )}
            <Button className="w-full" disabled={!isConfigured || busy}>
              {busy ? 'Memeriksa…' : 'Masuk dashboard'}
              <ArrowUpRight size={16} />
            </Button>
          </form>
        )}
      </div>
    </main>
  )
}
function Dashboard({ profile }: { profile: AdminProfile }) {
  const { pathname } = useLocation(),
    client = useQueryClient()
  const canManage = profile.role === 'owner' || profile.role === 'admin'
  const section = pathname.replace(/^\/admin\/?/, '').split('/')[0]
  const [notice, setNotice] = useState(''),
    [error, setError] = useState(''),
    [search, setSearch] = useState(''),
    [status, setStatus] = useState(''),
    [editor, setEditor] = useState<Product | null | undefined>(undefined),
    [editorOpen, setEditorOpen] = useState(false),
    [trade, setTrade] = useState<TradeIn | null>(null),
    [busy, setBusy] = useState(false)
  const {
    data,
    isPending,
    isError,
    error: loadError,
    refetch,
  } = useQuery({
    queryKey: ['admin-data', profile.user_id],
    queryFn: async () => {
      const [products, brands, categories, promotions, reviews, settings, trades, logs, models] =
        await Promise.all([
          readAll<Product>('products', productSelect),
          readAll<Brand>('brands'),
          readAll<Category>('categories'),
          readAll<Promotion>('promotions', '*,promotion_products(product_id)'),
          readAll<Review>('reviews'),
          readAll<Row>('store_settings'),
          readAll<TradeIn>('trade_in_requests'),
          readAll<Row>('admin_audit_logs'),
          readAll<DeviceModel>('device_models').catch((error) => {
            if (error?.code === 'PGRST205' || error?.code === '42P01') {
              throw new Error(
                'Pembaruan database katalog diperlukan. Jalankan migration 002 dan 003 sesuai panduan Pembaruan aplikasi di README, lalu klik Coba lagi.',
              )
            }
            throw error
          }),
        ])
      return {
        products,
        brands,
        categories,
        promotions,
        reviews,
        settings,
        trades,
        logs,
        models,
      }
    },
    staleTime: 300_000,
    refetchOnWindowFocus: false,
  })
  useEffect(() => {
    setSearch('')
    setStatus('')
    setError('')
    setNotice('')
  }, [section])
  function saved(message: string) {
    setNotice(message)
    void client.invalidateQueries({ queryKey: ['admin-data'] })
    void client.invalidateQueries({ queryKey: ['store'] })
    void client.invalidateQueries({ queryKey: ['admin-accounts'] })
  }
  function openEditor(product: Product | null) {
    if (!canManage) return
    setEditor(product)
    setEditorOpen(true)
  }
  async function archive(p: Product) {
    if (!canManage) return
    if (!window.confirm(`Arsipkan ${p.name}? Unit tidak lagi tampil di katalog.`)) return
    setError('')
    const { error } = await requireSupabase()
      .from('products')
      .update({ status: 'archived' })
      .eq('id', p.id)
    if (error) setError('Unit belum berhasil diarsipkan.')
    else saved('Unit diarsipkan.')
  }
  async function deleteProduct(product: Product) {
    if (
      !canManage ||
      !window.confirm(`Hapus permanen ${product.name}? Data produk dan foto akan dihapus.`)
    )
      return
    setBusy(true)
    setError('')
    try {
      const db = requireSupabase()
      const { error: failure } = await db
        .from('products')
        .delete()
        .eq('id', product.id)
        .select('id')
        .single()
      if (failure) throw failure
      const paths = product.product_images
        .map((image) => image.storage_path)
        .filter((path) => path.startsWith(`products/${product.id}/`))
      let mediaError = false
      if (paths.length) {
        const result = await db.storage.from('product-images').remove(paths)
        mediaError = Boolean(result.error)
      }
      saved(
        mediaError
          ? 'Produk dihapus. Beberapa file foto belum terhapus dari Storage; periksa kembali.'
          : 'Produk dan foto berhasil dihapus.',
      )
    } catch {
      setError('Produk belum berhasil dihapus. Periksa akses akun dan migrasi terbaru.')
    } finally {
      setBusy(false)
    }
  }
  async function saveTrade(e: React.FormEvent) {
    e.preventDefault()
    if (!trade || !canManage) return
    setBusy(true)
    const { error } = await requireSupabase()
      .from('trade_in_requests')
      .update({ status: trade.status, admin_notes: trade.admin_notes })
      .eq('id', trade.id)
    setBusy(false)
    if (error) setError('Perubahan pengajuan belum tersimpan.')
    else {
      setTrade(null)
      saved('Pengajuan diperbarui.')
    }
  }
  async function photo(path: string) {
    const { data, error } = await requireSupabase()
      .storage.from('trade-in-private')
      .createSignedUrl(path, 60)
    if (error || !data) {
      setError('Foto privat belum dapat dibuka.')
      return
    }
    window.open(data.signedUrl, '_blank', 'noopener,noreferrer')
  }
  async function deleteTrade() {
    if (
      !trade ||
      !canManage ||
      !window.confirm(
        'Hapus permanen pengajuan dan foto privat ini? Tindakan tidak dapat dibatalkan.',
      )
    )
      return
    setBusy(true)
    try {
      if (trade.photo_paths.length) {
        const { error } = await requireSupabase()
          .storage.from('trade-in-private')
          .remove(trade.photo_paths)
        if (error) throw error
      }
      const { error } = await requireSupabase()
        .from('trade_in_requests')
        .delete()
        .eq('id', trade.id)
      if (error) throw error
      setTrade(null)
      saved('Pengajuan dan foto dihapus.')
    } catch {
      setError('Penghapusan belum selesai. Periksa pengajuan dan coba kembali.')
    } finally {
      setBusy(false)
    }
  }
  const table = (
    {
      brand: 'brands',
      kategori: 'categories',
      promo: 'promotions',
      pengaturan: 'store_settings',
    } as Record<string, string>
  )[section]
  const rows =
    table && data
      ? (
          {
            brands: data.brands,
            categories: data.categories,
            promotions: data.promotions,
            reviews: data.reviews,
            store_settings: data.settings.length
              ? data.settings
              : [{ ...defaults, id: '00000000-0000-0000-0000-000000000001' }],
          } as unknown as Record<string, Row[]>
        )[table]
      : []
  return (
    <AdminShell profile={profile} items={nav}>
      {notice && (
        <div
          role="status"
          className="mb-5 flex items-center justify-between gap-4 rounded-lg bg-success/10 p-4 text-xs text-success"
        >
          {notice}
          <button aria-label="Tutup pemberitahuan" onClick={() => setNotice('')}>
            <X size={16} />
          </button>
        </div>
      )}
      {error && (
        <p role="alert" className="mb-5 rounded-lg bg-danger/10 p-4 text-xs text-danger">
          {error}
        </p>
      )}
      {isPending ? (
        <Loading />
      ) : isError && !data ? (
        <div>
          <ErrorState retry={() => void refetch()} />
          {loadError instanceof Error && loadError.message.startsWith('Pembaruan database') && (
            <p
              role="alert"
              className="mt-4 rounded-xl border border-line bg-white p-5 text-sm leading-7"
            >
              {loadError.message}
            </p>
          )}
        </div>
      ) : (
        data && (
          <>
            {section === '' && (
              <>
                <h1 className="mb-7 text-2xl font-extrabold tracking-tight">Ringkasan toko.</h1>

                <div className="grid grid-cols-2 gap-4 xl:grid-cols-5">
                  {[
                    ['Tersedia', data.products.filter((p) => p.status === 'available').length],
                    ['Dipesan', data.products.filter((p) => p.status === 'reserved').length],
                    ['Terjual', data.products.filter((p) => p.status === 'sold').length],
                    ['Promo aktif', activePromotions(data.promotions, data.products).length],
                    ['Trade in baru', data.trades.filter((t) => t.status === 'new').length],
                  ].map(([label, total]) => (
                    <div key={String(label)} className="rounded-xl border border-line bg-white p-5">
                      <p className="text-[11px] text-muted">{label}</p>
                      <p className="mt-4 text-3xl font-extrabold">{total}</p>
                    </div>
                  ))}
                </div>
                <div className="mt-7 rounded-xl border border-line bg-white p-7">
                  <h2 className="text-lg font-bold">Mulai dari informasi yang lengkap.</h2>
                  <p className="mt-3 max-w-xl text-sm leading-7 text-muted">
                    Siapkan brand dan kategori, tambahkan unit beserta foto aslinya, lalu lengkapi
                    kontak toko. Unit draft tetap privat sampai dipublikasikan.
                  </p>
                  <Link to="/admin/produk" className={`${buttonClass} mt-5`}>
                    Kelola produk
                    <ArrowUpRight size={16} />
                  </Link>
                </div>
                {canManage && (
                  <div className="mt-8">
                    <h2 className="mb-4 text-sm font-bold">Aktivitas admin terbaru</h2>
                    {data.logs.length ? (
                      <div className="overflow-x-auto rounded-xl border border-line bg-white">
                        <table className="w-full text-left text-xs">
                          <thead className="border-b border-line bg-paper">
                            <tr>
                              {['Waktu', 'Entitas', 'Tindakan', 'Aktor'].map((t) => (
                                <th key={t} className="p-4 font-semibold">
                                  {t}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {[...data.logs]
                              .sort(
                                (a, b) =>
                                  Date.parse(String(b.created_at)) -
                                  Date.parse(String(a.created_at)),
                              )
                              .slice(0, 10)
                              .map((l) => (
                                <tr key={String(l.id)} className="border-b border-line">
                                  <td className="p-4">{dateLabel(String(l.created_at))}</td>
                                  <td className="p-4">{String(l.entity_type)}</td>
                                  <td className="p-4">{String(l.action)}</td>
                                  <td className="p-4 font-mono">
                                    {String(l.actor_user_id || 'system').slice(0, 8)}
                                  </td>
                                </tr>
                              ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <p className="text-xs text-muted">Belum ada perubahan yang dicatat.</p>
                    )}
                  </div>
                )}
              </>
            )}
            {section === 'produk' && (
              <>
                <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
                  <h1 className="text-2xl font-extrabold tracking-tight">Unit gadget.</h1>
                  {canManage && (
                    <Button onClick={() => openEditor(null)}>
                      <Plus size={16} />
                      Tambah unit
                    </Button>
                  )}
                </div>
                <div className="mb-5 flex flex-wrap gap-3">
                  <label className="sr-only" htmlFor="product-search">
                    Cari produk atau SKU
                  </label>
                  <input
                    id="product-search"
                    className={`${inputClass} min-w-0 flex-1 basis-full sm:basis-auto`}
                    placeholder="Cari unit atau SKU…"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                  <label className="sr-only" htmlFor="stock-filter">
                    Filter status
                  </label>
                  <select
                    id="stock-filter"
                    className={`${inputClass} sm:!w-auto`}
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                  >
                    <option value="">Semua status</option>
                    {Object.entries(stockLabel).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </div>
                {data.products.filter(
                  (p) =>
                    (!status || p.status === status) &&
                    `${p.name} ${p.sku}`.toLowerCase().includes(search.toLowerCase()),
                ).length ? (
                  <div>
                    <div className="space-y-3 sm:hidden">
                      {data.products
                        .filter(
                          (p) =>
                            (!status || p.status === status) &&
                            `${p.name} ${p.sku}`.toLowerCase().includes(search.toLowerCase()),
                        )
                        .map((p) => (
                          <article
                            key={p.id}
                            className="rounded-xl border border-line bg-white p-4"
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <h2 className="break-words text-sm font-bold">{p.name}</h2>
                                <p className="mt-1 break-all text-[11px] text-muted">{p.sku}</p>
                              </div>
                              <span className="shrink-0 rounded-md bg-paper px-2 py-1 text-[10px] font-bold">
                                {stockLabel[p.status]}
                              </span>
                            </div>
                            <p className="mt-3 text-base font-bold text-navy">{rupiah(p.price)}</p>
                            <p className="mt-1 text-xs text-muted">
                              {p.storage_gb || '-'} GB / {conditionText(p)}
                            </p>
                            {canManage && (
                              <div className="mt-4 grid grid-cols-2 gap-2 border-t border-line pt-3">
                                <Button
                                  secondary
                                  className="!px-2 !text-xs"
                                  onClick={() => openEditor(p)}
                                >
                                  <Pencil size={15} />
                                  Ubah
                                </Button>
                                <Button
                                  secondary
                                  className="!px-2 !text-xs !text-danger"
                                  disabled={busy}
                                  onClick={() => void deleteProduct(p)}
                                >
                                  <Trash2 size={15} />
                                  Hapus
                                </Button>
                                {p.status !== 'archived' && (
                                  <Button
                                    secondary
                                    className="col-span-2 !text-xs"
                                    disabled={busy}
                                    onClick={() => void archive(p)}
                                  >
                                    <Archive size={15} />
                                    Arsipkan
                                  </Button>
                                )}
                              </div>
                            )}
                          </article>
                        ))}
                    </div>
                    <div className="hidden overflow-x-auto rounded-xl border border-line bg-white sm:block">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-paper">
                          <tr>
                            {['Unit', 'Harga', 'Status', 'Aksi'].map((h) => (
                              <th key={h} className="p-4 font-semibold">
                                {h}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {data.products
                            .filter(
                              (p) =>
                                (!status || p.status === status) &&
                                `${p.name} ${p.sku}`.toLowerCase().includes(search.toLowerCase()),
                            )
                            .map((p) => (
                              <tr key={p.id} className="border-t border-line">
                                <td className="min-w-44 p-4">
                                  <p className="font-bold">{p.name}</p>
                                  <p className="mt-1 text-[10px] text-muted">
                                    {p.sku} · {p.storage_gb || '—'} GB · {conditionText(p)}
                                  </p>
                                </td>
                                <td className="whitespace-nowrap p-4">{rupiah(p.price)}</td>
                                <td className="whitespace-nowrap p-4">{stockLabel[p.status]}</td>
                                <td className="p-4">
                                  {canManage ? (
                                    <div className="flex">
                                      <button
                                        aria-label={`Ubah ${p.name}`}
                                        className="flex size-11 items-center justify-center hover:bg-paper"
                                        onClick={() => openEditor(p)}
                                      >
                                        <Pencil size={15} />
                                      </button>
                                      {p.status !== 'archived' && (
                                        <button
                                          aria-label={`Arsipkan ${p.name}`}
                                          className="flex size-11 items-center justify-center text-muted hover:bg-paper"
                                          onClick={() => void archive(p)}
                                        >
                                          <Archive size={15} />
                                        </button>
                                      )}
                                      <button
                                        type="button"
                                        aria-label={`Hapus ${p.name}`}
                                        disabled={busy}
                                        className="flex size-11 items-center justify-center text-danger hover:bg-danger/5"
                                        onClick={() => void deleteProduct(p)}
                                      >
                                        <Trash2 size={15} />
                                      </button>
                                    </div>
                                  ) : null}
                                </td>
                              </tr>
                            ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ) : (
                  <EmptyState
                    title="Belum ada unit."
                    description="Tambahkan data dan foto asli setiap perangkat. Unit tersimpan sebagai draft sampai kamu memublikasikannya."
                  />
                )}
              </>
            )}
            {section === '' && <InventoryCharts products={data.products} trades={data.trades} />}
            {section === 'ulasan' && (
              <ReviewModeration reviews={data.reviews} onSaved={saved} readOnly={!canManage} />
            )}
            {table && configs[table] && (
              <CrudPanel
                key={table}
                table={table}
                rows={rows}
                products={data.products}
                onSaved={saved}
                readOnly={!canManage}
              />
            )}
            {section === 'trade-in' && (
              <>
                <h1 className="mb-6 text-2xl font-extrabold tracking-tight">Pengajuan trade in.</h1>
                <div className="mb-5 flex flex-wrap gap-3">
                  <label className="sr-only" htmlFor="trade-search">
                    Cari pengajuan
                  </label>
                  <input
                    id="trade-search"
                    className={`${inputClass} flex-1`}
                    placeholder="Cari nama, model, atau referensi…"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                  <label className="sr-only" htmlFor="trade-filter">
                    Status pengajuan
                  </label>
                  <select
                    id="trade-filter"
                    className={`${inputClass} sm:!w-auto`}
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                  >
                    <option value="">Semua status</option>
                    {[
                      ['new', 'Baru'],
                      ['processing', 'Diproses'],
                      ['completed', 'Selesai'],
                      ['rejected', 'Ditolak'],
                    ].map(([v, l]) => (
                      <option key={v} value={v}>
                        {l}
                      </option>
                    ))}
                  </select>
                </div>
                {data.trades.filter(
                  (t) =>
                    (!status || t.status === status) &&
                    `${t.name} ${t.model} ${t.reference_code}`
                      .toLowerCase()
                      .includes(search.toLowerCase()),
                ).length ? (
                  <div className="space-y-3">
                    {data.trades
                      .filter(
                        (t) =>
                          (!status || t.status === status) &&
                          `${t.name} ${t.model} ${t.reference_code}`
                            .toLowerCase()
                            .includes(search.toLowerCase()),
                      )
                      .sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at))
                      .map((t) => (
                        <button
                          key={t.id}
                          onClick={() => setTrade(t)}
                          className="flex w-full flex-wrap items-center justify-between gap-3 rounded-xl border border-line bg-white p-5 text-left"
                        >
                          <div>
                            <p className="text-sm font-bold">
                              {t.brand} {t.model}
                            </p>
                            <p className="mt-1 text-xs text-muted">
                              {t.reference_code} · {t.name}
                            </p>
                          </div>
                          <span className="text-xs font-semibold">
                            {
                              {
                                new: 'Baru',
                                processing: 'Diproses',
                                completed: 'Selesai',
                                rejected: 'Ditolak',
                              }[t.status]
                            }
                            <ArrowUpRight size={14} className="ml-2 inline" />
                          </span>
                        </button>
                      ))}
                  </div>
                ) : (
                  <EmptyState
                    title="Belum ada pengajuan."
                    description="Pengajuan pelanggan yang terkirim akan tampil di sini secara privat."
                  />
                )}
              </>
            )}
            {section === 'akun' &&
              (profile.role === 'owner' ? (
                <Accounts currentId={profile.user_id} saved={saved} />
              ) : (
                <EmptyState
                  title="Akses khusus owner."
                  description="Hanya owner yang dapat mengelola akun admin."
                />
              ))}
            {section === 'pengaturan' && (
              <div className="mt-6">
                <PasswordForm />
              </div>
            )}
            {section === 'atur-password' && <Navigate to="/admin/pengaturan" replace />}
            {![
              '',
              'produk',
              'brand',
              'kategori',
              'promo',
              'trade-in',
              'ulasan',
              'pengaturan',
              'akun',
              'atur-password',
            ].includes(section) && (
              <EmptyState
                title="Halaman admin tidak ditemukan."
                description="Pilih modul dari navigasi dashboard."
              />
            )}
            <Dialog
              open={canManage && editorOpen}
              onClose={() => {
                if (!busy) setEditorOpen(false)
              }}
              title={editor ? 'Ubah unit' : 'Tambah unit'}
              wide
            >
              {editor !== undefined && (
                <ProductEditor
                  key={editor?.id || 'new'}
                  draftKey={`product:${profile.user_id}:${editor?.id || 'new'}`}
                  product={editor || null}
                  brands={data.brands}
                  categories={data.categories}
                  models={data.models}
                  onSaved={() => {
                    setEditorOpen(false)
                    setEditor(undefined)
                    saved('Unit dan foto berhasil disimpan.')
                  }}
                  onCancel={() => setEditorOpen(false)}
                  onBusyChange={setBusy}
                />
              )}
            </Dialog>
            <Dialog
              open={trade !== null}
              onClose={() => {
                if (!busy) setTrade(null)
              }}
              title={trade?.reference_code || 'Pengajuan'}
              wide
            >
              {trade && (
                <form onSubmit={saveTrade} className="space-y-5">
                  {error && (
                    <p role="alert" className="rounded-lg bg-danger/5 p-4 text-xs text-danger">
                      {error}
                    </p>
                  )}
                  <dl className="grid gap-5 sm:grid-cols-2">
                    {[
                      ['Nama', trade.name],
                      ['WhatsApp', trade.phone],
                      ['Perangkat', `${trade.brand} ${trade.model}`],
                      ['Kapasitas', trade.storage_gb ? `${trade.storage_gb} GB` : 'Tidak dicatat'],
                      ['Kondisi', trade.condition_notes],
                      ['Kelengkapan', trade.accessories],
                      ['Catatan pelanggan', trade.notes],
                      ['Diterima', dateLabel(trade.created_at)],
                    ].map(([k, v]) => (
                      <div key={k}>
                        <dt className="text-xs text-muted">{k}</dt>
                        <dd className="mt-1 whitespace-pre-line text-sm leading-7">{v || '—'}</dd>
                      </div>
                    ))}
                  </dl>
                  {trade.photo_paths.length > 0 && (
                    <div className="flex flex-wrap gap-3">
                      {trade.photo_paths.map((path, i) => (
                        <Button key={path} type="button" secondary onClick={() => void photo(path)}>
                          Buka foto {i + 1}
                          <ArrowUpRight size={14} />
                        </Button>
                      ))}
                    </div>
                  )}
                  <Field label="Status tindak lanjut" htmlFor="trade-status">
                    <select
                      id="trade-status"
                      className={inputClass}
                      disabled={busy || !canManage}
                      value={trade.status}
                      onChange={(e) =>
                        setTrade({ ...trade, status: e.target.value as TradeIn['status'] })
                      }
                    >
                      {[
                        ['new', 'Baru'],
                        ['processing', 'Diproses'],
                        ['completed', 'Selesai'],
                        ['rejected', 'Ditolak'],
                      ].map(([v, l]) => (
                        <option key={v} value={v}>
                          {l}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Catatan internal admin" htmlFor="admin-notes">
                    <textarea
                      id="admin-notes"
                      className={inputClass}
                      maxLength={6000}
                      rows={3}
                      disabled={busy || !canManage}
                      value={trade.admin_notes}
                      onChange={(e) => setTrade({ ...trade, admin_notes: e.target.value })}
                    />
                  </Field>
                  <div className="flex flex-wrap gap-3">
                    {canManage && (
                      <Button disabled={busy}>
                        {busy ? 'Menyimpan...' : 'Simpan tindak lanjut'}
                      </Button>
                    )}
                    {canManage && (
                      <Button
                        type="button"
                        secondary
                        className="!text-danger"
                        disabled={busy}
                        onClick={() => void deleteTrade()}
                      >
                        Hapus data permanen
                      </Button>
                    )}
                  </div>
                </form>
              )}
            </Dialog>
          </>
        )
      )}
    </AdminShell>
  )
}
function PasswordForm() {
  const [password, setPassword] = useState(''),
    [confirmation, setConfirmation] = useState(''),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState('')
  return (
    <form
      className="max-w-md space-y-5 rounded-xl border border-line bg-white p-7"
      onSubmit={async (e) => {
        e.preventDefault()
        if (password !== confirmation) {
          setMessage('Konfirmasi password belum sama.')
          return
        }
        setBusy(true)
        const { error } = await requireSupabase().auth.updateUser({ password })
        setBusy(false)
        setMessage(
          error
            ? 'Password belum berhasil diperbarui. Coba login ulang.'
            : 'Password berhasil diperbarui.',
        )
        if (!error) {
          setPassword('')
          setConfirmation('')
        }
      }}
    >
      <h2 className="text-xl font-bold">Ubah password akun</h2>
      <Field label="Password baru (min. 12 karakter)" htmlFor="new-password">
        <input
          id="new-password"
          type="password"
          autoComplete="new-password"
          required
          minLength={12}
          className={inputClass}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </Field>
      <Field label="Konfirmasi password baru" htmlFor="confirm-password">
        <input
          id="confirm-password"
          type="password"
          autoComplete="new-password"
          required
          minLength={12}
          className={inputClass}
          value={confirmation}
          onChange={(e) => setConfirmation(e.target.value)}
        />
      </Field>
      <Button disabled={busy}>{busy ? 'Menyimpan…' : 'Simpan password'}</Button>
      {message && (
        <p role="status" className="text-xs leading-6">
          {message}
        </p>
      )}
    </form>
  )
}
