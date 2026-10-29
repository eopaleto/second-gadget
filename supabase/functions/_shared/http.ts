export function cors(req: Request): Record<string, string> | null {
  const origin = req.headers.get('origin') || ''
  const allowed = (Deno.env.get('ALLOWED_ORIGINS') || Deno.env.get('SITE_URL') || '')
    .split(',')
    .map((v) => v.trim().replace(/\/$/, ''))
  if (!origin || !allowed.includes(origin)) return null
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    Vary: 'Origin',
    'Cache-Control': 'no-store',
  }
}
export function json(data: unknown, status: number, headers: Record<string, string> = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...headers, 'Content-Type': 'application/json' },
  })
}
export async function limitedBody(req: Request, max: number) {
  if (Number(req.headers.get('content-length') || 0) > max) throw new Error('Data terlalu besar.')
  const reader = req.body?.getReader()
  if (!reader) throw new Error('Data tidak ditemukan.')
  const chunks: Uint8Array[] = []
  let length = 0
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    length += value.byteLength
    if (length > max) {
      await reader.cancel()
      throw new Error('Data terlalu besar.')
    }
    chunks.push(value)
  }
  const body = new Uint8Array(length)
  let offset = 0
  for (const chunk of chunks) {
    body.set(chunk, offset)
    offset += chunk.length
  }
  return new Response(body, { headers: { 'Content-Type': req.headers.get('content-type') || '' } })
}
