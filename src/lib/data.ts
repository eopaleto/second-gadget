import { useQuery } from '@tanstack/react-query'
import { supabase } from './supabase'
import { catalogBrands, catalogCategories } from './catalog'
import type { Brand, Category, Product, Promotion, Review, StoreSettings } from '../types'

export const defaults: StoreSettings = {
  store_name: 'Second Device',
  tagline: 'Jual Beli Gadget Second',
  whatsapp_number: '',
  instagram_url: '',
  address: '',
  google_maps_url: '',
  opening_hours: '',
  logo_path: '',
  about_text: '',
  facebook_url: '',
  tiktok_url: '',
  youtube_url: '',
  payment_methods: ['qris', 'bank', 'ewallet', 'visa', 'mastercard', 'kredivo'],
}
export const productSelect = '*,brands(*),categories(*),product_images(*)'
export async function readAll<T>(table: string, select = '*'): Promise<T[]> {
  if (!supabase) return []
  const rows: T[] = []
  for (let offset = 0; ; offset += 500) {
    const { data, error } = await supabase
      .from(table)
      .select(select)
      .order(table === 'admin_profiles' ? 'user_id' : 'id')
      .range(offset, offset + 499)
    if (error) throw error
    rows.push(...(data as unknown as T[]))
    if (data.length < 500) return rows
  }
}
export function useStore() {
  return useQuery({
    queryKey: ['store'],
    staleTime: 300_000,
    refetchOnWindowFocus: false,
    queryFn: async () => {
      const [products, brands, categories, promotions, reviews, settings] = await Promise.all([
        readAll<Product>('products', productSelect),
        readAll<Brand>('brands'),
        readAll<Category>('categories'),
        readAll<Promotion>('promotions', '*,promotion_products(product_id)'),
        readAll<Review>('reviews'),
        readAll<StoreSettings>('store_settings'),
      ])
      return {
        products: products.filter(
          (p) =>
            ['available', 'reserved', 'sold'].includes(p.status) &&
            p.brands?.is_active &&
            p.categories?.is_active,
        ),
        brands: (supabase ? brands : catalogBrands)
          .filter((b) => b.is_active)
          .sort((a, b) => a.sort_order - b.sort_order),
        categories: (supabase ? categories : catalogCategories).filter((c) => c.is_active),
        promotions,
        reviews: reviews
          .filter((r) => r.is_approved && r.permission_to_publish)
          .sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at)),
        settings: settings[0] || defaults,
      }
    },
  })
}
