import { useEffect, useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Link } from 'react-router-dom'
import { ArrowUpRight, ImagePlus, Trash2 } from 'lucide-react'
import { Button, Field, FileDropzone, inputClass, Loading } from '../../components/ui'
import ImagePreview from '../../components/ImagePreview'
import { readProductDraft, writeProductDraft, clearProductDraft } from '../../lib/product-drafts'
import { imageUrl, requireSupabase } from '../../lib/supabase'
import { productSchema, validatePhoto, type ProductInput } from '../../lib/validation'
import { slugify } from '../../lib/utils'
import {
  CONDITIONS,
  RAM_OPTIONS,
  STORAGE_OPTIONS,
  COLOR_OPTIONS,
  gradeForCondition,
  conditionText,
} from '../../lib/catalog'
import type { Brand, Category, DeviceModel, Product, ProductImage } from '../../types'

export default function ProductEditor({
  product,
  brands,
  categories,
  models,
  onSaved,
  onCancel,
  onBusyChange,
  draftKey = '',
}: {
  product: Product | null
  brands: Brand[]
  categories: Category[]
  models: DeviceModel[]
  onSaved: () => void
  onCancel: () => void
  onBusyChange: (busy: boolean) => void
  draftKey?: string
}) {
  const [images, setImages] = useState<ProductImage[]>(product?.product_images || []),
    [files, setFiles] = useState<File[]>([]),
    [error, setError] = useState(''),
    [progress, setProgress] = useState(0)
  const value = (key: keyof Product) => (product?.[key] == null ? '' : String(product[key]))
  const {
    register,
    handleSubmit,
    setValue,
    getValues,
    reset,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<ProductInput>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      id: product?.id || crypto.randomUUID(),
      sku: product?.sku || `SD-${crypto.randomUUID().slice(0, 8).toUpperCase()}`,
      slug: value('slug'),
      name: value('name'),
      model: value('model'),
      model_id: product?.model_id || '',
      brand_id: value('brand_id'),
      category_id: value('category_id'),
      price: value('price'),
      storage_gb: value('storage_gb'),
      ram_gb: value('ram_gb'),
      color: value('color'),
      condition_grade: product?.condition_grade || 'B',
      condition_label: (product?.condition_label as ProductInput['condition_label']) || undefined,
      has_warranty: product?.has_warranty || false,
      condition_notes: value('condition_notes'),
      battery_health: value('battery_health'),
      accessories: value('accessories'),
      warranty_notes: value('warranty_notes'),
      screen_notes: value('screen_notes'),
      body_notes: value('body_notes'),
      network_notes: value('network_notes'),
      status: product?.status || 'draft',
      stock_quantity: product ? String(product.stock_quantity) : '1',
      is_featured: product?.is_featured || false,
    },
  })
  const brandId = watch('brand_id'),
    modelName = watch('model'),
    storage = watch('storage_gb')
  const availableModels = models.filter((m) => m.brand_id === brandId && m.is_active)
  const selectedModel =
    availableModels.find((m) => m.id === watch('model_id')) ||
    availableModels.find((m) => m.name === modelName)
  const [manualModel, setManualModel] = useState(
    Boolean(
      product && !models.some((m) => m.brand_id === product.brand_id && m.name === product.model),
    ),
  )
  const [modelSearch, setModelSearch] = useState('')
  const [draftReady, setDraftReady] = useState(!draftKey)
  const [draftMessage, setDraftMessage] = useState('')
  const cleared = useRef(false)
  const originalValues = useRef(getValues())
  const draftValues = watch()
  useEffect(() => {
    if (!draftKey) return
    let active = true
    readProductDraft(draftKey)
      .then((draft) => {
        if (!active) return
        if (draft) {
          reset(draft.values)
          setImages(draft.images)
          setFiles(draft.files)
          setManualModel(draft.manualModel)
          setDraftMessage('Draf sebelumnya dipulihkan, termasuk foto yang dipilih.')
        }
      })
      .catch(() => {
        if (active)
          setDraftMessage(
            'Penyimpanan draf tidak tersedia. Hindari menutup modal sebelum menyimpan.',
          )
      })
      .finally(() => {
        if (active) setDraftReady(true)
      })
    return () => {
      active = false
    }
  }, [draftKey, reset])
  useEffect(() => {
    if (!draftKey || !draftReady || cleared.current) return
    void writeProductDraft(draftKey, { values: getValues(), images, files, manualModel }).catch(
      () => {
        setDraftMessage(
          'Draf belum tersimpan di perangkat. Hindari menutup modal sebelum menyimpan.',
        )
      },
    )
  }, [draftKey, draftReady, draftValues, images, files, manualModel, getValues])
  async function discardDraft() {
    if (!window.confirm('Buang draf dan foto yang belum disimpan?')) return
    cleared.current = true
    try {
      if (draftKey) await clearProductDraft(draftKey)
      reset(originalValues.current)
      setImages(product?.product_images || [])
      setFiles([])
      setManualModel(Boolean(product && !product.model_id))
      setDraftMessage('Draf dibuang. Formulir dikembalikan ke data awal.')
    } catch {
      setDraftMessage('Draf belum dapat dibuang. Silakan coba lagi.')
    } finally {
      cleared.current = false
    }
  }

  const filteredModels = availableModels.filter(
    (m) => m.id === selectedModel?.id || m.name.toLowerCase().includes(modelSearch.toLowerCase()),
  )
  const ramOptions =
    selectedModel?.variants.length && storage
      ? [
          ...new Set(
            selectedModel.variants
              .filter((v) => v.storage_gb === Number(storage))
              .map((v) => v.ram_gb)
              .filter((n): n is number => n !== null),
          ),
        ]
      : selectedModel?.ram_options.length
        ? selectedModel.ram_options
        : RAM_OPTIONS
  function pickModel(id: string) {
    if (id === 'manual') {
      setManualModel(true)
      setValue('model_id', '')
      setValue('model', '')
      setValue('name', '')
      setValue('color', '')
      setValue('ram_gb', '')
      setValue('storage_gb', '')
      setValue('category_id', '')
      return
    }
    const model = availableModels.find((m) => m.id === id)
    if (!model) return
    setManualModel(false)
    setValue('model_id', model.id)
    setValue('model', model.name)
    setValue('name', model.name)
    setValue('category_id', model.category_id)
    setValue(
      'storage_gb',
      model.storage_options.length === 1 ? String(model.storage_options[0]) : '',
    )
    setValue('ram_gb', model.ram_options.length === 1 ? String(model.ram_options[0]) : '')
    setValue('color', model.color_options.length === 1 ? model.color_options[0] : '')
    if (!product) setValue('slug', `${slugify(model.name)}-${getValues('id').slice(0, 8)}`)
  }
  useEffect(() => {
    onBusyChange(isSubmitting)
    return () => onBusyChange(false)
  }, [isSubmitting, onBusyChange])
  async function save(values: ProductInput) {
    const db = requireSupabase(),
      uploaded: string[] = []
    setError('')
    setProgress(0)
    try {
      const nextImages = [...images]
      if (
        values.status !== 'draft' &&
        values.status !== 'archived' &&
        images.length + files.length === 0
      )
        throw new Error('Tambahkan foto unit asli sebelum dipublikasikan.')
      for (let i = 0; i < files.length; i++) {
        const file = files[i],
          ext = (
            { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' } as Record<
              string,
              string
            >
          )[file.type]
        const path = `products/${values.id}/${crypto.randomUUID()}.${ext}`
        const { error: uploadError } = await db.storage
          .from('product-images')
          .upload(path, file, { upsert: false, contentType: file.type })
        if (uploadError) throw new Error('Foto gagal diunggah. Periksa koneksi dan izin Storage.')
        uploaded.push(path)
        nextImages.push({
          storage_path: path,
          alt_text: `${values.name} — foto unit ${images.length + i + 1}`,
          sort_order: nextImages.length,
          is_primary: nextImages.length === 0,
        })
        setProgress(Math.round(((i + 1) / files.length) * 90))
      }
      const record = {
        ...values,
        model_id: values.model_id || null,
        condition_grade: values.condition_label
          ? gradeForCondition(values.condition_label)
          : values.condition_grade,
        price: Number(values.price),
        storage_gb: values.storage_gb ? Number(values.storage_gb) : null,
        ram_gb: values.ram_gb ? Number(values.ram_gb) : null,
        battery_health: values.battery_health ? Number(values.battery_health) : null,
        stock_quantity: values.status === 'sold' ? 0 : Number(values.stock_quantity),
      }
      const normalizedImages = nextImages.map((im, i) => ({
        ...im,
        sort_order: i,
        is_primary: i === 0,
      }))
      const { error: saveError } = await db.rpc('save_product_v2', {
        record_data: record,
        image_data: normalizedImages,
      })
      if (saveError)
        throw new Error(
          saveError.code === '23505'
            ? 'SKU atau slug sudah digunakan oleh unit lain.'
            : saveError.code === 'PGRST202'
              ? 'Jalankan migration katalog terbaru terlebih dahulu.'
              : 'Produk belum tersimpan. Periksa isian, konfigurasi database, dan izin admin.',
        )
      const removed = (product?.product_images || [])
        .filter((im) => !images.some((existing) => existing.storage_path === im.storage_path))
        .map((im) => im.storage_path)
      if (removed.length)
        await db.storage
          .from('product-images')
          .remove(removed)
          .catch(() => {})
      setProgress(100)
      cleared.current = true
      if (draftKey) await clearProductDraft(draftKey).catch(() => {})
      onSaved()
    } catch (e) {
      if (uploaded.length) await db.storage.from('product-images').remove(uploaded)
      setError(e instanceof Error ? e.message : 'Produk gagal disimpan.')
    }
  }
  if (!draftReady) return <Loading label="Memulihkan draf produk..." />
  return (
    <form onSubmit={handleSubmit(save)} className="space-y-7" noValidate>
      {draftKey && (
        <div
          role="status"
          className="rounded-lg border border-line bg-paper p-3 text-xs leading-6 text-muted"
        >
          {draftMessage ||
            'Draf dan foto disimpan otomatis di perangkat ini. Buka kembali produk yang sama untuk melanjutkan.'}
        </div>
      )}
      <fieldset disabled={isSubmitting} className="space-y-7">
        <div className="rounded-xl border border-line bg-paper/60 p-5">
          <p className="mb-5 text-xs font-bold uppercase tracking-wider text-muted">
            01 / Pilih perangkat
          </p>
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Brand" htmlFor="product-brand" error={errors.brand_id?.message}>
              <select
                id="product-brand"
                className={inputClass}
                {...register('brand_id')}
                onChange={(e) => {
                  setValue('brand_id', e.target.value, { shouldValidate: true })
                  setValue('model_id', '')
                  setValue('model', '')
                  setValue('name', '')
                  setValue('category_id', '')
                  setValue('color', '')
                  setValue('storage_gb', '')
                  setValue('ram_gb', '')
                  setManualModel(false)
                  setModelSearch('')
                }}
              >
                <option value="">Pilih brand terlebih dahulu</option>
                {brands
                  .filter((b) => b.is_active || b.id === brandId)
                  .map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
              </select>
            </Field>
            <Field label="Model" htmlFor="product-model-choice" error={errors.model?.message}>
              <select
                id="product-model-choice"
                className={inputClass}
                disabled={!brandId}
                value={manualModel ? 'manual' : selectedModel?.id || ''}
                onChange={(e) => pickModel(e.target.value)}
              >
                <option value="">Pilih model</option>
                {filteredModels.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
                <option value="manual">Model lain / tambah manual</option>
              </select>
            </Field>
            {brandId && availableModels.length > 8 && (
              <Field label="Cari model dalam daftar" htmlFor="model-search">
                <input
                  id="model-search"
                  type="search"
                  className={inputClass}
                  placeholder="Contoh: iPhone 13"
                  value={modelSearch}
                  onChange={(e) => setModelSearch(e.target.value)}
                />
              </Field>
            )}
            {manualModel && (
              <Field label="Nama model baru" htmlFor="product-model" error={errors.model?.message}>
                <input
                  id="product-model"
                  className={inputClass}
                  {...register('model')}
                  onChange={(e) => {
                    setValue('model', e.target.value)
                    setValue('name', e.target.value)
                    if (!product)
                      setValue('slug', slugify(e.target.value) + '-' + getValues('id').slice(0, 8))
                  }}
                />
              </Field>
            )}
            <Field label="Kategori" htmlFor="product-category" error={errors.category_id?.message}>
              <select
                id="product-category"
                className={inputClass}
                {...register('category_id')}
                disabled={Boolean(selectedModel && !manualModel)}
              >
                <option value="">Pilih kategori</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </Field>
          </div>
          {selectedModel?.source_url && (
            <a
              href={selectedModel.source_url}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 inline-flex min-h-10 items-center gap-2 text-[11px] text-muted underline"
            >
              Referensi spesifikasi produsen
              <ArrowUpRight size={12} />
            </a>
          )}
          <p className="mt-2 text-[11px] leading-6 text-muted">
            Pilihan spesifikasi adalah referensi. Pilih konfigurasi yang sesuai unit masuk; bukan
            seluruh varian berarti ada stok.
          </p>
        </div>
        <div>
          <p className="mb-5 text-xs font-bold uppercase tracking-wider text-muted">
            02 / Varian & kondisi unit
          </p>
          <div className="grid gap-5 sm:grid-cols-2">
            <SpecChoice
              label="Penyimpanan"
              name="storage_gb"
              value={watch('storage_gb')}
              options={(selectedModel?.storage_options.length
                ? selectedModel.storage_options
                : STORAGE_OPTIONS
              ).map((n) => String(n))}
              suffix=" GB"
              error={errors.storage_gb?.message}
              onChange={(v) => {
                setValue('storage_gb', v, { shouldValidate: true })
                const rams =
                  selectedModel?.variants
                    .filter((x) => x.storage_gb === Number(v))
                    .map((x) => x.ram_gb) || []
                if (rams.length === 1) setValue('ram_gb', rams[0] === null ? '' : String(rams[0]))
                else if (rams.length && !rams.includes(Number(getValues('ram_gb'))))
                  setValue('ram_gb', '')
              }}
            />
            <SpecChoice
              label="RAM (opsional)"
              name="ram_gb"
              value={watch('ram_gb')}
              options={ramOptions.map((n) => String(n))}
              suffix=" GB"
              error={errors.ram_gb?.message}
              onChange={(v) => setValue('ram_gb', v, { shouldValidate: true })}
            />
            <SpecChoice
              label="Warna unit"
              name="color"
              value={watch('color')}
              options={
                selectedModel?.color_options.length ? selectedModel.color_options : COLOR_OPTIONS
              }
              error={errors.color?.message}
              onChange={(v) => setValue('color', v, { shouldValidate: true })}
            />
            <Field
              label="Kondisi"
              htmlFor="product-condition"
              error={errors.condition_label?.message}
            >
              <select
                id="product-condition"
                className={inputClass}
                {...register('condition_label')}
              >
                <option value="">Pilih kondisi unit</option>
                {CONDITIONS.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
              {product && !product.condition_label && (
                <p className="mt-2 text-xs text-muted">
                  Data lama: {conditionText(product)}. Tentukan kondisi yang sesuai setelah
                  memeriksa unit.
                </p>
              )}
            </Field>
            <Field label="Harga jual (Rp)" htmlFor="product-price" error={errors.price?.message}>
              <input
                id="product-price"
                type="number"
                min="0"
                className={inputClass}
                placeholder="Contoh: 6500000"
                {...register('price')}
              />
            </Field>
            <Field
              label="Battery health (%, opsional)"
              htmlFor="product-battery"
              error={errors.battery_health?.message}
            >
              <input
                id="product-battery"
                type="number"
                min="0"
                max="100"
                className={inputClass}
                placeholder="Kosongkan jika belum diperiksa"
                {...register('battery_health')}
              />
            </Field>
            <Field label="Status stok" htmlFor="product-status">
              <select id="product-status" className={inputClass} {...register('status')}>
                <option value="draft">Draft</option>
                <option value="available">Tersedia</option>
                <option value="reserved">Dipesan</option>
                <option value="sold">Terjual</option>
                <option value="archived">Diarsipkan</option>
              </select>
            </Field>
            <Field label="Garansi unit" htmlFor="warranty-choice">
              <select
                id="warranty-choice"
                className={inputClass}
                value={
                  !watch('has_warranty')
                    ? 'none'
                    : /^Garansi toko \d+ hari/.test(watch('warranty_notes'))
                      ? watch('warranty_notes').match(/\d+/)?.[0]
                      : 'custom'
                }
                onChange={(e) => {
                  setValue('has_warranty', e.target.value !== 'none')
                  setValue(
                    'warranty_notes',
                    e.target.value === 'none'
                      ? ''
                      : e.target.value === 'custom'
                        ? ''
                        : 'Garansi toko ' + e.target.value + ' hari sejak tanggal transaksi.',
                  )
                }}
              >
                <option value="none">Tidak ada / belum dikonfirmasi</option>
                {[7, 14, 30, 90, 180, 365].map((d) => (
                  <option key={d} value={d}>
                    Garansi toko {d} hari
                  </option>
                ))}
                <option value="custom">Garansi resmi / ketentuan lain</option>
              </select>
            </Field>
          </div>
        </div>
        <Field
          label="Catatan kondisi unit"
          htmlFor="product-condition-notes"
          error={errors.condition_notes?.message}
        >
          <textarea
            id="product-condition-notes"
            rows={3}
            className={inputClass}
            placeholder="Tuliskan kondisi fisik dan kekurangan unit yang ditemukan saat pemeriksaan."
            {...register('condition_notes')}
          />
        </Field>
        {watch('has_warranty') && (
          <Field
            label="Ketentuan garansi yang berlaku"
            htmlFor="product-warranty"
            error={errors.warranty_notes?.message}
          >
            <textarea
              id="product-warranty"
              rows={2}
              className={inputClass}
              {...register('warranty_notes')}
            />
            <p className="mt-2 text-xs text-muted">
              Unit ini akan muncul di koleksi bergaransi. Pastikan ketentuannya benar dan jelaskan
              cakupannya.
            </p>
          </Field>
        )}
        <details
          className="rounded-xl border border-line p-5"
          open={Boolean(errors.name || errors.sku || errors.slug || errors.stock_quantity)}
        >
          <summary className="cursor-pointer text-sm font-bold">
            Detail tambahan & kode otomatis
          </summary>
          <div className="mt-5 grid gap-5 sm:grid-cols-2">
            {(
              [
                ['name', 'Nama tampilan'],
                ['sku', 'SKU otomatis'],
                ['slug', 'Slug otomatis'],
                ['stock_quantity', 'Jumlah unit'],
              ] as const
            ).map(([key, label]) => (
              <Field
                key={key}
                label={label}
                htmlFor={'product-' + key}
                error={errors[key]?.message}
              >
                <input
                  id={'product-' + key}
                  className={inputClass}
                  type={key === 'stock_quantity' ? 'number' : 'text'}
                  {...register(key)}
                />
              </Field>
            ))}
            {(
              [
                ['screen_notes', 'Kondisi layar'],
                ['body_notes', 'Kondisi bodi'],
                ['network_notes', 'Status jaringan'],
                ['accessories', 'Kelengkapan'],
              ] as const
            ).map(([key, label]) => (
              <Field key={key} label={label} htmlFor={'product-' + key}>
                <textarea
                  id={'product-' + key}
                  rows={2}
                  className={inputClass}
                  {...register(key)}
                />
              </Field>
            ))}
          </div>
        </details>
        <label className="flex items-center gap-3 text-sm">
          <input type="checkbox" className="size-4 accent-navy" {...register('is_featured')} />
          Tandai sebagai produk pilihan
        </label>
        <div>
          <h3 className="text-sm font-bold">Foto unit asli</h3>
          <p className="my-2 text-xs leading-6 text-muted">
            Foto pertama menjadi foto utama. Maks. 12 foto, 5 MB per file. Hindari IMEI, serial, dan
            data pemilik.
          </p>
          <div className="my-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
            {images.map((im, i) => (
              <div key={im.storage_path} className="rounded-lg border border-line p-2">
                <img
                  src={imageUrl(im.storage_path)}
                  alt={im.alt_text}
                  width="200"
                  height="150"
                  className="h-28 w-full object-contain"
                />
                <label className="sr-only" htmlFor={`alt-${i}`}>
                  Deskripsi foto {i + 1}
                </label>
                <input
                  id={`alt-${i}`}
                  className={`${inputClass} mt-2 !text-xs`}
                  maxLength={250}
                  value={im.alt_text}
                  onChange={(e) =>
                    setImages(
                      images.map((x, n) => (n === i ? { ...x, alt_text: e.target.value } : x)),
                    )
                  }
                />
                <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                  <button
                    type="button"
                    className="min-h-10 text-[10px] font-bold"
                    disabled={i === 0}
                    onClick={() => setImages([im, ...images.filter((_, n) => n !== i)])}
                  >
                    {i === 0 ? 'Utama' : 'Jadikan utama'}
                  </button>
                  <button
                    type="button"
                    aria-label={`Hapus foto ${i + 1}`}
                    className="flex min-h-11 items-center justify-center gap-2 rounded-md border border-danger/20 px-3 text-xs font-bold text-danger hover:bg-danger/5"
                    onClick={() => setImages(images.filter((_, n) => n !== i))}
                  >
                    <Trash2 size={15} /> Hapus gambar
                  </button>
                </div>
              </div>
            ))}
          </div>
          <div className="mb-2 flex items-center gap-2 text-xs font-bold">
            <ImagePlus size={16} />
            Tambah foto
          </div>
          <FileDropzone
            id="unit-photos"
            files={files}
            multiple
            disabled={isSubmitting}
            hint="JPG, PNG, atau WebP · maks. 5 MB per foto · hingga 12 foto per unit."
            onFiles={(chosen) => {
              const invalid = chosen.map(validatePhoto).find(Boolean)
              if (invalid || images.length + files.length + chosen.length > 12) {
                setError(invalid || 'Maksimum 12 foto per unit.')
              } else {
                setError('')
                setFiles((current) => [...current, ...chosen])
              }
            }}
          />
          {files.length > 0 && (
            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
              {files.map((file, index) => (
                <ImagePreview
                  key={`${file.name}-${file.lastModified}-${index}`}
                  file={file}
                  alt={`foto baru ${index + 1}`}
                  disabled={isSubmitting}
                  onRemove={() =>
                    setFiles((current) => current.filter((_, position) => position !== index))
                  }
                />
              ))}
            </div>
          )}
          {files.length > 0 && (
            <p className="mt-2 text-xs text-muted">
              {files.length} foto baru akan diunggah saat menyimpan.
            </p>
          )}
        </div>
      </fieldset>
      {isSubmitting && (
        <div role="status" className="text-xs text-muted">
          Menyimpan… {progress}%
          <progress value={progress} max="100" className="mt-2 block w-full accent-navy" />
        </div>
      )}
      {error && (
        <p role="alert" className="rounded-lg bg-danger/5 p-4 text-xs text-danger">
          {error}
        </p>
      )}
      <div className="flex flex-wrap gap-3">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Menyimpan…' : 'Simpan unit'}
        </Button>
        <Button type="button" secondary disabled={isSubmitting} onClick={onCancel}>
          Tutup (simpan draf)
        </Button>
        {draftKey && (
          <Button
            type="button"
            secondary
            className="!text-danger"
            disabled={isSubmitting}
            onClick={() => void discardDraft()}
          >
            Buang draf
          </Button>
        )}
        {product && ['available', 'reserved', 'sold'].includes(product.status) && (
          <Link
            to={`/gadget/${product.slug}`}
            target="_blank"
            className="inline-flex items-center gap-2 px-2 text-xs font-bold"
          >
            Lihat publik
            <ArrowUpRight size={15} />
          </Link>
        )}
      </div>
    </form>
  )
}

function SpecChoice({
  label,
  name,
  value,
  options,
  onChange,
  error,
  suffix = '',
}: {
  label: string
  name: string
  value: string
  options: string[]
  onChange: (value: string) => void
  error?: string
  suffix?: string
}) {
  const [custom, setCustom] = useState(Boolean(value && !options.includes(value)))
  useEffect(() => {
    setCustom(Boolean(value && !options.includes(value)))
  }, [options.join('|')])
  return (
    <Field label={label} htmlFor={'spec-' + name} error={error}>
      <select
        id={'spec-' + name}
        className={inputClass}
        value={custom ? 'custom' : value}
        onChange={(e) => {
          if (e.target.value === 'custom') {
            setCustom(true)
            onChange('')
          } else {
            setCustom(false)
            onChange(e.target.value)
          }
        }}
      >
        <option value="">Pilih / belum dicatat</option>
        {options.map((v) => (
          <option key={v} value={v}>
            {v}
            {suffix}
          </option>
        ))}
        <option value="custom">Varian lain (isi manual)</option>
      </select>
      {custom && (
        <>
          <label className="sr-only" htmlFor={'custom-' + name}>
            Varian lain {label}
          </label>
          <input
            id={'custom-' + name}
            className={inputClass + ' mt-2'}
            type={suffix ? 'number' : 'text'}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={label}
          />
        </>
      )}
    </Field>
  )
}
