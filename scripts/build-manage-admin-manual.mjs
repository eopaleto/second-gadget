import { readFile, mkdir, writeFile } from 'node:fs/promises'
const root = new URL('../', import.meta.url)
const handler = await readFile(new URL('supabase/functions/manage-admin/handler.ts', root), 'utf8')
const http = await readFile(new URL('supabase/functions/_shared/http.ts', root), 'utf8')
const sdk = handler.match(/from '(npm:@supabase\/supabase-js@[^']+)'/)[1]
const output = `// Standalone Dashboard version. Paste the entire file into manage-admin/index.ts.
// Generated from the tested handler and shared HTTP helpers.
import { createClient, type SupabaseClient } from '${sdk}'

${http}
${handler.replace(/^import[^\n]+\n/gm, '')}
Deno.serve(createManageAdminHandler(createClient))
`
await mkdir(new URL('supabase/manual/', root), { recursive: true })
await writeFile(new URL('supabase/manual/manage-admin.ts', root), output)
console.log('Generated supabase/manual/manage-admin.ts (direct account creation).')
