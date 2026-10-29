import { writeFile, readFile } from 'node:fs/promises'
import { loadEnv } from 'vite'
import { createClient } from '@supabase/supabase-js'

const env = { ...loadEnv('production', process.cwd(), 'VITE_'), ...process.env }
const origin = env.VITE_SITE_URL?.trim()
if (!origin) {
  console.log('Sitemap skipped: VITE_SITE_URL has not been configured.')
  process.exit(0)
}
const site = new URL(origin)
if (!['https:', 'http:'].includes(site.protocol))
  throw new Error('VITE_SITE_URL must be an http(s) URL.')
const pages = [
  '/',
  '/gadget',
  '/promo',
  '/trade-in',
  '/tentang',
  '/ulasan',
  '/kontak',
  '/privasi',
].map((path) => ({ path, lastmod: null }))
if (env.VITE_SUPABASE_URL && env.VITE_SUPABASE_PUBLISHABLE_KEY) {
  const db = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_PUBLISHABLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
  for (let offset = 0; ; offset += 500) {
    const { data, error } = await db
      .from('products')
      .select('slug,updated_at')
      .in('status', ['available', 'reserved', 'sold'])
      .order('id')
      .range(offset, offset + 499)
    if (error)
      throw new Error(
        'Could not read published products for sitemap. Verify Supabase configuration.',
      )
    for (const p of data)
      pages.push({ path: `/gadget/${encodeURIComponent(p.slug)}`, lastmod: p.updated_at })
    if (data.length < 500) break
  }
}
const xmlEscape = (value) =>
  String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;')
await writeFile(
  'dist/sitemap.xml',
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${pages.map((p) => `\n  <url><loc>${xmlEscape(new URL(p.path, site))}</loc>${p.lastmod ? `<lastmod>${new Date(p.lastmod).toISOString()}</lastmod>` : ''}</url>`).join('')}\n</urlset>\n`,
)
await writeFile(
  'dist/robots.txt',
  `${await readFile('public/robots.txt', 'utf8')}\nSitemap: ${new URL('/sitemap.xml', site)}\n`,
)
console.log(`Sitemap generated with ${pages.length} published URLs.`)
