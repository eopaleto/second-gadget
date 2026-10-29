import type { Product, Promotion } from '../types'
// Test-only fixtures. Never imported by application routes or production data loaders.
export function unit(overrides: Partial<Product> = {}): Product {
  return {
    id: '10000000-0000-4000-8000-000000000001',
    sku: 'TEST-001',
    slug: 'test-iphone',
    brand_id: '20000000-0000-4000-8000-000000000001',
    category_id: '30000000-0000-4000-8000-000000000001',
    name: 'iPhone 13',
    model: 'iPhone 13',
    price: 6000000,
    storage_gb: 128,
    ram_gb: null,
    color: 'Midnight',
    condition_grade: 'A',
    condition_label: 'Sangat Baik',
    has_warranty: false,
    condition_notes: 'Catatan kondisi khusus pengujian',
    battery_health: 88,
    accessories: 'Dus',
    warranty_notes: '',
    screen_notes: '',
    body_notes: '',
    network_notes: '',
    status: 'available',
    stock_quantity: 1,
    is_featured: false,
    created_at: '2026-10-28T00:00:00Z',
    updated_at: '2026-10-28T00:00:00Z',
    product_images: [],
    brands: {
      id: '20000000-0000-4000-8000-000000000001',
      name: 'Apple',
      slug: 'apple',
      logo_path: null,
      is_active: true,
      sort_order: 0,
    },
    categories: {
      id: '30000000-0000-4000-8000-000000000001',
      name: 'iPhone',
      slug: 'iphone',
      is_active: true,
    },
    ...overrides,
  }
}
export function promo(overrides: Partial<Promotion> = {}): Promotion {
  return {
    id: 'test-promo',
    title: 'Test promo',
    slug: 'test',
    description: '',
    banner_path: null,
    terms: 'Test',
    start_at: '2026-10-01T00:00:00Z',
    end_at: '2026-11-01T00:00:00Z',
    is_active: true,
    promotion_products: [{ product_id: unit().id }],
    ...overrides,
  }
}
