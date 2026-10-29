import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL?.trim()
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY?.trim()
export const isConfigured = Boolean(url && /^https?:\/\//.test(url) && key)
export const supabase = isConfigured
  ? createClient(url!, key!, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
    })
  : null
export function requireSupabase() {
  if (!supabase)
    throw new Error(
      'Koneksi toko belum dikonfigurasi. Ikuti panduan konfigurasi Supabase di README.',
    )
  return supabase
}
export function imageUrl(path: string | null | undefined, bucket = 'product-images') {
  if (path?.startsWith('/') && !path.startsWith('//')) return path
  if (!path || !supabase) return ''
  return supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl
}
