import { createClient } from 'npm:@supabase/supabase-js@2.118.0'
import { cors, json, limitedBody } from '../_shared/http.ts'
import { validateTradeInput, validImageBytes } from '../_shared/validation.ts'

Deno.serve(async (req) => {
  const headers = cors(req)
  if (!headers) return json({ error: 'Origin tidak diizinkan.' }, 403)
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers })
  if (req.method !== 'POST') return json({ error: 'Metode tidak diizinkan.' }, 405, headers)
  const url = Deno.env.get('SUPABASE_URL'),
    key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'),
    captchaSecret = Deno.env.get('TURNSTILE_SECRET_KEY'),
    salt = Deno.env.get('RATE_LIMIT_SALT')
  if (!url || !key || !captchaSecret || !salt)
    return json({ error: 'Layanan pengajuan belum tersedia.' }, 503, headers)
  const db = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } })
  const uploaded: string[] = []
  try {
    const body = await limitedBody(req, 21 * 1024 * 1024),
      form = await body.formData()
    const values: Record<string, string> = {}
    for (const [k, v] of form.entries()) if (typeof v === 'string') values[k] = v
    const record = validateTradeInput(values)
    const photos = form.getAll('photos')
    if (photos.length > 4) return json({ error: 'Maksimum 4 foto.' }, 400, headers)
    for (const photo of photos) {
      if (!(photo instanceof File) || photo.size > 5 * 1024 * 1024 || photo.size === 0)
        return json({ error: 'Foto harus berukuran 1 byte sampai 5 MB.' }, 400, headers)
      if (!validImageBytes(new Uint8Array(await photo.slice(0, 12).arrayBuffer()), photo.type))
        return json({ error: 'Foto harus berupa JPG, PNG, atau WebP yang valid.' }, 400, headers)
    }
    const captcha = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      body: new URLSearchParams({ secret: captchaSecret, response: values.captcha_token }),
      signal: AbortSignal.timeout(10000),
    })
    const verified = await captcha.json()
    const hostnames = (Deno.env.get('ALLOWED_ORIGINS') || Deno.env.get('SITE_URL') || '')
      .split(',')
      .map((origin) => {
        try {
          return new URL(origin.trim()).hostname
        } catch {
          return ''
        }
      })
    if (
      !verified.success ||
      verified.action !== 'trade_in' ||
      !hostnames.includes(verified.hostname)
    )
      return json(
        { error: 'Verifikasi keamanan tidak valid atau kedaluwarsa. Ulangi verifikasi.' },
        400,
        headers,
      )
    async function limit(value: string) {
      const hash = await crypto.subtle.digest(
        'SHA-256',
        new TextEncoder().encode(`${salt}:${value}`),
      )
      const keyHash = Array.from(new Uint8Array(hash))
        .map((n) => n.toString(16).padStart(2, '0'))
        .join('')
      const { data, error } = await db.rpc('check_tradein_rate_limit', { key_input: keyHash })
      if (error) throw new Error('rate_limit_unavailable')
      return data === true
    }
    const ip =
      req.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
      req.headers.get('cf-connecting-ip') ||
      'unknown'
    if (!(await limit(`phone:${record.phone}`)) || !(await limit(`ip:${ip}`)))
      return json(
        { error: 'Terlalu banyak pengajuan. Silakan coba lagi dalam satu jam.' },
        429,
        headers,
      )
    const requestId = crypto.randomUUID(),
      reference = `SD-${crypto.randomUUID().replaceAll('-', '').slice(0, 16).toUpperCase()}`
    for (const photo of photos as File[]) {
      const ext = photo.type === 'image/jpeg' ? 'jpg' : photo.type === 'image/png' ? 'png' : 'webp'
      const path = `${requestId}/${crypto.randomUUID()}.${ext}`
      const { error } = await db.storage
        .from('trade-in-private')
        .upload(path, photo, { contentType: photo.type, upsert: false })
      if (error) throw new Error('upload_failed')
      uploaded.push(path)
    }
    const { error } = await db.from('trade_in_requests').insert({
      ...record,
      id: requestId,
      reference_code: reference,
      photo_paths: uploaded,
      consent_at: new Date().toISOString(),
    })
    if (error) throw new Error('insert_failed')
    return json({ reference_code: reference }, 201, headers)
  } catch (e) {
    if (uploaded.length) await db.storage.from('trade-in-private').remove(uploaded)
    const message = e instanceof Error ? e.message : ''
    const validation =
      message.startsWith('Isian ') ||
      [
        'Nomor WhatsApp Indonesia tidak valid.',
        'Persetujuan penggunaan data wajib diberikan.',
        'Pengajuan tidak valid.',
        'Kapasitas tidak valid.',
        'Verifikasi keamanan diperlukan.',
        'Data terlalu besar.',
        'Data tidak ditemukan.',
      ].includes(message)
    return json(
      { error: validation ? message : 'Pengajuan belum berhasil dikirim. Silakan coba lagi.' },
      validation ? 400 : 503,
      headers,
    )
  }
})
