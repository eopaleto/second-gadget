import { render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, expect, it, vi } from 'vitest'
import Admin from '../features/admin/Admin'
import { unit } from './fixtures'
const mocks = vi.hoisted(() => ({
  invoke: vi.fn(),
  readAll: vi.fn(),
  role: 'owner' as 'owner' | 'admin',
}))
vi.mock('../app/Auth', () => ({
  useAuth: () => ({
    loading: false,
    session: { user: { id: 'owner' } },
    profile: { user_id: 'viewer', display_name: 'Admin Gadget Second', role: mocks.role },
  }),
}))
vi.mock('../lib/supabase', () => ({
  supabase: null,
  isConfigured: true,
  imageUrl: (path: string) => path,
  requireSupabase: () => ({ functions: { invoke: mocks.invoke } }),
}))
vi.mock('../lib/data', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../lib/data')>()),
  readAll: mocks.readAll,
  useStore: () => ({ data: undefined }),
}))
beforeEach(() => {
  mocks.role = 'owner'
  mocks.invoke.mockReset().mockResolvedValue({
    data: null,
    error: { context: new Response(JSON.stringify({ code: 'NOT_FOUND' }), { status: 404 }) },
  })
  mocks.readAll
    .mockReset()
    .mockImplementation(async (table: string) => (table === 'products' ? [unit()] : []))
  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    value: () => ({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() }),
  })
})
function renderAdmin(path: string) {
  return render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
      <MemoryRouter initialEntries={[path]}>
        <Admin />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}
it('loads stock without invoking a missing manage-admin function', async () => {
  renderAdmin('/admin/produk')
  await screen.findByRole('heading', { name: 'Unit gadget.' })
  expect(screen.getAllByText('iPhone 13').length).toBeGreaterThan(0)
  expect(mocks.invoke).not.toHaveBeenCalled()
  expect(screen.queryByText('Data belum berhasil dimuat')).not.toBeInTheDocument()
})
it('isolates a missing function error on the account screen with a clear instruction', async () => {
  renderAdmin('/admin/akun')
  await screen.findByRole('heading', { name: 'Akun admin belum dapat dimuat.' })
  expect(screen.getByRole('alert')).toHaveTextContent('Deploy fungsi manage-admin')
  await waitFor(() => expect(mocks.invoke).toHaveBeenCalledTimes(1))
  expect(screen.queryByText('Data belum berhasil dimuat')).not.toBeInTheDocument()
})

it('admin can open product creation and edit controls without access to account management', async () => {
  mocks.role = 'admin'
  renderAdmin('/admin/produk')
  await screen.findByRole('heading', { name: 'Unit gadget.' })
  expect(screen.getByRole('button', { name: 'Tambah unit' })).toBeInTheDocument()
  expect(screen.getAllByRole('button', { name: /Ubah/ }).length).toBeGreaterThan(0)
  expect(screen.getAllByRole('button', { name: /Hapus/ }).length).toBeGreaterThan(0)
  expect(screen.queryByRole('link', { name: 'Akun admin' })).not.toBeInTheDocument()
  expect(screen.queryByText(/Mode monitoring|Owner mengelola akun/)).not.toBeInTheDocument()
  expect(screen.queryByText('Admin Gadget Second')).not.toBeInTheDocument()
})
it('admin cannot invoke account management by directly opening its URL', async () => {
  mocks.role = 'admin'
  renderAdmin('/admin/akun')
  await screen.findByText('Akses khusus owner.')
  expect(mocks.invoke).not.toHaveBeenCalled()
})
it('does not show the removed dashboard caption', async () => {
  renderAdmin('/admin')
  await screen.findByRole('heading', { name: 'Ringkasan toko.' })
  expect(
    screen.queryByText('Angka dari data yang tersimpan, termasuk unit yang dikelola admin.'),
  ).not.toBeInTheDocument()
})
