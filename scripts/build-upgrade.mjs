import { readFile, writeFile, mkdir } from 'node:fs/promises'
await mkdir('artifacts', { recursive: true })
const sql = await Promise.all(
  [
    '202610290002_catalog_reviews.sql',
    '202610290003_reference_catalog.sql',
    '202610310001_owner_monitoring.sql',
    '202611010001_admin_store_access.sql',
  ].map((n) => readFile(`supabase/migrations/${n}`, 'utf8')),
)
await writeFile(
  'artifacts/upgrade-catalog.sql',
  '-- Run on the existing database after migration 001. No inventory is deleted or generated.\n' +
    sql.join('\n\n'),
)
