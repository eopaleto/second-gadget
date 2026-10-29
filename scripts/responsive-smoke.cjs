// Browser QA only. API fixtures stay inside this isolated browser; no stock is written.
const fs = require('node:fs/promises')
const path = require('node:path')
const assert = require('node:assert/strict')
const { existsSync } = require('node:fs')
const packageRoot = (process.env.PATH || '')
  .split(path.delimiter)
  .map((p) => path.resolve(p, '..', 'playwright'))
  .find((p) => existsSync(path.join(p, 'package.json')))
if (!packageRoot)
  throw new Error(
    'Run with: npm exec --yes --package=playwright -- node scripts/responsive-smoke.cjs',
  )
const { chromium } = require(packageRoot)

;(async () => {
  const base = process.env.QA_BASE_URL || 'http://127.0.0.1:5173'
  const catalog = JSON.parse(await fs.readFile('src/data/device-catalog.json', 'utf8'))
  const apple = catalog.brands.find((b) => b.slug === 'apple'),
    category = catalog.categories.find((c) => c.slug === 'iphone')
  const product = {
    id: '10000000-0000-4000-8000-000000000001',
    sku: 'RESPONSIVE-QA',
    slug: 'responsive-qa',
    brand_id: apple.id,
    category_id: category.id,
    name: 'iPhone 13 — unit pengujian responsif',
    model: 'iPhone 13',
    price: 6000000,
    storage_gb: 128,
    ram_gb: null,
    color: 'Midnight',
    condition_grade: 'A',
    condition_label: 'Brand New Open Box',
    condition_notes: 'Fixture pengujian tampilan, bukan stok toko.',
    has_warranty: true,
    warranty_notes: 'Fixture garansi untuk pengujian.',
    battery_health: 88,
    accessories: 'Fixture',
    screen_notes: '',
    body_notes: '',
    network_notes: '',
    status: 'available',
    stock_quantity: 1,
    is_featured: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    brands: apple,
    categories: category,
    product_images: [],
  }
  const settings = {
    store_name: 'Second Device',
    tagline: 'Jual Beli Gadget Second',
    whatsapp_number: '081234567890',
    instagram_url: 'https://www.instagram.com/example',
    facebook_url: '',
    tiktok_url: '',
    youtube_url: '',
    address: 'Alamat untuk pengujian responsif',
    google_maps_url: '',
    opening_hours: 'Senin–Sabtu 09.00–18.00',
    logo_path: '',
    about_text: '',
    payment_methods: ['qris', 'bank', 'ewallet', 'visa', 'mastercard', 'kredivo'],
  }
  const browser = await chromium.launch({ channel: 'chrome', headless: true })
  const page = await browser.newPage()
  const errors = []
  page.on('pageerror', (error) => errors.push(error.message))
  await page.route('https://*.supabase.co/rest/v1/**', async (route) => {
    const table = new URL(route.request().url()).pathname.split('/').at(-1)
    const rows =
      {
        products: [product],
        brands: catalog.brands,
        categories: catalog.categories,
        store_settings: [settings],
        promotions: [],
        reviews: [],
      }[table] || []
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(rows),
    })
  })
  await fs.mkdir('artifacts/responsive', { recursive: true })
  const results = []
  for (const width of [320, 375, 390, 768, 1024, 1280, 1440]) {
    await page.setViewportSize({ width, height: 900 })
    for (const route of ['/', '/gadget', '/gadget/responsive-qa']) {
      await page.goto(base + route, { waitUntil: 'domcontentloaded' })
      await page.getByRole('heading', { level: 1 }).waitFor()
      await page.waitForTimeout(300)
      const overflow = await page.evaluate(() => ({
        viewport: document.documentElement.clientWidth,
        document: document.documentElement.scrollWidth,
        body: document.body.scrollWidth,
      }))
      assert(
        overflow.document <= width + 1 && overflow.body <= width + 1,
        `${width}px ${route}: horizontal overflow ${JSON.stringify(overflow)}`,
      )
      const header = page.locator('header').first()
      const logo = header.getByRole('link', { name: /Beranda/ }).first()
      const logoBox = await logo.boundingBox()
      for (const control of await header.locator('button,a').all()) {
        if (!(await control.isVisible())) continue
        const box = await control.boundingBox()
        assert(
          box.x >= -1 && box.x + box.width <= width + 1,
          `${width}px ${route}: clipped header control ${(await control.getAttribute('aria-label')) || (await control.innerText())}`,
        )
      }
      const expectedLeft =
        Math.max(0, (width - 1280) / 2) + (width >= 1024 ? 48 : width >= 640 ? 32 : 20)
      assert(
        logoBox && Math.abs(logoBox.x - expectedLeft) <= 2,
        `${width}px: logo is not aligned left`,
      )
      if (width < 1024) {
        const button = page
          .getByRole('navigation', { name: 'Navigasi mobile' })
          .getByRole('button', { name: 'Buka pencarian gadget' })
        const mark = await button.locator('span').first().boundingBox()
        const nav = await page.getByRole('navigation', { name: 'Navigasi mobile' }).boundingBox()
        assert(
          mark.width >= 60 && mark.y < nav.y,
          `${width}px: mobile search must be large and raised`,
        )
      }
      results.push({ width, route, ...overflow })
    }
    await page.goto(base, { waitUntil: 'domcontentloaded' })
    await page.getByRole('heading', { name: 'Ikuti Kami' }).waitFor()
    if (width >= 1024) {
      await page.getByRole('button', { name: 'Cari gadget di navbar', exact: true }).click()
      const form = page.getByRole('search', { name: 'Pencarian navbar' })
      await assert.doesNotReject(() => form.waitFor({ state: 'visible' }))
      assert.equal(
        await page.getByRole('dialog', { name: 'Cari gadget', exact: true }).isVisible(),
        false,
      )
      const input = form.getByRole('searchbox')
      await input.fill('iPhone 13 & 128 GB')
      await input.press('Enter')
      await page.waitForURL(/q=iPhone%2013%20%26%20128%20GB/)
    } else {
      await page.getByRole('button', { name: 'Buka pencarian gadget' }).click()
      await page
        .getByRole('dialog', { name: 'Cari gadget', exact: true })
        .waitFor({ state: 'visible' })
      await page
        .getByRole('dialog', { name: 'Cari gadget', exact: true })
        .getByRole('button', { name: 'Tutup dialog' })
        .click()
    }
    await page.goto(base, { waitUntil: 'domcontentloaded' })
    await page.getByRole('heading', { name: 'Ikuti Kami' }).waitFor()
    await page.getByRole('button', { name: 'Jeda animasi banner' }).click()
    const bannerState = await page
      .locator('.animate-editorial-float')
      .evaluate((el) => getComputedStyle(el).animationPlayState)
    assert.equal(bannerState, 'paused')
    await page.evaluate(() => window.scrollTo(0, 0))
    await page.screenshot({
      path: `artifacts/responsive/home-${width}.png`,
      fullPage: true,
      animations: 'disabled',
    })
    await page.screenshot({
      path: `artifacts/responsive/viewport-${width}.png`,
      animations: 'disabled',
    })
    const footer = page.locator('footer').last()
    await footer.scrollIntoViewIfNeeded()
    await footer.locator('img').evaluateAll(async (images) => {
      for (const image of images) {
        image.loading = 'eager'
      }
      await Promise.all(images.map((image) => image.decode().catch(() => null)))
    })
    await footer.screenshot({
      path: `artifacts/responsive/footer-${width}.png`,
      animations: 'disabled',
    })
  }
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto(base, { waitUntil: 'domcontentloaded' })
  assert.equal(
    await page
      .locator('.animate-editorial-float')
      .evaluate((el) => getComputedStyle(el).animationName),
    'none',
  )
  assert.equal(
    await page
      .locator('.animate-brand-scroll')
      .evaluate((el) => getComputedStyle(el).animationName),
    'none',
  )
  assert.deepEqual(errors, [], 'Browser runtime errors')
  await fs.writeFile(
    'artifacts/responsive/results.json',
    JSON.stringify({ results, runtimeErrors: errors, reducedMotion: true }, null, 2),
  )
  console.log(
    `Verified ${results.length} responsive page views, desktop/mobile search, raised search button, banner pause, reduced motion; no runtime errors.`,
  )
  await browser.close()
})().catch((error) => {
  console.error(error)
  process.exit(1)
})
