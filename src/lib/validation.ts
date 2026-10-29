import { z } from 'zod'
import { normalizePhone, safeHttpUrl } from './utils'
import { CONDITIONS } from './catalog'

const requiredText = (label: string, max = 250) =>
  z.string().trim().min(1, `${label} wajib diisi`).max(max, `Maksimum ${max} karakter`)
export const tradeSchema = z.object({
  name: requiredText('Nama', 100),
  phone: z
    .string()
    .refine((v) => Boolean(normalizePhone(v)), 'Gunakan nomor WhatsApp Indonesia yang valid'),
  brand: requiredText('Brand', 80),
  model: requiredText('Model', 100),
  storage_gb: z
    .string()
    .max(6)
    .refine(
      (v) => !v || (/^\d+$/.test(v) && Number(v) > 0 && Number(v) <= 100000),
      'Isi kapasitas 1–100000 GB',
    ),
  condition_notes: requiredText('Kondisi', 2000),
  accessories: z.string().max(500),
  notes: z.string().max(2000),
  consent: z.boolean().refine(Boolean, 'Persetujuan diperlukan untuk menindaklanjuti pengajuan'),
  website: z.string().max(0),
})
export type TradeInput = z.infer<typeof tradeSchema>
const numericText = (min: number, max: number, optional = false) =>
  z
    .string()
    .refine(
      (v) =>
        (optional && v === '') ||
        (v.trim() !== '' && Number.isFinite(Number(v)) && Number(v) >= min && Number(v) <= max),
      `Isi angka ${min}–${max}`,
    )
export const productSchema = z
  .object({
    id: z.string(),
    sku: requiredText('SKU', 80),
    slug: requiredText('Slug', 160).regex(
      /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
      'Gunakan huruf kecil, angka, dan tanda -',
    ),
    name: requiredText('Nama', 160),
    model: requiredText('Model', 100),
    model_id: z.string().optional(),
    brand_id: z.string().uuid('Pilih brand'),
    category_id: z.string().uuid('Pilih kategori'),
    price: numericText(0, 1_000_000_000),
    storage_gb: numericText(1, 100000, true),
    ram_gb: numericText(1, 1000, true),
    color: requiredText('Warna', 80),
    condition_grade: z.enum(['A', 'B', 'C']),
    condition_label: z.enum(CONDITIONS, { error: 'Pilih kondisi unit.' }),
    has_warranty: z.boolean().optional(),
    condition_notes: requiredText('Kondisi', 4000),
    battery_health: numericText(0, 100, true),
    accessories: z.string().max(2000),
    warranty_notes: z.string().max(2000),
    screen_notes: z.string().max(2000),
    body_notes: z.string().max(2000),
    network_notes: z.string().max(2000),
    status: z.enum(['draft', 'available', 'reserved', 'sold', 'archived']),
    stock_quantity: numericText(0, 10000),
    is_featured: z.boolean(),
  })
  .refine((v) => !['available', 'reserved'].includes(v.status) || Number(v.stock_quantity) > 0, {
    message: 'Stok harus lebih dari 0 untuk unit tersedia atau dipesan',
    path: ['stock_quantity'],
  })
  .refine((v) => Number.isInteger(Number(v.stock_quantity)), {
    message: 'Stok harus berupa bilangan bulat',
    path: ['stock_quantity'],
  })
  .refine((v) => !v.has_warranty || Boolean(v.warranty_notes.trim()), {
    message: 'Jelaskan garansi yang benar-benar berlaku.',
    path: ['warranty_notes'],
  })
export type ProductInput = z.infer<typeof productSchema>
export function validatePhoto(file: File) {
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type))
    return 'Foto harus berupa JPG, PNG, atau WebP.'
  if (file.size > 5 * 1024 * 1024) return 'Setiap foto maksimum 5 MB.'
  return null
}
export function validateSettings(values: Record<string, unknown>) {
  if (!String(values.store_name || '').trim()) return 'Nama toko wajib diisi.'
  if (values.whatsapp_number && !normalizePhone(String(values.whatsapp_number)))
    return 'Nomor WhatsApp Indonesia tidak valid.'
  for (const key of [
    'instagram_url',
    'google_maps_url',
    'facebook_url',
    'tiktok_url',
    'youtube_url',
  ])
    if (values[key] && !safeHttpUrl(String(values[key])))
      return 'Tautan harus berupa URL http/https yang valid.'
  return null
}
