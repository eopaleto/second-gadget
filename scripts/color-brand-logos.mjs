import { readFile, writeFile } from 'node:fs/promises'

const catalog = JSON.parse(await readFile('src/data/device-catalog.json', 'utf8'))
const response = await fetch(
  'https://raw.githubusercontent.com/simple-icons/simple-icons/11.15.0/_data/simple-icons.json',
)
if (!response.ok) throw new Error('Could not load brand palette reference')
const { icons } = await response.json()
const fallbacks = {
  realme: 'FFC915',
  infinix: '82C91E',
  tecno: '0066B3',
  honor: '0071CE',
  nothing: 'D71920',
  poco: 'F9D616',
  apple: '555555',
  sony: '000000',
}
const colors = {}
for (const brand of catalog.brands) {
  const reference = icons.find((icon) => icon.title.toLowerCase() === brand.name.toLowerCase())
  const color = fallbacks[brand.slug] || reference?.hex
  if (!color) throw new Error(`Missing brand color: ${brand.slug}`)
  const path = `public/brands/${brand.slug}.svg`
  let svg = await readFile(path, 'utf8')
  svg = svg.replace(/\sfill="#[A-Fa-f0-9]+"/g, '').replace(/<svg\b/, '<svg fill="#' + color + '"')
  if (brand.slug === 'realme' || brand.slug === 'poco')
    svg = svg
      .replace(/<title>/, '<rect width="180" height="50" rx="4" fill="#' + color + '"/><title>')
      .replace(/<text /, '<text fill="#151515" ')
  await writeFile(path, svg)
  colors[brand.slug] = { hex: color, source: reference?.source || 'Brand wordmark palette' }
}
const googleResponse = await fetch(
  'https://www.gstatic.com/images/branding/googlelogo/svg/googlelogo_clr_74x24px.svg',
)
if (googleResponse.ok) {
  const svg = await googleResponse.text()
  if (svg.includes('<svg') && !/<script/i.test(svg))
    await writeFile('public/brands/google.svg', svg)
}
await writeFile(
  'public/brands/microsoft.svg',
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 180 40" role="img"><title>Microsoft</title><path fill="#f25022" d="M0 0h18v18H0z"/><path fill="#7fba00" d="M21 0h18v18H21z"/><path fill="#00a4ef" d="M0 21h18v18H0z"/><path fill="#ffb900" d="M21 21h18v18H21z"/><text x="49" y="29" font-family="Segoe UI,Arial,sans-serif" font-size="27" fill="#737373">Microsoft</text></svg>',
)
await writeFile('artifacts/brand-palette.json', JSON.stringify(colors, null, 2) + '\n')
console.log(`Updated ${catalog.brands.length} brand logos with color.`)
