export function normalizePhone(value: string) {
  const phone = value.replace(/[\s()+.-]/g, '').replace(/^0/, '62')
  return /^628\d{7,11}$/.test(phone) ? phone : null
}
export function validateReviewInput(input: Record<string, unknown>) {
  const name = typeof input.display_name === 'string' ? input.display_name.trim() : ''
  const body = typeof input.body === 'string' ? input.body.trim() : ''
  const rating = Number(input.rating)
  if (name.length < 1 || name.length > 100)
    throw new Error('Nama tampilan wajib diisi, maksimum 100 karakter.')
  if (body.length < 10 || body.length > 3000)
    throw new Error('Ulasan harus berisi 10–3000 karakter.')
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) throw new Error('Pilih rating 1–5.')
  if (input.consent !== true) throw new Error('Izin publikasi ulasan wajib diberikan.')
  if (input.website) throw new Error('Pengiriman tidak valid.')
  if (
    typeof input.captcha_token !== 'string' ||
    !input.captcha_token ||
    input.captcha_token.length > 2048
  )
    throw new Error('Verifikasi keamanan diperlukan.')
  return { display_name: name, body, rating }
}
export function validateTradeInput(input: Record<string, string>) {
  const fields: { [key: string]: [number, number] } = {
    name: [1, 100],
    brand: [1, 80],
    model: [1, 100],
    condition_notes: [1, 2000],
    accessories: [0, 500],
    notes: [0, 2000],
  }
  const clean: Record<string, string | number | null> = {}
  for (const [key, [min, max]] of Object.entries(fields)) {
    const value = (input[key] || '').trim()
    if (value.length < min || value.length > max) throw new Error(`Isian ${key} tidak valid.`)
    clean[key] = value
  }
  const phone = normalizePhone(input.phone || '')
  if (!phone) throw new Error('Nomor WhatsApp Indonesia tidak valid.')
  clean.phone = phone
  if (input.consent !== 'true') throw new Error('Persetujuan penggunaan data wajib diberikan.')
  if (input.website) throw new Error('Pengajuan tidak valid.')
  if (
    input.storage_gb &&
    (!/^\d+$/.test(input.storage_gb) ||
      Number(input.storage_gb) < 1 ||
      Number(input.storage_gb) > 100000)
  )
    throw new Error('Kapasitas tidak valid.')
  clean.storage_gb = input.storage_gb ? Number(input.storage_gb) : null
  if (!input.captcha_token || input.captcha_token.length > 2048)
    throw new Error('Verifikasi keamanan diperlukan.')
  return clean
}
export function validImageBytes(bytes: Uint8Array, mime: string) {
  if (mime === 'image/jpeg') return bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff
  if (mime === 'image/png') return [137, 80, 78, 71, 13, 10, 26, 10].every((n, i) => bytes[i] === n)
  if (mime === 'image/webp')
    return (
      String.fromCharCode(...bytes.slice(0, 4)) === 'RIFF' &&
      String.fromCharCode(...bytes.slice(8, 12)) === 'WEBP'
    )
  return false
}
