export type StockStatus = 'draft' | 'available' | 'reserved' | 'sold' | 'archived'
export interface Brand {
  id: string
  name: string
  slug: string
  logo_path: string | null
  is_active: boolean
  sort_order: number
}
export interface Category {
  id: string
  name: string
  slug: string
  is_active: boolean
}
export interface ProductImage {
  id?: string
  product_id?: string
  storage_path: string
  alt_text: string
  sort_order: number
  is_primary: boolean
}
export interface Product {
  id: string
  sku: string
  slug: string
  brand_id: string
  category_id: string
  name: string
  model: string
  model_id?: string | null
  price: number
  storage_gb: number | null
  ram_gb: number | null
  color: string
  condition_grade: 'A' | 'B' | 'C'
  condition_label?: string | null
  has_warranty?: boolean
  sold_at?: string | null
  condition_notes: string
  battery_health: number | null
  accessories: string
  warranty_notes: string
  screen_notes: string
  body_notes: string
  network_notes: string
  status: StockStatus
  stock_quantity: number
  is_featured: boolean
  created_at: string
  updated_at: string
  brands?: Brand
  categories?: Category
  product_images: ProductImage[]
}
export interface Promotion {
  id: string
  title: string
  slug: string
  description: string
  banner_path: string | null
  terms: string
  start_at: string
  end_at: string
  is_active: boolean
  promotion_products: { product_id: string }[]
}
export interface Review {
  id: string
  display_name: string
  rating: number | null
  body: string
  source: string
  permission_to_publish: boolean
  is_approved: boolean
  created_at: string
}
export interface StoreSettings {
  id?: string
  store_name: string
  tagline: string
  whatsapp_number: string
  instagram_url: string
  address: string
  google_maps_url: string
  opening_hours: string
  logo_path: string
  about_text: string
  facebook_url?: string
  tiktok_url?: string
  youtube_url?: string
  payment_methods?: string[]
}
export interface DeviceModel {
  id: string
  brand_id: string
  category_id: string
  name: string
  storage_options: number[]
  ram_options: number[]
  color_options: string[]
  variants: { storage_gb: number; ram_gb: number | null }[]
  source_url: string
  is_active: boolean
}
export interface TradeIn {
  id: string
  reference_code: string
  name: string
  phone: string
  brand: string
  model: string
  storage_gb: number | null
  condition_notes: string
  accessories: string
  notes: string
  photo_paths: string[]
  status: 'new' | 'processing' | 'completed' | 'rejected'
  admin_notes: string
  created_at: string
}
export interface AdminProfile {
  user_id: string
  display_name: string
  role: 'owner' | 'admin'
  created_at?: string
}
