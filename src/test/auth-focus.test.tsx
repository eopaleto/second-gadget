import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useState } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AuthProvider, useAuth } from '../app/Auth'
import { Dialog } from '../components/ui'

const mocks = vi.hoisted(() => ({
  callback: null as null | ((event: string, session: unknown) => void),
  profile: vi.fn(),
  getSession: vi.fn(),
}))
vi.mock('../lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: mocks.getSession,
      onAuthStateChange: (callback: typeof mocks.callback) => {
        mocks.callback = callback
        return { data: { subscription: { unsubscribe: vi.fn() } } }
      },
    },
    from: () => ({ select: () => ({ eq: () => ({ maybeSingle: mocks.profile }) }) }),
  },
}))
const session = { user: { id: 'owner-a' }, access_token: 'token-a' }
function Draft() {
  const [value, setValue] = useState(''),
    [open, setOpen] = useState(true)
  return (
    <Dialog open={open} onClose={() => setOpen(false)} title="Tambah barang">
      <label>
        Catatan barang
        <input value={value} onChange={(e) => setValue(e.target.value)} />
      </label>
    </Dialog>
  )
}
function Screen() {
  const auth = useAuth()
  return auth.loading ? <p>Memuat sesi</p> : auth.profile ? <Draft /> : <p>Keluar</p>
}
describe('tab switching and session renewal', () => {
  beforeEach(() => {
    mocks.profile
      .mockReset()
      .mockResolvedValue({ data: { user_id: 'owner-a', display_name: 'Owner', role: 'owner' } })
    mocks.getSession.mockReset().mockResolvedValue({ data: { session }, error: null })
  })
  it('keeps the modal, unsaved text and cache mounted for same-user focus and token events', async () => {
    const client = new QueryClient({
        defaultOptions: { queries: { retry: false, refetchOnWindowFocus: false } },
      }),
      clear = vi.spyOn(client, 'clear')
    render(
      <QueryClientProvider client={client}>
        <AuthProvider>
          <Screen />
        </AuthProvider>
      </QueryClientProvider>,
    )
    const field = await screen.findByLabelText('Catatan barang')
    fireEvent.change(field, { target: { value: 'Unit baru belum disimpan' } })
    client.setQueryData(['draft-cache'], { id: 1 })
    fireEvent(window, new Event('blur'))
    fireEvent(document, new Event('visibilitychange'))
    fireEvent(window, new Event('focus'))
    for (const event of ['SIGNED_IN', 'TOKEN_REFRESHED', 'SIGNED_IN']) {
      await act(async () => {
        mocks.callback!(event, { ...session, access_token: 'updated-token' })
        await new Promise((resolve) => setTimeout(resolve, 5))
      })
    }
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.getByLabelText('Catatan barang')).toHaveValue('Unit baru belum disimpan')
    expect(mocks.profile).toHaveBeenCalledTimes(1)
    expect(clear).not.toHaveBeenCalled()
    expect(client.getQueryData(['draft-cache'])).toEqual({ id: 1 })
  })
  it('clears previous-user data on sign out', async () => {
    const client = new QueryClient()
    render(
      <QueryClientProvider client={client}>
        <AuthProvider>
          <Screen />
        </AuthProvider>
      </QueryClientProvider>,
    )
    await screen.findByRole('dialog')
    client.setQueryData(['private'], { secret: 'private test value' })
    await act(async () => {
      mocks.callback!('SIGNED_OUT', null)
      await new Promise((resolve) => setTimeout(resolve, 5))
    })
    await waitFor(() => expect(screen.getByText('Keluar')).toBeInTheDocument())
    expect(client.getQueryData(['private'])).toBeUndefined()
  })
})
