import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Pencil, Plus, Trash2 } from 'lucide-react'
import { Button, Dialog, EmptyState, Field, Loading, inputClass } from '../../components/ui'
import { requireSupabase } from '../../lib/supabase'
import type { AdminProfile } from '../../types'
type Account = AdminProfile & { email?: string }
async function manage(body: Record<string, unknown>) {
  const { data, error } = await requireSupabase().functions.invoke('manage-admin', { body })
  if (error || !data?.success) {
    if (error?.context?.status === 404)
      throw new Error(
        'Fungsi pengelolaan akun belum terpasang di Supabase. Deploy fungsi manage-admin terlebih dahulu.',
      )
    let message =
      data?.error || 'Akun belum berhasil diproses. Periksa akses owner dan fungsi manage-admin.'
    try {
      const result = await error?.context?.json()
      if (result?.error) message = result.error
    } catch {}
    throw new Error(message)
  }
  return data
}
export async function readAdminAccounts(): Promise<Account[]> {
  return (await manage({ action: 'list' })).accounts
}
export default function Accounts({
  currentId,
  saved,
}: {
  currentId: string
  saved: (message: string) => void
}) {
  const [editing, setEditing] = useState<{
    id?: string
    name: string
    email: string
    password?: string
    confirmation?: string
  } | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const {
    data: accounts = [],
    isPending,
    isError,
    error: loadError,
    refetch,
  } = useQuery({
    queryKey: ['admin-accounts', currentId],
    queryFn: readAdminAccounts,
    retry: false,
  })
  async function submit(event: React.FormEvent) {
    event.preventDefault()
    if (!editing) return
    if (!editing.id && editing.password !== editing.confirmation) {
      setError('Konfirmasi password awal belum sama.')
      return
    }
    setBusy(true)
    setError('')
    try {
      await manage({
        action: editing.id ? 'update' : 'create',
        user_id: editing.id,
        display_name: editing.name,
        email: editing.email,
        role: 'admin',
        ...(!editing.id ? { password: editing.password } : {}),
      })
      saved(
        editing.id
          ? 'Akun admin diperbarui.'
          : 'Akun admin berhasil dibuat dan dapat langsung login.',
      )
      setEditing(null)
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'Perubahan gagal.')
    } finally {
      setBusy(false)
    }
  }
  async function remove(account: Account) {
    if (
      account.user_id === currentId ||
      account.role !== 'admin' ||
      !window.confirm(`Hapus akun admin ${account.display_name}? Akun tidak dapat login kembali.`)
    )
      return
    setBusy(true)
    setError('')
    try {
      await manage({ action: 'delete', user_id: account.user_id })
      saved('Akun admin telah dihapus.')
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'Penghapusan gagal.')
    } finally {
      setBusy(false)
    }
  }
  if (isPending) return <Loading label="Memuat akun admin..." />
  if (isError)
    return (
      <section className="rounded-xl border border-line bg-white p-5">
        <h1 className="text-xl font-bold">Akun admin belum dapat dimuat.</h1>
        <p role="alert" className="my-4 text-sm leading-7 text-muted">
          {loadError instanceof Error
            ? loadError.message
            : 'Periksa konfigurasi fungsi pengelolaan akun.'}
        </p>
        <Button secondary onClick={() => void refetch()}>
          Coba lagi
        </Button>
      </section>
    )
  return (
    <section>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold">Akun admin.</h1>
        </div>
        <Button
          onClick={() => {
            setError('')
            setEditing({ name: '', email: '', password: '', confirmation: '' })
          }}
        >
          <Plus size={17} />
          Tambah admin
        </Button>
      </div>
      {error && (
        <p role="alert" className="mb-4 rounded-lg bg-danger/5 p-4 text-sm text-danger">
          {error}
        </p>
      )}
      {accounts.length ? (
        <div className="space-y-3">
          {accounts.map((account) => (
            <article
              key={account.user_id}
              className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-line bg-white p-4 sm:p-5"
            >
              <div className="min-w-0 flex-1">
                <h2 className="break-words text-sm font-bold">
                  {account.display_name}
                  {account.user_id === currentId ? ' (kamu)' : ''}
                </h2>
                <p className="mt-1 break-all text-xs text-muted">
                  {account.email || 'Email belum tersedia'}
                </p>
                <span className="mt-2 inline-block rounded bg-paper px-2 py-1 text-[11px] capitalize">
                  {account.role}
                </span>
              </div>
              {account.role === 'admin' && account.user_id !== currentId && (
                <div className="flex flex-wrap gap-2">
                  <Button
                    secondary
                    disabled={busy}
                    onClick={() => {
                      setError('')
                      setEditing({
                        id: account.user_id,
                        name: account.display_name,
                        email: account.email || '',
                      })
                    }}
                  >
                    <Pencil size={15} />
                    Ubah
                  </Button>
                  <Button
                    secondary
                    disabled={busy}
                    className="!text-danger"
                    onClick={() => void remove(account)}
                  >
                    <Trash2 size={15} />
                    Hapus
                  </Button>
                </div>
              )}
            </article>
          ))}
        </div>
      ) : (
        <EmptyState
          title="Belum ada akun admin."
          description="Tambahkan akun admin untuk mengelola toko."
        />
      )}
      <Dialog
        open={editing !== null}
        onClose={() => {
          if (!busy) setEditing(null)
        }}
        title={editing?.id ? 'Ubah akun admin' : 'Tambah akun admin'}
      >
        {editing && (
          <form onSubmit={submit} className="space-y-5">
            <Field label="Nama admin" htmlFor="admin-name">
              <input
                id="admin-name"
                required
                maxLength={100}
                className={inputClass}
                disabled={busy}
                value={editing.name}
                onChange={(event) => setEditing({ ...editing, name: event.target.value })}
              />
            </Field>
            <Field label="Email admin" htmlFor="admin-email">
              <input
                id="admin-email"
                type="email"
                required
                maxLength={254}
                className={inputClass}
                disabled={busy}
                value={editing.email}
                onChange={(event) => setEditing({ ...editing, email: event.target.value })}
              />
            </Field>
            {!editing.id && (
              <>
                <Field label="Password awal (minimal 12 karakter)" htmlFor="admin-password">
                  <input
                    id="admin-password"
                    type="password"
                    autoComplete="new-password"
                    required
                    minLength={12}
                    maxLength={128}
                    className={inputClass}
                    disabled={busy}
                    value={editing.password || ''}
                    onChange={(event) => setEditing({ ...editing, password: event.target.value })}
                  />
                </Field>
                <Field label="Konfirmasi password awal" htmlFor="admin-password-confirm">
                  <input
                    id="admin-password-confirm"
                    type="password"
                    autoComplete="new-password"
                    required
                    minLength={12}
                    maxLength={128}
                    className={inputClass}
                    disabled={busy}
                    value={editing.confirmation || ''}
                    onChange={(event) =>
                      setEditing({ ...editing, confirmation: event.target.value })
                    }
                  />
                </Field>
              </>
            )}
            <p className="rounded-lg bg-paper p-3 text-xs leading-6 text-muted">
              {!editing.id &&
                'Akun langsung aktif dan dapat login menggunakan email serta password awal. Password dapat diubah melalui Pengaturan.'}
            </p>
            {error && (
              <p role="alert" className="text-xs text-danger">
                {error}
              </p>
            )}
            <div className="flex flex-wrap gap-3">
              <Button disabled={busy}>
                {busy ? 'Memproses...' : editing.id ? 'Simpan perubahan' : 'Buat akun admin'}
              </Button>
              <Button type="button" secondary disabled={busy} onClick={() => setEditing(null)}>
                Batal
              </Button>
            </div>
          </form>
        )}
      </Dialog>
    </section>
  )
}
