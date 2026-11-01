import type { SupabaseClient } from 'npm:@supabase/supabase-js@2.118.0'
import { cors, json, limitedBody } from '../_shared/http.ts'

type ClientFactory = (
  url: string,
  key: string,
  options: { auth: { persistSession: boolean; autoRefreshToken: boolean } },
) => SupabaseClient
export function createManageAdminHandler(createClient: ClientFactory) {
  return async (req: Request) => {
    const headers = cors(req)
    if (!headers) return json({ error: 'Origin tidak diizinkan.' }, 403)
    if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers })
    if (req.method !== 'POST') return json({ error: 'Metode tidak diizinkan.' }, 405, headers)
    const url = Deno.env.get('SUPABASE_URL'),
      serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    if (!url || !serviceKey) return json({ error: 'Layanan belum dikonfigurasi.' }, 503, headers)
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
      const action = payload.action || 'create'
      if (action === 'list') {
        const { data: profiles, error } = await db
          .from('admin_profiles')
          .select('*')
          .order('created_at')
        if (error) return json({ error: 'Daftar akun tidak dapat dibaca.' }, 503, headers)
        const accounts = await Promise.all(
          (profiles || []).map(async (profile) => {
            const result = await db.auth.admin.getUserById(profile.user_id)
            if (result.error) throw result.error
            return { ...profile, email: result.data.user?.email || '' }
          }),
        )
        return json({ success: true, accounts }, 200, headers)
      }
      if (!['create', 'update', 'delete'].includes(action))
        return json({ error: 'Operasi akun tidak dikenal.' }, 400, headers)

      const targetId = String(payload.user_id || '')
      if (action !== 'create') {
        if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(targetId))
          return json({ error: 'ID akun tidak valid.' }, 400, headers)
        if (targetId === user.id)
          return json({ error: 'Gunakan Pengaturan untuk mengubah akun sendiri.' }, 403, headers)
        const { data: target, error } = await db
          .from('admin_profiles')
          .select('*')
          .eq('user_id', targetId)
          .maybeSingle()
        if (error || !target) return json({ error: 'Akun tidak ditemukan.' }, 404, headers)
        if (target.role !== 'admin')
          return json(
            { error: 'Akun owner tidak dapat diubah atau dihapus melalui menu admin.' },
            403,
            headers,
          )
      }
      if (action === 'delete') {
        const { error } = await db.auth.admin.deleteUser(targetId)
        if (error) return json({ error: 'Akun belum dapat dihapus.' }, 400, headers)
        await db.from('admin_audit_logs').insert({
          actor_user_id: user.id,
          action: 'DELETE_ACCOUNT',
          entity_type: 'admin_profiles',
          entity_id: targetId,
        })
        return json({ success: true }, 200, headers)
      }
      const email = String(payload.email || '').trim(),
        name = String(payload.display_name || '').trim()
      if (
        !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
        email.length > 254 ||
        !name ||
        name.length > 100 ||
        (payload.role && payload.role !== 'admin')
      )
        return json({ error: 'Isian akun admin tidak valid.' }, 400, headers)
      if (action === 'update') {
        const previous = await db.auth.admin.getUserById(targetId)
        if (previous.error || !previous.data.user)
          return json({ error: 'Akun Auth tidak ditemukan.' }, 404, headers)
        const { error: authFailure } = await db.auth.admin.updateUserById(targetId, { email })
        if (authFailure)
          return json(
            { error: 'Email belum dapat diperbarui. Pastikan email belum digunakan.' },
            400,
            headers,
          )
        const { error: profileFailure } = await db
          .from('admin_profiles')
          .update({ display_name: name })
          .eq('user_id', targetId)
        if (profileFailure) {
          if (previous.data.user.email)
            await db.auth.admin.updateUserById(targetId, { email: previous.data.user.email })
          return json(
            { error: 'Profil belum dapat diperbarui. Periksa kembali email akun.' },
            503,
            headers,
          )
        }
        await db.from('admin_audit_logs').insert({
          actor_user_id: user.id,
          action: 'UPDATE_ACCOUNT',
          entity_type: 'admin_profiles',
          entity_id: targetId,
        })
        return json({ success: true }, 200, headers)
      }
      const password = typeof payload.password === 'string' ? payload.password : ''
      if (password.length < 12 || password.length > 128)
        return json(
          { error: 'Password awal harus terdiri dari 12 sampai 128 karakter.' },
          400,
          headers,
        )
      const { data: created, error } = await db.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { display_name: name },
      })
      if (error || !created.user)
        return json(
          {
            error:
              error?.code === 'email_exists' || error?.code === 'user_already_exists'
                ? 'Email sudah digunakan. Gunakan email lain atau ubah akun yang sudah ada.'
                : 'Akun belum berhasil dibuat. Periksa email dan kebijakan password.',
          },
          error?.code === 'email_exists' || error?.code === 'user_already_exists' ? 409 : 400,
          headers,
        )
      const { error: profileError } = await db
        .from('admin_profiles')
        .insert({ user_id: created.user.id, display_name: name, role: 'admin' })
      if (profileError) {
        const rollback = await db.auth.admin.deleteUser(created.user.id)
        return json(
          {
            error: rollback.error
              ? 'Akun Auth dibuat tetapi profil admin gagal. Pengelola perlu memeriksa akun tersebut di Supabase Authentication.'
              : 'Profil admin belum berhasil dibuat. Pembuatan akun dibatalkan; silakan coba kembali.',
          },
          503,
          headers,
        )
      }
      await db.from('admin_audit_logs').insert({
        actor_user_id: user.id,
        action: 'CREATE_ACCOUNT',
        entity_type: 'admin_profiles',
        entity_id: created.user.id,
      })
      return json({ success: true, user_id: created.user.id }, 201, headers)
    } catch {
      return json({ error: 'Pengelolaan akun belum dapat diproses.' }, 400, headers)
    }
  }
}
