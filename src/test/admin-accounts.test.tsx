import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { beforeEach, expect, it, vi } from 'vitest'
import Accounts from '../features/admin/Accounts'
const mocks = vi.hoisted(() => ({ invoke: vi.fn(), saved: vi.fn() }))
vi.mock('../lib/supabase', () => ({
  requireSupabase: () => ({ functions: { invoke: mocks.invoke } }),
}))
beforeEach(() => {
  mocks.saved.mockReset()
  mocks.invoke
    .mockReset()
    .mockImplementation(async (_name: string, { body }: { body: { action: string } }) => ({
      data: body.action === 'list' ? { success: true, accounts: [] } : { success: true },
      error: null,
    }))
})
async function fillForm(password = 'Test-password-42', confirmation = password) {
  render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
      <Accounts currentId="owner" saved={mocks.saved} />
    </QueryClientProvider>,
  )
  fireEvent.click(await screen.findByRole('button', { name: 'Tambah admin' }))
  fireEvent.change(screen.getByLabelText('Nama admin'), { target: { value: 'New admin' } })
  fireEvent.change(screen.getByLabelText('Email admin'), { target: { value: 'new@example.com' } })
  fireEvent.change(screen.getByLabelText('Password awal (minimal 12 karakter)'), {
    target: { value: password },
  })
  fireEvent.change(screen.getByLabelText('Konfirmasi password awal'), {
    target: { value: confirmation },
  })
}
it('sends a create request with an initial password, then clears the form on success', async () => {
  await fillForm()
  fireEvent.click(screen.getByRole('button', { name: 'Buat akun admin' }))
  await waitFor(() =>
    expect(mocks.saved).toHaveBeenCalledWith(
      'Akun admin berhasil dibuat dan dapat langsung login.',
    ),
  )
  expect(mocks.invoke).toHaveBeenCalledWith('manage-admin', {
    body: {
      action: 'create',
      user_id: undefined,
      display_name: 'New admin',
      email: 'new@example.com',
      role: 'admin',
      password: 'Test-password-42',
    },
  })
  expect(screen.queryByLabelText('Password awal (minimal 12 karakter)')).not.toBeInTheDocument()
  expect(mocks.invoke.mock.calls.some(([, { body }]) => body.action === 'invite')).toBe(false)
})
it('does not submit when password confirmation differs', async () => {
  await fillForm('Test-password-42', 'Different-password-42')
  fireEvent.click(screen.getByRole('button', { name: 'Buat akun admin' }))
  expect(screen.getAllByText('Konfirmasi password awal belum sama.').length).toBeGreaterThan(0)
  expect(mocks.invoke.mock.calls.every(([, { body }]) => body.action === 'list')).toBe(true)
  expect(mocks.saved).not.toHaveBeenCalled()
})
