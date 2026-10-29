import { loadEnv } from 'vite'
import { createClient } from '@supabase/supabase-js'
import {readFile} from 'node:fs/promises'
const env = { ...loadEnv('development', process.cwd(), ''), ...process.env }
const configured = Boolean(env.VITE_SUPABASE_URL && env.VITE_SUPABASE_PUBLISHABLE_KEY)
console.log(
  JSON.stringify({
    configured,
    managementTokenInEnvironment: Boolean(env.SUPABASE_ACCESS_TOKEN),
    turnstileSiteKeyConfigured: Boolean(env.VITE_TURNSTILE_SITE_KEY),
    databaseConnectionAvailable: Boolean(env.DATABASE_URL || env.SUPABASE_DB_URL),
  }),
)
if (!configured) process.exit(0)
const linkedProject=await readFile('supabase/.temp/project-ref','utf8').catch(()=>null)
console.log(JSON.stringify({linkedProjectMatchesFrontend:linkedProject ? new URL(env.VITE_SUPABASE_URL).hostname.split('.')[0]===linkedProject.trim() : null}))
const db = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_PUBLISHABLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
  global: { fetch: (input, init) => fetch(input, { ...init, signal: AbortSignal.timeout(15000) }) },
})
for (const [table, select] of [
  ['device_models', 'id'],
  ['products', 'condition_label,has_warranty,sold_at'],
  ['store_settings', 'payment_methods'],
]) {
  const { error } = await db.from(table).select(select).limit(1)
  console.log(JSON.stringify({ table, ready: !error, errorCode: error?.code || null }))
}
