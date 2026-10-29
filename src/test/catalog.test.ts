import { describe, it, expect } from 'vitest'
import {
  activePromotions,
  filterProducts,
  normalizePhone,
  safeHttpUrl,
  whatsappLink,
} from '../lib/utils'
import { tradeSchema, productSchema, validatePhoto } from '../lib/validation'
import { unit, promo } from './fixtures'
import { validateTradeInput, validImageBytes } from '../../supabase/functions/_shared/validation'

describe('catalog and commercial rules', () => {
  it('combines search, brand, category, price, capacity, grade and battery filters', () => {
    const products = [
      unit(),
      unit({ id: 'low-battery', battery_health: 60 }),
      unit({ id: 'wrong-price', price: 9000000 }),
      unit({ id: 'wrong-grade', condition_grade: 'B' }),
    ]
    expect(
      filterProducts(
        products,
        new URLSearchParams(
          'q=++IPHONE+++13++128+GB&brand=apple&category=iphone&min=5000000&max=7000000&storage=128&grade=A&battery=80',
        ),
      ).map((p) => p.id),
    ).toEqual([unit().id])
  })
  it('excludes unknown battery values when filtering and excludes unpublished or sold stock', () => {
    expect(
      filterProducts(
        [
          unit({ battery_health: null }),
          unit({ status: 'sold', stock_quantity: 0 }),
          unit({ status: 'draft' }),
          unit({ status: 'archived' }),
        ],
        new URLSearchParams('battery=0'),
      ),
    ).toHaveLength(0)
  })
  it('keeps reserved units visible unless availability is narrowed and preserves price sort', () => {
    const rows = [unit({ id: 'b', price: 7, status: 'reserved' }), unit({ id: 'a', price: 5 })]
    expect(filterProducts(rows, new URLSearchParams('sort=price-desc')).map((p) => p.id)).toEqual([
      'b',
      'a',
    ])
    expect(filterProducts(rows, new URLSearchParams('status=available')).map((p) => p.id)).toEqual([
      'a',
    ])
  })
  it('hides expired, future, disabled, and sold-out promotions', () => {
    const now = Date.parse('2026-10-29T00:00:00Z')
    expect(
      activePromotions(
        [
          promo(),
          promo({ id: 'old', end_at: '2026-10-28T00:00:00Z' }),
          promo({ id: 'future', start_at: '2026-10-30T00:00:00Z' }),
          promo({ id: 'disabled', is_active: false }),
        ],
        [unit()],
        now,
      ).map((p) => p.id),
    ).toEqual(['test-promo'])
    expect(
      activePromotions([promo()], [unit({ status: 'sold', stock_quantity: 0 })], now),
    ).toHaveLength(0)
  })
})
describe('safe contact links', () => {
  it('normalizes Indonesia phones and rejects malformed or foreign numbers', () => {
    expect(normalizePhone('0812-3456-7890')).toBe('6281234567890')
    expect(normalizePhone('+62 812 3456 7890')).toBe('6281234567890')
    for (const value of ['', '0812x3456789', '+15551234567', '12345'])
      expect(normalizePhone(value)).toBeNull()
  })
  it('encodes a product message without inventing a phone', () => {
    const message = 'iPhone 13 — Rp 6.000.000 https://example.com/gadget/iphone?color=a&x=1'
    const link = whatsappLink('081234567890', message)!
    expect(new URL(link).searchParams.get('text')).toBe(message)
    expect(whatsappLink('', message)).toBeNull()
    expect(safeHttpUrl('javascript:alert(1)')).toBeNull()
    expect(safeHttpUrl('https://instagram.com/example')).toBe('https://instagram.com/example')
  })
})
describe('form and upload validation', () => {
  const trade = {
    name: 'Test',
    phone: '081234567890',
    brand: 'Apple',
    model: 'iPhone',
    storage_gb: '128',
    condition_notes: 'Layar baik',
    accessories: '',
    notes: '',
    consent: true,
    website: '',
  }
  it('requires explicit consent and rejects invalid phones', () => {
    expect(tradeSchema.safeParse(trade).success).toBe(true)
    expect(tradeSchema.safeParse({ ...trade, consent: false }).success).toBe(false)
    expect(tradeSchema.safeParse({ ...trade, phone: 'not-a-phone' }).success).toBe(false)
  })
  it('server validation independently rejects no consent, spam and invalid capacity', () => {
    const values = Object.fromEntries(Object.entries(trade).map(([k, v]) => [k, String(v)]))
    values.captcha_token = 'verified-token'
    expect(validateTradeInput(values).phone).toBe('6281234567890')
    expect(() => validateTradeInput({ ...values, consent: 'false' })).toThrow()
    expect(() => validateTradeInput({ ...values, website: 'spam' })).toThrow()
    expect(() => validateTradeInput({ ...values, storage_gb: '0' })).toThrow()
    expect(() => validateTradeInput({ ...values, storage_gb: '1e9' })).toThrow()
  })
  it('checks photo content signatures and frontend MIME and size', () => {
    expect(validImageBytes(new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]), 'image/png')).toBe(
      true,
    )
    expect(
      validImageBytes(new TextEncoder().encode('<script>alert(1)</script>'), 'image/png'),
    ).toBe(false)
    expect(validatePhoto(new File(['x'], 'bad.svg', { type: 'image/svg+xml' }))).toMatch(/JPG/)
    expect(
      validatePhoto(
        new File([new Uint8Array(5 * 1024 * 1024 + 1)], 'large.jpg', { type: 'image/jpeg' }),
      ),
    ).toMatch(/5 MB/)
  })
  it('requires positive inventory for an available unit', () => {
    const p = unit()
    const input = {
      ...p,
      price: String(p.price),
      storage_gb: '128',
      ram_gb: '',
      battery_health: '88',
      stock_quantity: '0',
    }
    expect(productSchema.safeParse(input).success).toBe(false)
    expect(productSchema.safeParse({ ...input, stock_quantity: '1' }).success).toBe(true)
  })
})
