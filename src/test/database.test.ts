// @vitest-environment node
import { PGlite } from '@electric-sql/pglite'
import { readFile } from 'node:fs/promises'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

const db = new PGlite()
const owner = 'a0000000-0000-4000-8000-000000000001',
  admin = 'a0000000-0000-4000-8000-000000000002',
  visitor = 'a0000000-0000-4000-8000-000000000003'
const brand = 'b0000000-0000-4000-8000-000000000001',
  category = 'c0000000-0000-4000-8000-000000000001',
  product = 'd0000000-0000-4000-8000-000000000001'
const record = {
  id: product,
  sku: 'TEST',
  slug: 'test-unit',
  brand_id: brand,
  category_id: category,
  name: 'Test unit',
  model: 'Test model',
  price: 100,
  storage_gb: 128,
  ram_gb: null,
  color: 'Black',
  condition_grade: 'B',
  condition_notes: 'Real test notes',
  battery_health: null,
  accessories: '',
  warranty_notes: '',
  screen_notes: '',
  body_notes: '',
  network_notes: '',
  status: 'available',
  stock_quantity: 1,
  is_featured: false,
}
const images = [
  {
    storage_path: `products/${product}/test.webp`,
    alt_text: 'Test unit',
    sort_order: 0,
    is_primary: true,
  },
]
async function as<T>(role: string, uid: string | null, fn: () => Promise<T>) {
  await db.exec(`set role ${role}`)
  await db.query("select set_config('request.jwt.claim.sub',$1,false)", [uid || ''])
  try {
    return await fn()
  } finally {
    await db.exec('reset role')
  }
}
beforeAll(async () => {
  // Only Supabase-owned auth/storage plumbing is stubbed. PostgreSQL executes the actual migration and RLS.
  await db.exec(`
    create role anon nologin; create role authenticated nologin; create role service_role nologin bypassrls;
    create schema auth; create table auth.users(id uuid primary key);
    create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
    grant usage on schema auth to anon,authenticated,service_role; grant execute on function auth.uid() to anon,authenticated,service_role;
    create schema storage;
    create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
    create table storage.objects(id uuid primary key default gen_random_uuid(),bucket_id text,name text);
    alter table storage.objects enable row level security;
    grant usage on schema storage to anon,authenticated,service_role;
    grant all on storage.objects to anon,authenticated,service_role;
  `)
  const migration = await readFile(
    new URL('../../supabase/migrations/202610290001_initial.sql', import.meta.url),
    'utf8',
  )
  await db.exec(migration)
  await db.exec(migration) // the same SQL remains safe to apply twice
  for (const name of [
    '202610290002_catalog_reviews.sql',
    '202610290003_reference_catalog.sql',
    '202610310001_owner_monitoring.sql',
    '202611010001_admin_store_access.sql',
  ]) {
    const sql = await readFile(
      new URL(`../../supabase/migrations/${name}`, import.meta.url),
      'utf8',
    )
    await db.exec(sql)
    await db.exec(sql)
  }
  await db.query('insert into auth.users(id) values ($1),($2),($3)', [owner, admin, visitor])
  await db.query(
    "insert into public.admin_profiles(user_id,display_name,role) values($1,'Owner','owner'),($2,'Admin','admin')",
    [owner, admin],
  )
  await db.query("insert into public.brands(id,name,slug) values($1,'Brand','brand')", [brand])
  await db.query("insert into public.categories(id,name,slug) values($1,'Category','category')", [
    category,
  ])
  await as('authenticated', owner, () =>
    db.query('select public.save_product($1::jsonb,$2::jsonb)', [
      JSON.stringify(record),
      JSON.stringify(images),
    ]),
  )
  await db.exec(`insert into public.trade_in_requests(reference_code,name,phone,brand,model,condition_notes,consent_at) values('PRIVATE-REF','Private name','6281234567890','Brand','Model','Notes',now());
    insert into storage.objects(bucket_id,name) values('product-images','public.webp'),('trade-in-private','private.webp');`)
}, 30000)
afterAll(async () => {
  await db.close()
})
describe('database migration, role policies, atomic writes and private uploads', () => {
  it('installs all reference brands and models without creating fake inventory', async () => {
    const brands = await db.query<{ count: number }>(
      'select count(*)::int as count from public.brands',
    )
    const models = await db.query<{ count: number }>(
      'select count(*)::int as count from public.device_models',
    )
    expect(brands.rows[0].count).toBe(25)
    expect(models.rows[0].count).toBe(60)
    const products = await db.query('select id from public.products')
    expect(products.rows).toHaveLength(1)
  })
  it('new product RPC validates model relationships and supports removing an existing warranty', async () => {
    const id = crypto.randomUUID(),
      copy = {
        ...record,
        id,
        sku: 'MODEL-TEST',
        slug: 'model-test',
        status: 'draft',
        condition_label: 'Like New',
        has_warranty: true,
        warranty_notes: 'Garansi toko 7 hari',
      }
    await as('authenticated', owner, () =>
      db.query('select public.save_product_v2($1::jsonb,$2::jsonb)', [JSON.stringify(copy), '[]']),
    )
    const result = await db.query<{
      model_id: string
      has_warranty: boolean
      condition_label: string
    }>('select model_id,has_warranty,condition_label from public.products where id=$1', [id])
    expect(result.rows[0].has_warranty).toBe(true)
    expect(result.rows[0].condition_label).toBe('Like New')
    await as('authenticated', owner, () =>
      db.query('select public.save_product_v2($1::jsonb,$2::jsonb)', [
        JSON.stringify({
          ...copy,
          model_id: result.rows[0].model_id,
          has_warranty: false,
          warranty_notes: '',
        }),
        '[]',
      ]),
    )
    const saved = await db.query<{ has_warranty: boolean }>(
      'select has_warranty from public.products where id=$1',
      [id],
    )
    expect(saved.rows[0].has_warranty).toBe(false)
    const otherBrand = await db.query<{ id: string }>(
      "select id from public.brands where slug='apple'",
    )
    await expect(
      as('authenticated', owner, () =>
        db.query('select public.save_product_v2($1::jsonb,$2::jsonb)', [
          JSON.stringify({
            ...copy,
            model_id: result.rows[0].model_id,
            brand_id: otherBrand.rows[0].id,
          }),
          '[]',
        ]),
      ),
    ).rejects.toThrow(/model_brand_category_mismatch/)
  })
  it('owner can moderate reviews while review content remains immutable', async () => {
    const added = await as('service_role', null, () =>
      db.query<{ id: string }>(
        "insert into public.reviews(display_name,body,rating,permission_to_publish) values('Customer','Original customer experience',5,true) returning id",
      ),
    )
    const id = added.rows[0].id
    await expect(
      as('authenticated', admin, () =>
        db.exec("insert into public.reviews(display_name,body) values('Admin','Fake review')"),
      ),
    ).rejects.toThrow(/permission denied/)
    await expect(
      as('authenticated', admin, () =>
        db.query("update public.reviews set body='Edited' where id=$1", [id]),
      ),
    ).rejects.toThrow(/permission denied/)
    await as('authenticated', visitor, () =>
      db.query('update public.reviews set is_approved=true where id=$1', [id]),
    )
    let result = await db.query<{ is_approved: boolean }>(
      'select is_approved from public.reviews where id=$1',
      [id],
    )
    expect(result.rows[0].is_approved).toBe(false)
    await as('authenticated', owner, () =>
      db.query('update public.reviews set is_approved=true where id=$1', [id]),
    )
    result = await db.query('select is_approved from public.reviews where id=$1', [id])
    expect(result.rows[0].is_approved).toBe(true)
    await db.query('delete from public.reviews where id=$1', [id])
  })
  it('publishes available units while draft and archived units are inaccessible to anon', async () => {
    await as('authenticated', owner, async () => {
      for (const status of ['draft', 'archived']) {
        const id = crypto.randomUUID()
        await db.query('select public.save_product($1::jsonb,$2::jsonb)', [
          JSON.stringify({ ...record, id, sku: status, slug: status, status }),
          JSON.stringify([{ ...images[0], storage_path: `products/${id}/test.webp` }]),
        ])
      }
    })
    const result = await as('anon', null, () =>
      db.query<{ status: string }>('select status from public.products'),
    )
    expect(result.rows.map((r) => r.status)).toEqual(['available'])
  })
  it('blocks anonymous writes and reading trade-in personal data', async () => {
    await expect(
      as('anon', null, () => db.exec('select * from public.trade_in_requests')),
    ).rejects.toThrow(/permission denied/)
    await expect(
      as('anon', null, () => db.exec('update public.products set price=1')),
    ).rejects.toThrow(/permission denied/)
    await expect(
      as('anon', null, () =>
        db.query('select public.save_product($1::jsonb,$2::jsonb)', [
          JSON.stringify(record),
          JSON.stringify(images),
        ]),
      ),
    ).rejects.toThrow(/permission denied/)
  })
  it('an authenticated non-admin cannot manage stock, read submissions, or assign roles', async () => {
    const result = await as('authenticated', visitor, () =>
      db.exec('select * from public.trade_in_requests'),
    )
    expect(result[0].rows).toHaveLength(0)
    await expect(
      as('authenticated', visitor, () =>
        db.query('select public.save_product($1::jsonb,$2::jsonb)', [
          JSON.stringify(record),
          JSON.stringify(images),
        ]),
      ),
    ).rejects.toThrow(/admin_required/)
    await expect(
      as('authenticated', visitor, () =>
        db.query(
          "insert into public.admin_profiles(user_id,display_name,role) values($1,'Self','owner')",
          [visitor],
        ),
      ),
    ).rejects.toThrow(/row-level security/)
  })
  it('admin can read submissions but cannot escalate its role or edit account credentials', async () => {
    await as('authenticated', admin, () =>
      db.query("update public.admin_profiles set role='owner' where user_id=$1", [admin]),
    )
    const result = await db.query<{ role: string }>(
      'select role from public.admin_profiles where user_id=$1',
      [admin],
    )
    expect(result.rows[0].role).toBe('admin')
    const submissions = await as('authenticated', admin, () =>
      db.query('select id from public.trade_in_requests'),
    )
    expect(submissions.rows.length).toBeGreaterThan(0)
    const edited = await as('authenticated', admin, () =>
      db.query(
        "update public.admin_profiles set display_name='Tampered' where user_id=$1 returning user_id",
        [owner],
      ),
    )
    expect(edited.rows).toHaveLength(0)
    const deleted = await as('authenticated', admin, () =>
      db.query('delete from public.admin_profiles where user_id=$1 returning user_id', [owner]),
    )
    expect(deleted.rows).toHaveLength(0)
  })
  it('owner can manage other roles but cannot remove own owner access', async () => {
    await as('authenticated', owner, () =>
      db.query("update public.admin_profiles set role='admin' where user_id=$1", [owner]),
    )
    const own = await db.query<{ role: string }>(
      'select role from public.admin_profiles where user_id=$1',
      [owner],
    )
    expect(own.rows[0].role).toBe('owner')
    await as('authenticated', owner, () =>
      db.query(
        "insert into public.admin_profiles(user_id,display_name,role) values($1,'New admin','admin')",
        [visitor],
      ),
    )
    await as('authenticated', owner, () =>
      db.query('delete from public.admin_profiles where user_id=$1', [visitor]),
    )
    const removed = await db.query('select * from public.admin_profiles where user_id=$1', [
      visitor,
    ])
    expect(removed.rows).toHaveLength(0)
  })
  it('an invalid image rolls back product changes and preserves its previous photos', async () => {
    await expect(
      as('authenticated', owner, () =>
        db.query('select public.save_product($1::jsonb,$2::jsonb)', [
          JSON.stringify({ ...record, price: 999 }),
          JSON.stringify([{ ...images[0], storage_path: 'another-unit/private.webp' }]),
        ]),
      ),
    ).rejects.toThrow(/invalid_image_path/)
    const p = await db.query<{ price: string }>('select price from public.products where id=$1', [
      product,
    ])
    expect(Number(p.rows[0].price)).toBe(100)
    const im = await db.query('select * from public.product_images where product_id=$1', [product])
    expect(im.rows).toHaveLength(1)
  })
  it('only approved and permitted reviews are public', async () => {
    await db.exec(
      "insert into public.reviews(display_name,body,permission_to_publish,is_approved) values('Hidden','Not public',false,false),('Visible','Public',true,true)",
    )
    const r = await as('anon', null, () =>
      db.query<{ display_name: string }>('select display_name from public.reviews'),
    )
    expect(r.rows.map((x) => x.display_name)).toEqual(['Visible'])
    await expect(
      db.exec(
        "insert into public.reviews(display_name,body,permission_to_publish,is_approved) values('Invalid','No permission',false,true)",
      ),
    ).rejects.toThrow(/review_permission/)
  })
  it('private photos cannot be selected by public or ordinary authenticated users', async () => {
    const anon = await as('anon', null, () =>
      db.query<{ bucket_id: string }>('select bucket_id from storage.objects'),
    )
    expect(anon.rows.map((r) => r.bucket_id)).toEqual(['product-images'])
    const regular = await as('authenticated', visitor, () =>
      db.query<{ bucket_id: string }>('select bucket_id from storage.objects'),
    )
    expect(regular.rows.map((r) => r.bucket_id)).toEqual(['product-images'])
    const allowed = await as('authenticated', admin, () =>
      db.query('select * from storage.objects'),
    )
    expect(allowed.rows).toHaveLength(2)
    await expect(
      as('authenticated', visitor, () =>
        db.exec("insert into storage.objects(bucket_id,name) values('product-images','bad.webp')"),
      ),
    ).rejects.toThrow(/row-level security/)
  })
  it('a promo disappears automatically when the associated unit is sold', async () => {
    const id = crypto.randomUUID()
    await as('authenticated', owner, () =>
      db.query('select public.save_promotion($1::jsonb,$2::uuid[])', [
        JSON.stringify({
          id,
          title: 'Test',
          slug: 'test-promo',
          description: 'Test',
          banner_path: null,
          terms: 'Test',
          start_at: new Date(Date.now() - 60000).toISOString(),
          end_at: new Date(Date.now() + 60000).toISOString(),
          is_active: true,
        }),
        [product],
      ]),
    )
    const visible = await as('anon', null, () => db.query('select * from public.promotions'))
    expect(visible.rows).toHaveLength(1)
    await as('authenticated', owner, () =>
      db.query("update public.products set status='sold' where id=$1", [product]),
    )
    const hidden = await as('anon', null, () => db.query('select * from public.promotions'))
    expect(hidden.rows).toHaveLength(0)
    const p = await as('anon', null, () =>
      db.query<{ status: string; stock_quantity: number }>(
        'select status,stock_quantity from public.products where id=$1',
        [product],
      ),
    )
    expect(p.rows[0]).toEqual({ status: 'sold', stock_quantity: 0 })
  })
  it('enforces persistent rate limits and blocks access to the limiter from visitors', async () => {
    await expect(
      as('authenticated', visitor, () =>
        db.query('select public.check_tradein_rate_limit($1)', ['f'.repeat(64)]),
      ),
    ).rejects.toThrow(/permission denied/)
    const outcomes: boolean[] = []
    for (let i = 0; i < 6; i++) {
      const result = await as('service_role', null, () =>
        db.query<{ allowed: boolean }>('select public.check_tradein_rate_limit($1) as allowed', [
          'f'.repeat(64),
        ]),
      )
      outcomes.push(result.rows[0].allowed)
    }
    expect(outcomes).toEqual([true, true, true, true, true, false])
  })
  it('store managers can read the audit trail but cannot erase it', async () => {
    const ownerLogs = await as('authenticated', owner, () =>
      db.query('select * from public.admin_audit_logs'),
    )
    expect(ownerLogs.rows.length).toBeGreaterThan(0)
    const adminLogs = await as('authenticated', admin, () =>
      db.query('select * from public.admin_audit_logs'),
    )
    expect(adminLogs.rows.length).toBeGreaterThan(0)
    await expect(
      as('authenticated', owner, () => db.exec('delete from public.admin_audit_logs')),
    ).rejects.toThrow(/permission denied/)
  })
  it('admin can create, update and delete products and manage store content and media', async () => {
    const id = crypto.randomUUID()
    const copy = {
      ...record,
      id,
      sku: 'ADMIN-WRITE',
      slug: 'admin-write',
      status: 'draft',
      condition_label: 'Baik',
    }
    const photo = [{ ...images[0], storage_path: `products/${id}/admin.webp` }]
    await as('authenticated', admin, () =>
      db.query('select public.save_product_v2($1::jsonb,$2::jsonb)', [
        JSON.stringify(copy),
        JSON.stringify(photo),
      ]),
    )
    const changed = await as('authenticated', admin, () =>
      db.query<{ price: number }>('update public.products set price=250 where id=$1 returning price', [id]),
    )
    expect(Number(changed.rows[0].price)).toBe(250)
    await as('authenticated', admin, () =>
      db.query('select public.save_product($1::jsonb,$2::jsonb)', [
        JSON.stringify({ ...copy, price: 300 }),
        JSON.stringify(photo),
      ]),
    )
    const promotion = {
      id: crypto.randomUUID(),
      title: 'Admin promo',
      slug: 'admin-promo',
      description: 'Promo',
      terms: 'Syarat',
      start_at: new Date().toISOString(),
      end_at: new Date(Date.now() + 86400000).toISOString(),
      is_active: false,
    }
    await as('authenticated', admin, () =>
      db.query('select public.save_promotion($1::jsonb,$2::uuid[])', [
        JSON.stringify(promotion),
        [id],
      ]),
    )
    const review = await db.query<{ id: string }>(
      "insert into public.reviews(display_name,body,rating,permission_to_publish) values('Admin moderation','Genuine customer review',5,true) returning id",
    )
    const moderated = await as('authenticated', admin, () =>
      db.query('update public.reviews set is_approved=true where id=$1 returning id', [
        review.rows[0].id,
      ]),
    )
    expect(moderated.rows).toHaveLength(1)
    const trade = await db.query<{ id: string }>(
      "insert into public.trade_in_requests(reference_code,name,phone,brand,model,condition_notes,consent_at) values('ADMIN-DELETE','Customer','6281234567890','Brand','Model','Notes',now()) returning id",
    )
    const updatedTrade = await as('authenticated', admin, () =>
      db.query("update public.trade_in_requests set status='completed' where id=$1 returning id", [
        trade.rows[0].id,
      ]),
    )
    expect(updatedTrade.rows).toHaveLength(1)
    const deletedTrade = await as('authenticated', admin, () =>
      db.query('delete from public.trade_in_requests where id=$1 returning id', [trade.rows[0].id]),
    )
    expect(deletedTrade.rows).toHaveLength(1)
    await as('authenticated', admin, () =>
      db.exec(
        "insert into storage.objects(bucket_id,name) values('product-images','admin-upload.webp')",
      ),
    )
    const removedImage = await as('authenticated', admin, () =>
      db.query(
        "delete from storage.objects where bucket_id='product-images' and name='admin-upload.webp' returning id",
      ),
    )
    expect(removedImage.rows).toHaveLength(1)
    await db.exec(
      "insert into storage.objects(bucket_id,name) values('trade-in-private','admin-delete.webp')",
    )
    const removedPrivate = await as('authenticated', admin, () =>
      db.query(
        "delete from storage.objects where bucket_id='trade-in-private' and name='admin-delete.webp' returning id",
      ),
    )
    expect(removedPrivate.rows).toHaveLength(1)
    const deleted = await as('authenticated', admin, () =>
      db.query('delete from public.products where id=$1 returning id', [id]),
    )
    expect(deleted.rows).toHaveLength(1)
    const deletedPhotos = await db.query(
      'select id from public.product_images where product_id=$1',
      [id],
    )
    expect(deletedPhotos.rows).toHaveLength(0)
  })
  it('owner can permanently delete a product and its photo metadata', async () => {
    const id = crypto.randomUUID()
    await as('authenticated', owner, () =>
      db.query('select public.save_product($1::jsonb,$2::jsonb)', [
        JSON.stringify({ ...record, id, sku: 'DELETE-TEST', slug: 'delete-test', status: 'draft' }),
        JSON.stringify([{ ...images[0], storage_path: `products/${id}/delete.webp` }]),
      ]),
    )
    const result = await as('authenticated', owner, () =>
      db.query('delete from public.products where id=$1 returning id', [id]),
    )
    expect(result.rows).toHaveLength(1)
    const photos = await db.query('select id from public.product_images where product_id=$1', [id])
    expect(photos.rows).toHaveLength(0)
  })
})
