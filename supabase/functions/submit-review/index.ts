import { createClient } from 'npm:@supabase/supabase-js@2.118.0'
import { cors, json, limitedBody } from '../_shared/http.ts'
import { validateReviewInput } from '../_shared/validation.ts'

Deno.serve(async (req) => {
  const headers = cors(req)
  if (!headers) return json({ error: 'Origin tidak diizinkan.' }, 403)
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers })
  if (req.method !== 'POST') return json({ error: 'Metode tidak diizinkan.' }, 405, headers)
  const url = Deno.env.get('SUPABASE_URL'),
    key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'),
    secret = Deno.env.get('TURNSTILE_SECRET_KEY'),
    salt = Deno.env.get('RATE_LIMIT_SALT')
  if (!url || !key || !secret || !salt)
    return json({ error: 'Layanan ulasan belum tersedia.' }, 503, headers)
  const db = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } })
  try {
    const payload = await (await limitedBody(req, 16000)).json()
    let record: ReturnType<typeof validateReviewInput>
    try {
      record = validateReviewInput(payload)
    } catch (e) {
      return json({ error: e instanceof Error ? e.message : 'Ulasan tidak valid.' }, 400, headers)
    }
    const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      body: new URLSearchParams({ secret, response: payload.captcha_token }),
      signal: AbortSignal.timeout(10000),
    })
    const captcha = await response.json()
    const hosts = (Deno.env.get('ALLOWED_ORIGINS') || Deno.env.get('SITE_URL') || '')
      .split(',')
      .map((origin) => {
        try {
          return new URL(origin.trim()).hostname
        } catch {
          return ''
        }
      })
    if (!captcha.success || captcha.action !== 'review' || !hosts.includes(captcha.hostname))
      return json({ error: 'Verifikasi keamanan tidak valid. Silakan ulangi.' }, 400, headers)
    const ip =
      req.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
      req.headers.get('cf-connecting-ip') ||
      'unknown'
    const hash = await crypto.subtle.digest(
      'SHA-256',
      new TextEncoder().encode(`${salt}:review:${ip}`),
    )
    const keyHash = Array.from(new Uint8Array(hash))
      .map((n) => n.toString(16).padStart(2, '0'))
      .join('')
    const { data: allowed, error: limitError } = await db.rpc('check_tradein_rate_limit', {
      key_input: keyHash,
    })
    if (limitError) throw limitError
    if (!allowed)
      return json(
        { error: 'Terlalu banyak pengiriman ulasan. Coba lagi dalam satu jam.' },
        429,
        headers,
      )
    const { error } = await db
      .from('reviews')
      .insert({
        ...record,
        source: 'Dikirim pengguna melalui website',
        permission_to_publish: true,
        is_approved: false,
      })
    if (error) throw error
    return json({ success: true }, 201, headers)
  } catch {
    return json({ error: 'Ulasan belum terkirim. Periksa koneksi lalu coba lagi.' }, 503, headers)
  }
})
