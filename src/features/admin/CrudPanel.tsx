import { useState } from 'react'
import { Pencil, Plus } from 'lucide-react'
import { Button, Dialog, EmptyState, Field, FileDropzone, inputClass } from '../../components/ui'
import { requireSupabase } from '../../lib/supabase'
import { validatePhoto, validateSettings } from '../../lib/validation'
import { catalogBrands } from '../../lib/catalog'
import { imageUrl } from '../../lib/supabase'
import ImagePreview from '../../components/ImagePreview'
import { slugify } from '../../lib/utils'
import type { Product } from '../../types'

export type Row = Record<string, unknown>
type FieldConfig = {
  key: string
  label: string
  type?: 'text' | 'textarea' | 'number' | 'checkbox' | 'datetime-local' | 'image'
  required?: boolean
}
export const configs: Record<
  string,
  { title: string; labelKey: string; fields: FieldConfig[]; defaults: Row }
> = {
  brands: {
    title: 'Brand',
    labelKey: 'name',
    fields: [
      { key: 'name', label: 'Nama', required: true },
      { key: 'slug', label: 'Slug unik', required: true },
      { key: 'logo_path', label: 'Logo resmi (opsional)', type: 'image' },
      { key: 'sort_order', label: 'Urutan', type: 'number' },
      { key: 'is_active', label: 'Aktif', type: 'checkbox' },
    ],
    defaults: { name: '', slug: '', logo_path: '', sort_order: 0, is_active: true },
  },
  categories: {
    title: 'Kategori',
    labelKey: 'name',
    fields: [
      { key: 'name', label: 'Nama', required: true },
      { key: 'slug', label: 'Slug unik', required: true },
      { key: 'is_active', label: 'Aktif', type: 'checkbox' },
    ],
    defaults: { name: '', slug: '', is_active: true },
  },
  promotions: {
    title: 'Promo',
    labelKey: 'title',
    fields: [
      { key: 'title', label: 'Judul promo', required: true },
      { key: 'slug', label: 'Slug unik', required: true },
      { key: 'description', label: 'Deskripsi', type: 'textarea', required: true },
      { key: 'terms', label: 'Syarat dan ketentuan', type: 'textarea', required: true },
      { key: 'banner_path', label: 'Banner aktual (opsional)', type: 'image' },
      {
        key: 'start_at',
        label: 'Mulai (zona waktu perangkat)',
        type: 'datetime-local',
        required: true,
      },
      {
        key: 'end_at',
        label: 'Berakhir (zona waktu perangkat)',
        type: 'datetime-local',
        required: true,
      },
      { key: 'is_active', label: 'Aktif', type: 'checkbox' },
    ],
    defaults: {
      title: '',
      slug: '',
      description: '',
      terms: '',
      banner_path: '',
      start_at: '',
      end_at: '',
      is_active: false,
    },
  },
  store_settings: {
    title: 'Pengaturan toko',
    labelKey: 'store_name',
    fields: [
      { key: 'store_name', label: 'Nama toko', required: true },
      { key: 'tagline', label: 'Tagline' },
      { key: 'whatsapp_number', label: 'WhatsApp bisnis (08… / 628…)' },
      { key: 'instagram_url', label: 'URL Instagram resmi' },
      { key: 'facebook_url', label: 'URL Facebook resmi' },
      { key: 'tiktok_url', label: 'URL TikTok resmi' },
      { key: 'youtube_url', label: 'URL YouTube resmi' },
      { key: 'address', label: 'Alamat toko', type: 'textarea' },
      { key: 'google_maps_url', label: 'URL Google Maps' },
      { key: 'opening_hours', label: 'Jam operasional', type: 'textarea' },
      { key: 'about_text', label: 'Deskripsi toko', type: 'textarea' },
      { key: 'logo_path', label: 'Logo toko', type: 'image' },
    ],
    defaults: {
      store_name: 'Second Device',
      tagline: 'Jual Beli Gadget Second',
      whatsapp_number: '',
      instagram_url: '',
      facebook_url: '',
      tiktok_url: '',
      youtube_url: '',
      payment_methods: ['qris', 'bank', 'ewallet', 'visa', 'mastercard', 'kredivo'],
      address: '',
      google_maps_url: '',
      opening_hours: '',
      about_text: '',
      logo_path: '',
    },
  },
}
function localDate(value: unknown) {
  if (!value) return ''
  const d = new Date(String(value))
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16)
}
export default function CrudPanel({
  table,
  rows,
  products,
  onSaved,
  readOnly = false,
}: {
  table: string
  rows: Row[]
  products: Product[]
  onSaved: (message: string) => void
  readOnly?: boolean
}) {
  const config = configs[table],
    [editing, setEditing] = useState<Row | null>(null),
    [files, setFiles] = useState<Record<string, File>>({}),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(''),
    [search, setSearch] = useState('')
  function open(row?: Row) {
    const initial = { ...config.defaults, ...row }
    for (const f of config.fields)
      if (f.type === 'datetime-local') initial[f.key] = localDate(initial[f.key])
    if (table === 'promotions')
      initial.product_ids = (
        (row?.promotion_products as { product_id: string }[] | undefined) || []
      ).map((l) => l.product_id)
    setEditing(initial)
    setFiles({})
    setError('')
  }
  async function save(e: React.FormEvent) {
    e.preventDefault()
    if (!editing || readOnly) return
    setBusy(true)
    setError('')
    const db = requireSupabase(),
      uploaded: string[] = []
    try {
      const record: Row = {}
      for (const f of config.fields) {
        const v = editing[f.key]
        record[f.key] =
          f.type === 'number'
            ? v === '' || v == null
              ? null
              : Number(v)
            : f.type === 'datetime-local'
              ? new Date(String(v)).toISOString()
              : typeof v === 'string'
                ? v.trim()
                : v
      }
      record.id =
        editing.id ||
        (table === 'store_settings' ? '00000000-0000-0000-0000-000000000001' : crypto.randomUUID())
      if (record.slug && !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(String(record.slug)))
        throw new Error('Slug hanya boleh berisi huruf kecil, angka, dan tanda -.')
      if (table === 'store_settings') {
        record.payment_methods = editing.payment_methods || []
        const invalid = validateSettings(record)
        if (invalid) throw new Error(invalid)
      }
      if (
        table === 'promotions' &&
        Date.parse(String(record.end_at)) <= Date.parse(String(record.start_at))
      )
        throw new Error('Waktu berakhir harus setelah waktu mulai.')
      for (const [key, file] of Object.entries(files)) {
        const invalid = validatePhoto(file)
        if (invalid) throw new Error(invalid)
        const ext = file.type === 'image/jpeg' ? 'jpg' : file.type === 'image/png' ? 'png' : 'webp'
        const path = `content/${table}/${crypto.randomUUID()}.${ext}`
        const { error: uploadError } = await db.storage
          .from('product-images')
          .upload(path, file, { contentType: file.type })
        if (uploadError) throw new Error('Unggah gambar gagal.')
        uploaded.push(path)
        record[key] = path
      }
      const result =
        table === 'promotions'
          ? await db.rpc('save_promotion', {
              record_data: record,
              product_ids: editing.product_ids || [],
            })
          : await db.from(table).upsert(record)
      if (result.error)
        throw new Error(
          result.error.code === '23505'
            ? 'Nama slug sudah dipakai.'
            : 'Data belum tersimpan. Periksa isian dan izin akses.',
        )
      setEditing(null)
      onSaved(`${config.title} berhasil disimpan.`)
    } catch (e) {
      if (uploaded.length) await db.storage.from('product-images').remove(uploaded)
      setError(e instanceof Error ? e.message : 'Gagal menyimpan.')
    } finally {
      setBusy(false)
    }
  }
  const shown = rows.filter((r) =>
    String(r[config.labelKey]).toLowerCase().includes(search.toLowerCase()),
  )
  return (
    <>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-extrabold tracking-tight">{config.title}</h1>
        {!readOnly && (
          <Button onClick={() => open(table === 'store_settings' ? rows[0] : undefined)}>
            <Plus size={16} />
            {table === 'store_settings'
              ? 'Ubah pengaturan'
              : `Tambah ${config.title.toLowerCase()}`}
          </Button>
        )}
      </div>
      {table !== 'store_settings' && (
        <>
          <label className="sr-only" htmlFor={`search-${table}`}>
            Cari {config.title}
          </label>
          <input
            id={`search-${table}`}
            className={`${inputClass} mb-5 max-w-sm`}
            placeholder={`Cari ${config.title.toLowerCase()}…`}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </>
      )}
      {shown.length ? (
        <div className="overflow-hidden rounded-xl border border-line bg-white">
          {shown.map((row) => (
            <div
              key={String(row.id)}
              className="flex flex-wrap items-center justify-between gap-3 border-b border-line p-5 last:border-0"
            >
              <div className="min-w-0">
                <h2 className="text-sm font-bold">{String(row[config.labelKey])}</h2>
                <p className="mt-1 text-xs text-muted">
                  {table === 'reviews'
                    ? row.is_approved && row.permission_to_publish
                      ? 'Dipublikasikan'
                      : 'Belum dipublikasikan'
                    : table === 'store_settings'
                      ? 'Informasi publik toko'
                      : row.is_active
                        ? 'Aktif'
                        : 'Nonaktif'}
                </p>
              </div>
              {!readOnly && (
                <Button secondary onClick={() => open(row)} className="!px-3 !py-2 !text-xs">
                  <Pencil size={14} />
                  Ubah
                </Button>
              )}
            </div>
          ))}
        </div>
      ) : (
        <EmptyState
          compact
          title={`Belum ada ${config.title.toLowerCase()}.`}
          description="Tambahkan data asli untuk mulai mengelola konten ini."
        />
      )}
      {!readOnly && (
        <Dialog
          open={editing !== null}
          onClose={() => {
            if (!busy) setEditing(null)
          }}
          title={
            editing?.id
              ? `Ubah ${config.title.toLowerCase()}`
              : `Tambah ${config.title.toLowerCase()}`
          }
          wide
        >
          <form onSubmit={save} className="space-y-5">
            <fieldset disabled={busy} className="space-y-5">
              {table === 'brands' && (
                <Field label="Gunakan brand & logo bawaan (opsional)" htmlFor="preset-brand">
                  <select
                    id="preset-brand"
                    className={inputClass}
                    defaultValue=""
                    onChange={(e) => {
                      const brand = catalogBrands.find((b) => b.slug === e.target.value)
                      if (brand)
                        setEditing({
                          ...editing,
                          name: brand.name,
                          slug: brand.slug,
                          logo_path: brand.logo_path,
                        })
                    }}
                  >
                    <option value="">Brand manual / pilih dari referensi</option>
                    {catalogBrands.map((b) => (
                      <option value={b.slug} key={b.slug}>
                        {b.name}
                      </option>
                    ))}
                  </select>
                </Field>
              )}
              {config.fields.map((f) => (
                <Field key={f.key} label={f.label} htmlFor={`edit-${f.key}`}>
                  {f.type === 'checkbox' ? (
                    <input
                      id={`edit-${f.key}`}
                      className="size-5 accent-navy"
                      type="checkbox"
                      checked={Boolean(editing?.[f.key])}
                      onChange={(e) => setEditing({ ...editing, [f.key]: e.target.checked })}
                    />
                  ) : f.type === 'image' ? (
                    <>
                      {(Boolean(editing?.[f.key]) || Boolean(files[f.key])) && (
                        <div className="mb-4 max-w-xs">
                          <ImagePreview
                            src={editing?.[f.key] ? imageUrl(String(editing[f.key])) : undefined}
                            file={files[f.key]}
                            alt={f.label}
                            disabled={busy}
                            onRemove={() => {
                              setEditing({ ...editing, [f.key]: '' })
                              setFiles((previous) => {
                                const copy = { ...previous }
                                delete copy[f.key]
                                return copy
                              })
                            }}
                          />
                        </div>
                      )}
                      <FileDropzone
                        id={`edit-${f.key}`}
                        files={files[f.key] ? [files[f.key]] : []}
                        disabled={busy}
                        hint="JPG, PNG, atau WebP · maks. 5 MB · satu file."
                        onFiles={(selected) => {
                          if (selected[0]) setFiles({ ...files, [f.key]: selected[0] })
                        }}
                      />
                    </>
                  ) : f.type === 'textarea' ? (
                    <textarea
                      id={`edit-${f.key}`}
                      required={f.required}
                      rows={4}
                      maxLength={6000}
                      className={inputClass}
                      value={String(editing?.[f.key] || '')}
                      onChange={(e) =>
                        setEditing({
                          ...editing,
                          [f.key]: e.target.value,
                          ...(f.key === 'name' && !editing?.id
                            ? { slug: slugify(e.target.value) }
                            : {}),
                        })
                      }
                    />
                  ) : (
                    <input
                      id={`edit-${f.key}`}
                      required={f.required}
                      type={f.type || 'text'}
                      className={inputClass}
                      maxLength={500}
                      value={String(editing?.[f.key] ?? '')}
                      onChange={(e) =>
                        setEditing({
                          ...editing,
                          [f.key]: e.target.value,
                          ...(f.key === 'name' && !editing?.id
                            ? { slug: slugify(e.target.value) }
                            : {}),
                        })
                      }
                    />
                  )}
                </Field>
              ))}
              {table === 'promotions' && (
                <fieldset className="space-y-2">
                  <legend className="mb-2 text-xs font-bold">Unit yang mengikuti promo</legend>
                  {products
                    .filter((p) => p.status !== 'archived' && p.status !== 'draft')
                    .map((p) => (
                      <label key={p.id} className="flex min-h-10 items-center gap-3 text-xs">
                        <input
                          type="checkbox"
                          className="size-4 accent-navy"
                          checked={((editing?.product_ids as string[]) || []).includes(p.id)}
                          onChange={(e) =>
                            setEditing({
                              ...editing,
                              product_ids: e.target.checked
                                ? [...((editing?.product_ids as string[]) || []), p.id]
                                : ((editing?.product_ids as string[]) || []).filter(
                                    (id) => id !== p.id,
                                  ),
                            })
                          }
                        />
                        {p.name} · {p.sku}
                      </label>
                    ))}
                  <p className="text-xs leading-6 text-muted">
                    Promo hanya tampil dalam periode aktif dan bila unit terkait masih tersedia.
                  </p>
                </fieldset>
              )}
            </fieldset>
            {error && (
              <p role="alert" className="rounded-lg bg-danger/5 p-4 text-xs text-danger">
                {error}
              </p>
            )}
            <div className="flex gap-3">
              <Button disabled={busy}>{busy ? 'Menyimpan…' : 'Simpan'}</Button>
              <Button type="button" secondary disabled={busy} onClick={() => setEditing(null)}>
                Batal
              </Button>
            </div>
          </form>
        </Dialog>
      )}
    </>
  )
}
