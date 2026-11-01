// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createManageAdminHandler } from '../../supabase/functions/manage-admin/handler.ts'

const ownerId = 'a0000000-0000-4000-8000-000000000001'
const adminId = 'a0000000-0000-4000-8000-000000000002'
const origin = 'https://store.example'
let viewer, targetRole, db, handler, profileInsert
function request(body, token = 'user-session') {
  return new Request('https://api.example/functions/v1/manage-admin', {
    method: 'POST',
    headers: {
      origin,
      'content-type': 'application/json',
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  })
}
beforeEach(() => {
  viewer = 'owner'
  targetRole = 'admin'
  vi.stubGlobal('Deno', {
    env: {
      get: (key) =>
        ({
          SUPABASE_URL: 'https://api.example',
          SUPABASE_SERVICE_ROLE_KEY: 'test-only-key',
          SITE_URL: origin,
          ALLOWED_ORIGINS: origin,
        })[key],
    },
  })
  profileInsert = vi.fn(async () => ({ error: null }))
  db = {
    auth: {
      getUser: vi.fn(async () => ({ data: { user: { id: ownerId } }, error: null })),
      admin: {
        getUserById: vi.fn(async (id) => ({
          data: { user: { id, email: 'admin@example.com' } },
          error: null,
        })),
        createUser: vi.fn(async () => ({ data: { user: { id: adminId } }, error: null })),
        inviteUserByEmail: vi.fn(),
        updateUserById: vi.fn(async () => ({ error: null })),
        deleteUser: vi.fn(async () => ({ error: null })),
      },
    },
    from: vi.fn((table) => {
      let identity = ownerId
      const query = {
        select: () => query,
        eq: (_field, value) => {
          identity = value
          return query
        },
        maybeSingle: async () => ({
          data: { user_id: identity, role: identity === ownerId ? viewer : targetRole },
          error: null,
        }),
        order: async () => ({
          data: [{ user_id: adminId, display_name: 'Admin', role: 'admin' }],
          error: null,
        }),
        insert: table === 'admin_profiles' ? profileInsert : vi.fn(async () => ({ error: null })),
        update: () => query,
        then: (resolve) => Promise.resolve({ data: null, error: null }).then(resolve),
      }
      return query
    }),
  }
  handler = createManageAdminHandler(() => db)
})
afterEach(() => vi.unstubAllGlobals())
describe('owner-only admin account management', () => {
  it('requires a verified user session before any role or Auth mutation', async () => {
    expect((await handler(request({ action: 'list' }, ''))).status).toBe(401)
    expect(db.from).not.toHaveBeenCalled()
    db.auth.getUser.mockResolvedValueOnce({ data: { user: null }, error: new Error('expired') })
    expect((await handler(request({ action: 'create' }))).status).toBe(401)
    expect(db.auth.admin.createUser).not.toHaveBeenCalled()
    expect(db.auth.admin.inviteUserByEmail).not.toHaveBeenCalled()
  })
  it('rejects monitoring admins for every account operation', async () => {
    viewer = 'admin'
    for (const action of ['list', 'create', 'update', 'delete']) {
      expect((await handler(request({ action, user_id: adminId }))).status).toBe(403)
    }
    expect(db.auth.admin.createUser).not.toHaveBeenCalled()
    expect(db.auth.admin.inviteUserByEmail).not.toHaveBeenCalled()
    expect(db.auth.admin.updateUserById).not.toHaveBeenCalled()
    expect(db.auth.admin.deleteUser).not.toHaveBeenCalled()
  })
  it('lets owner read admin profiles and Auth emails', async () => {
    const response = await handler(request({ action: 'list' }))
    expect(response.status).toBe(200)
    expect((await response.json()).accounts).toEqual([
      { user_id: adminId, display_name: 'Admin', role: 'admin', email: 'admin@example.com' },
    ])
  })
  it('creates an immediately usable Auth user and monitoring admin profile without invitation', async () => {
    const response = await handler(
      request({
        action: 'create',
        email: 'new@example.com',
        display_name: 'New admin',
        password: 'Test-password-42',
        role: 'admin',
      }),
    )
    expect(response.status).toBe(201)
    expect(await response.json()).toEqual({ success: true, user_id: adminId })
    expect(db.auth.admin.createUser).toHaveBeenCalledWith({
      email: 'new@example.com',
      password: 'Test-password-42',
      email_confirm: true,
      user_metadata: { display_name: 'New admin' },
    })
    expect(profileInsert).toHaveBeenCalledWith({
      user_id: adminId,
      display_name: 'New admin',
      role: 'admin',
    })
    expect(db.auth.admin.inviteUserByEmail).not.toHaveBeenCalled()
  })
  it('rejects missing/short passwords and owner-role creation before calling Auth', async () => {
    for (const change of [
      { password: undefined },
      { password: 'short' },
      { password: 'x'.repeat(129) },
      { role: 'owner' },
    ]) {
      const response = await handler(
        request({
          action: 'create',
          email: 'new@example.com',
          display_name: 'New admin',
          password: 'Test-password-42',
          role: 'admin',
          ...change,
        }),
      )
      expect(response.status).toBe(400)
    }
    expect(db.auth.admin.createUser).not.toHaveBeenCalled()
  })
  it('rolls back only the newly created Auth user if profile insertion fails', async () => {
    profileInsert.mockResolvedValueOnce({ error: new Error('profile insert failed') })
    const response = await handler(
      request({
        action: 'create',
        email: 'new@example.com',
        display_name: 'New admin',
        password: 'Test-password-42',
      }),
    )
    expect(response.status).toBe(503)
    expect(db.auth.admin.deleteUser).toHaveBeenCalledExactlyOnceWith(adminId)
  })
  it('rejects duplicate emails without deleting an existing Auth user', async () => {
    db.auth.admin.createUser.mockResolvedValueOnce({
      data: { user: null },
      error: { code: 'email_exists' },
    })
    const response = await handler(
      request({
        action: 'create',
        email: 'existing@example.com',
        display_name: 'Admin',
        password: 'Test-password-42',
      }),
    )
    expect(response.status).toBe(409)
    expect(profileInsert).not.toHaveBeenCalled()
    expect(db.auth.admin.deleteUser).not.toHaveBeenCalled()
  })
  it('no longer accepts the old invitation operation', async () => {
    expect((await handler(request({ action: 'invite' }))).status).toBe(400)
    expect(db.auth.admin.inviteUserByEmail).not.toHaveBeenCalled()
  })
  it('protects own account and other owner accounts from deletion', async () => {
    expect((await handler(request({ action: 'delete', user_id: ownerId }))).status).toBe(403)
    targetRole = 'owner'
    expect((await handler(request({ action: 'delete', user_id: adminId }))).status).toBe(403)
    expect(db.auth.admin.deleteUser).not.toHaveBeenCalled()
  })
  it('updates and deletes an admin Auth account as owner', async () => {
    expect(
      (
        await handler(
          request({
            action: 'update',
            user_id: adminId,
            email: 'updated@example.com',
            display_name: 'Updated admin',
          }),
        )
      ).status,
    ).toBe(200)
    expect(db.auth.admin.updateUserById).toHaveBeenCalledWith(adminId, {
      email: 'updated@example.com',
    })
    expect((await handler(request({ action: 'delete', user_id: adminId }))).status).toBe(200)
    expect(db.auth.admin.deleteUser).toHaveBeenCalledWith(adminId)
  })
})
