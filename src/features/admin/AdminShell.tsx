import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { ArrowUpRight, LogOut, Menu, X, type LucideIcon } from 'lucide-react'
import { Logo } from '../../components/layout'
import { requireSupabase } from '../../lib/supabase'
import type { AdminProfile } from '../../types'

type Item = readonly [string, string, LucideIcon]
export default function AdminShell({
  profile,
  items,
  children,
}: {
  profile: AdminProfile
  items: readonly Item[]
  children: ReactNode
}) {
  const [open, setOpen] = useState(false)
  const dialog = useRef<HTMLDialogElement>(null)
  const trigger = useRef<HTMLButtonElement>(null)
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const query = useQueryClient()
  const visible = items.filter(([key]) => key !== 'akun' || profile.role === 'owner')
  useEffect(() => {
    setOpen(false)
  }, [pathname])
  useEffect(() => {
    const element = dialog.current
    if (!element) return
    if (open && !element.open) element.showModal()
    if (!open && element.open) element.close()
    if (!open) return
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = previous
    }
  }, [open])
  useEffect(() => {
    const screen = window.matchMedia('(min-width: 1024px)')
    const resize = () => {
      if (screen.matches) setOpen(false)
    }
    screen.addEventListener('change', resize)
    return () => screen.removeEventListener('change', resize)
  }, [])
  async function logout() {
    await requireSupabase().auth.signOut()
    query.clear()
    navigate('/admin/login')
  }
  function navigation() {
    return (
      <>
        <div className="flex min-h-20 shrink-0 items-center justify-between gap-3 border-b border-line px-5">
          <Logo />
          <button
            type="button"
            aria-label="Tutup menu admin"
            className="flex size-11 shrink-0 items-center justify-center rounded-lg hover:bg-paper lg:hidden"
            onClick={() => setOpen(false)}
          >
            <X size={20} />
          </button>
        </div>
        <nav aria-label="Navigasi admin" className="flex-1 space-y-1 overflow-y-auto p-3">
          {visible.map(([key, label, Icon]) => (
            <NavLink
              key={key}
              end
              to={`/admin${key ? `/${key}` : ''}`}
              onClick={() => setOpen(false)}
              className={({ isActive }) =>
                `flex min-h-12 items-center gap-3 rounded-lg px-4 py-3 text-sm font-semibold ${isActive ? 'bg-navy text-white' : 'text-muted hover:bg-paper hover:text-navy'}`
              }
            >
              <Icon size={19} className="shrink-0" />
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="shrink-0 space-y-1 border-t border-line p-3 pb-[max(12px,env(safe-area-inset-bottom))]">
          <Link
            to="/"
            className="flex min-h-11 items-center gap-3 rounded-lg px-4 text-sm hover:bg-paper"
          >
            <ArrowUpRight size={18} /> Lihat toko
          </Link>
          <button
            type="button"
            onClick={() => void logout()}
            className="flex min-h-11 w-full items-center gap-3 rounded-lg px-4 text-sm text-danger hover:bg-danger/5"
          >
            <LogOut size={18} /> Keluar akun
          </button>
        </div>
      </>
    )
  }
  const title =
    visible.find(([key]) => key === pathname.replace(/^\/admin\/?/, '').split('/')[0])?.[1] ||
    'Dashboard'
  return (
    <div className="admin-shell min-h-dvh bg-paper text-ink">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-line bg-white lg:flex">
        {navigation()}
      </aside>
      <dialog
        ref={dialog}
        aria-label="Menu admin"
        onCancel={(event) => {
          event.preventDefault()
          setOpen(false)
        }}
        onClose={() => {
          setOpen(false)
          trigger.current?.focus()
        }}
        onClick={(event) => {
          if (event.target === event.currentTarget) {
            const rect = event.currentTarget.getBoundingClientRect()
            if (event.clientX > rect.right || event.clientX < rect.left) setOpen(false)
          }
        }}
        className="admin-menu-dialog fixed inset-y-0 left-0 m-0 h-dvh max-h-dvh w-[min(288px,88vw)] max-w-none border-r border-line bg-white p-0 text-ink shadow-xl backdrop:bg-navy/50"
      >
        <div className="flex h-full min-h-0 flex-col">{navigation()}</div>
      </dialog>
      <div className="min-w-0 lg:pl-64">
        <header className="sticky top-0 z-20 flex min-h-16 items-center justify-between gap-3 border-b border-line bg-white/95 px-4 backdrop-blur sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <button
              ref={trigger}
              type="button"
              aria-label="Buka menu admin"
              aria-expanded={open}
              onClick={() => setOpen(true)}
              className="flex size-11 shrink-0 items-center justify-center rounded-lg border border-line text-navy lg:hidden"
            >
              <Menu size={22} />
            </button>
            <div className="min-w-0">
              <p className="truncate text-sm font-bold">{title}</p>
              <p className="text-[11px] text-muted">Second Device</p>
            </div>
          </div>
        </header>
        <main className="mx-auto min-w-0 max-w-[1440px] p-4 pb-8 sm:p-6 xl:p-8">{children}</main>
      </div>
    </div>
  )
}
