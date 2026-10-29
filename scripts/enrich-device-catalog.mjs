import { readFile, writeFile } from 'node:fs/promises'
import { createHash } from 'node:crypto'
import { JSDOM } from 'jsdom'
const path = 'src/data/device-catalog.json',
  catalog = JSON.parse(await readFile(path, 'utf8'))
const id = (text) => {
  const h = createHash('sha256').update(`second-device:${text}`).digest('hex')
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-4${h.slice(13, 16)}-8${h.slice(17, 20)}-${h.slice(20, 32)}`
}
// Older Apple pages omit GB after each comma-separated number. Parse each capacity,
// instead of keeping only the final number with an explicit unit suffix.
const response = await fetch('https://support.apple.com/en-us/108044')
if (!response.ok) throw new Error('Apple reference unavailable')
const doc = new JSDOM(await response.text()).window.document
for (const h of doc.querySelectorAll('h2')) {
  const model = catalog.models.find(
    (m) => m.brand_slug === 'apple' && m.name === h.textContent.trim(),
  )
  if (!model) continue
  let sibling = h.nextElementSibling,
    parts = []
  while (sibling && sibling.tagName !== 'H2') {
    parts.push(sibling.textContent.trim())
    sibling = sibling.nextElementSibling
  }
  const capacity = parts.join('\n').match(/Capacity:\s*([^\n]+)/i)?.[1]
  if (capacity)
    model.storage_options = capacity
      .split(',')
      .map((part) => {
        const m = part.trim().match(/^(\d+)\s*(GB|TB)?/)
        return m ? Number(m[1]) * (m[2] === 'TB' ? 1024 : 1) : null
      })
      .filter((n) => n !== null)
}
function add(brand, name, category, source, storage = [], ram = [], colors = [], variants = []) {
  if (catalog.models.some((m) => m.brand_slug === brand && m.name === name)) return
  catalog.models.push({
    id: id(`model:${brand}:${name}`),
    brand_slug: brand,
    category_slug: category,
    name,
    storage_options: storage,
    ram_options: ram,
    color_options: colors,
    variants,
    source_url: source,
    is_active: true,
  })
}
add(
  'google',
  'Pixel 8',
  'android',
  'https://support.google.com/pixelphone/answer/7158570?hl=en',
  [128, 256],
  [8],
)
add(
  'google',
  'Pixel 8a',
  'android',
  'https://support.google.com/pixelphone/answer/7158570?hl=en',
  [128, 256],
  [8],
)
add(
  'nothing',
  'Phone (2a)',
  'android',
  'https://intl.nothing.tech/products/phone-2a',
  [128, 256],
  [8, 12],
)
add('oneplus', 'OnePlus 12R', 'android', 'https://www.oneplus.in/12r/specs', [128, 256])
add('nokia', 'Nokia G42 5G', 'android', 'https://www.hmd.com/en_in/nokia-g-42/specs')
add(
  'honor',
  'HONOR 90',
  'android',
  'https://www.honor.com/uk/phones/honor-90/spec/',
  [256, 512],
  [8, 12],
  [],
  [
    { storage_gb: 256, ram_gb: 8 },
    { storage_gb: 512, ram_gb: 12 },
  ],
)
add(
  'sony',
  'Xperia 1 V',
  'android',
  'https://www.sony.com/electronics/support/mobile-phones-tablets-mobile-phones/xperia-1-v-256gb/specifications',
  [256],
  [12],
)
add(
  'motorola',
  'moto g84 5G',
  'android',
  'https://en-us.support.motorola.com/app/answers/detail/a_id/176650/~/especificaciones---moto-g84-5g/',
  [256],
)
add(
  'acer',
  'Aspire 5 (A515-58M)',
  'laptop',
  'https://www.acer.com/nextatacer/mediacenter/20230103/2023_CES_H2H-Spec-Sheet.pdf',
)
add('hp', 'EliteBook 840 G8', 'laptop', 'https://support.hp.com/ie-en/document/c06978058')
add(
  'msi',
  'Modern 14 C12M',
  'laptop',
  'https://au.msi.com/Business-Productivity/Modern-14-C12X/Specification',
)
add(
  'microsoft',
  'Surface Pro 9',
  'tablet',
  'https://support.microsoft.com/en-us/surface/models/surface-pro-9-features-and-specs',
)
catalog.checked_at = '2026-10-29'
await writeFile(path, JSON.stringify(catalog, null, 2) + '\n')
console.log(
  JSON.stringify({
    brands: catalog.brands.length,
    models: catalog.models.length,
    brandsWithoutModels: catalog.brands
      .filter((b) => !catalog.models.some((m) => m.brand_slug === b.slug))
      .map((b) => b.name),
  }),
)
