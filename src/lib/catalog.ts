import reference from '../data/device-catalog.json'
import type { Brand, Category, DeviceModel, Product } from '../types'

export const CONDITIONS = [
  'Sangat Baik',
  'Baik',
  'Like New',
  'Brand New In Box',
  'Brand New Open Box',
] as const
export const RAM_OPTIONS = [2, 3, 4, 6, 8, 12, 16, 18, 24, 32, 36, 48, 64, 96, 128]
export const STORAGE_OPTIONS = [16, 32, 64, 128, 256, 512, 1024, 2048, 4096, 8192]
export const COLOR_OPTIONS = [
  'Hitam',
  'Putih',
  'Silver',
  'Abu-abu',
  'Biru',
  'Hijau',
  'Merah',
  'Pink',
  'Ungu',
  'Gold',
  'Kuning',
  'Oranye',
]
export const conditionText = (p: Pick<Product, 'condition_label' | 'condition_grade'>) =>
  p.condition_label || `Grade ${p.condition_grade}`
export const gradeForCondition = (condition: string): 'A' | 'B' | 'C' =>
  condition === 'Baik' ? 'B' : 'A'
export const isUsed = (p: Product) => !p.condition_label?.startsWith('Brand New')
export const isWarranted = (p: Product) =>
  p.has_warranty === true && Boolean(p.warranty_notes.trim())
export const availableUnits = (products: Product[]) =>
  products.filter((p) => p.status === 'available' && p.stock_quantity > 0)
export const catalogBrands: Brand[] = reference.brands
export const catalogCategories: Category[] = reference.categories
export function referenceModels(brands: Brand[], categories: Category[]): DeviceModel[] {
  return reference.models.flatMap((model) => {
    const brand = brands.find((b) => b.slug === model.brand_slug),
      category = categories.find((c) => c.slug === model.category_slug)
    return brand && category ? [{ ...model, brand_id: brand.id, category_id: category.id }] : []
  })
}
export function brandLogo(brand: Pick<Brand, 'slug' | 'logo_path'>) {
  return brand.logo_path || catalogBrands.find((b) => b.slug === brand.slug)?.logo_path || ''
}
