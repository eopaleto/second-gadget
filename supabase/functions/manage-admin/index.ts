import { createClient } from 'npm:@supabase/supabase-js@2.118.0'
import { cors, json, limitedBody } from '../_shared/http.ts'

Deno.serve(async (req) => {
  const headers = cors(req)
  if (!headers) return json({ error: 'Origin tidak diizinkan.' }, 403)
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers })
  if (req.method !== 'POST') return json({ error: 'Metode tidak diizinkan.' }, 405, headers)
  const url = Deno.env.get('SUPABASE_URL'),
    serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'),
    site = Deno.env.get('SITE_URL')
  if (!url || !serviceKey || !site)
    return json({ error: 'Layanan belum dikonfigurasi.' }, 503, headers)
  const db = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
  const token = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '')
  if (!token) return json({ error: 'Autentikasi diperlukan.' }, 401, headers)
  // Gateway JWT checks are disabled for compatibility with publishable keys;
  // the caller JWT is always verified with Auth before any privileged operation.
  const {
    data: { user },
    error: authError,
  } = await db.auth.getUser(token)
  if (authError || !user) return json({ error: 'Sesi tidak valid.' }, 401, headers)
  const { data: owner } = await db
    .from('admin_profiles')
    .select('role')
    .eq('user_id', user.id)
    .maybeSingle()
  if (owner?.role !== 'owner') return json({ error: 'Akses khusus owner.' }, 403, headers)
  try {
    const payload = await (await limitedBody(req, 4096)).json()
    const email = String(payload.email || '').trim(),
      name = String(payload.display_name || '').trim(),
      role = payload.role
    if (
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
      email.length > 254 ||
      !name ||
      name.length > 100 ||
      !['admin', 'owner'].includes(role)
    )
      return json({ error: 'Isian undangan tidak valid.' }, 400, headers)
    const { data: invitation, error } = await db.auth.admin.inviteUserByEmail(email, {
      redirectTo: `${site.replace(/\/$/, '')}/admin/atur-password`,
    })
    if (error || !invitation.user)
      return json(
        { error: 'Undangan belum terkirim. Periksa email dan konfigurasi pengiriman.' },
        400,
        headers,
      )
    const { error: profileError } = await db
      .from('admin_profiles')
      .insert({ user_id: invitation.user.id, display_name: name, role })
    if (profileError) {
      return json(
        {
          error:
            'Email undangan terkirim, tetapi akses admin belum diaktifkan. Periksa profil akun melalui dashboard Supabase.',
        },
        503,
        headers,
      )
    }
    await db.from('admin_audit_logs').insert({
      actor_user_id: user.id,
      action: 'INVITE',
      entity_type: 'admin_profiles',
      entity_id: invitation.user.id,
    })
    return json({ success: true }, 200, headers)
  } catch {
    return json({ error: 'Undangan belum dapat diproses.' }, 400, headers)
  }
})
