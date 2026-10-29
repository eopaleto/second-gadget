import type { Product, Promotion } from '../types'
import { isUsed, isWarranted } from './catalog'
export const rupiah = (value: number) =>
  new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(value)
export const dateLabel = (value: string) =>
  new Intl.DateTimeFormat('id-ID', { dateStyle: 'long', timeZone: 'Asia/Jakarta' }).format(
    new Date(value),
  )
export function normalizePhone(value: string) {
  const phone = value.replace(/[\s()+.-]/g, '').replace(/^0/, '62')
  return /^628\d{7,11}$/.test(phone) ? phone : null
}
export function whatsappLink(
  number: string,
  message = 'Halo Second Device, saya ingin bertanya tentang gadget second.',
) {
  const phone = normalizePhone(number)
  return phone ? `https://wa.me/${phone}?text=${encodeURIComponent(message)}` : null
}
export function safeHttpUrl(value: string) {
  try {
    const url = new URL(value)
    return ['https:', 'http:'].includes(url.protocol) ? url.href : null
  } catch {
    return null
  }
}
export function activePromotions(promos: Promotion[], products: Product[], now = Date.now()) {
  return promos.filter(
    (p) =>
      p.is_active &&
      Date.parse(p.start_at) <= now &&
      Date.parse(p.end_at) > now &&
      p.promotion_products.some((link) =>
        products.some(
          (unit) =>
            unit.id === link.product_id && unit.status === 'available' && unit.stock_quantity > 0,
        ),
      ),
  )
}
const normalized = (value: string) =>
  value
    .toLowerCase()
    .replace(/\biphone\s*(\d+)/g, 'iphone $1')
    .replace(/(\d)\s*gb\b/g, '$1')
    .replace(/\s+/g, ' ')
    .trim()
export function filterProducts(products: Product[], params: URLSearchParams) {
  const words = normalized(params.get('q') || '')
    .split(' ')
    .filter(Boolean)
  const brands = params.getAll('brand')
  const min = params.get('min'),
    max = params.get('max'),
    battery = params.get('battery')
  const result = products.filter((p) => {
    if (!['available', 'reserved'].includes(p.status)) return false
    const haystack = normalized(
      `${p.name} ${p.model} ${p.brands?.name ?? ''} ${p.color} ${p.storage_gb ?? ''}`,
    )
    return (
      words.every((word) => haystack.includes(word)) &&
      (!brands.length || brands.includes(p.brands?.slug ?? '')) &&
      (!params.get('category') || p.categories?.slug === params.get('category')) &&
      (!min || p.price >= Number(min)) &&
      (!max || p.price <= Number(max)) &&
      (!params.get('storage') || p.storage_gb === Number(params.get('storage'))) &&
      (!params.get('grade') || p.condition_grade === params.get('grade')) &&
      (!params.get('condition') || p.condition_label === params.get('condition')) &&
      (!params.get('color') || p.color === params.get('color')) &&
      (params.get('used') !== '1' || isUsed(p)) &&
      (!params.get('collection') ||
        (isUsed(p) &&
          isWarranted(p) &&
          p.status === 'available' &&
          (
            { phone: ['iphone', 'android'], tablet: ['tablet'], laptop: ['laptop'] } as Record<
              string,
              string[]
            >
          )[params.get('collection')!]?.includes(p.categories?.slug || ''))) &&
      (!params.get('status') || p.status === params.get('status')) &&
      (!battery || (p.battery_health !== null && p.battery_health >= Number(battery)))
    )
  })
  const sort = params.get('sort') || 'newest'
  return result.sort((a, b) =>
    sort === 'price-asc'
      ? a.price - b.price
      : sort === 'price-desc'
        ? b.price - a.price
        : sort === 'name'
          ? a.name.localeCompare(b.name, 'id')
          : Date.parse(b.created_at) - Date.parse(a.created_at),
  )
}
export const stockLabel = {
  draft: 'Draft',
  available: 'Tersedia',
  reserved: 'Dipesan',
  sold: 'Terjual',
  archived: 'Diarsipkan',
}
export const slugify = (text: string) =>
  text
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
