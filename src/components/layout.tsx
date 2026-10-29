import StoreFooter from './StoreFooter'
import { useEffect, useState } from 'react'
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import {
  ArrowDownUp,
  ArrowUpRight,
  House,
  Menu,
  MessageCircle,
  Search,
  Smartphone,
  Tag,
  X,
} from 'lucide-react'
import { FaWhatsapp } from 'react-icons/fa'
import { useStore, defaults } from '../lib/data'
import { safeHttpUrl, whatsappLink } from '../lib/utils'
import { imageUrl } from '../lib/supabase'
import { container, Dialog, inputClass, buttonClass } from './ui'

export function Logo({ light = false }: { light?: boolean }) {
  const { data } = useStore()
  const settings = data?.settings || defaults
  if (settings.logo_path && imageUrl(settings.logo_path))
    return (
      <Link
        to="/"
        aria-label={`${settings.store_name} — Beranda`}
        className="inline-flex min-h-11 shrink-0 items-center"
      >
        <img
          src={imageUrl(settings.logo_path)}
          alt={settings.store_name}
          width="160"
          height="48"
          className="max-h-12 max-w-40 object-contain"
        />
      </Link>
    )
  if (settings.store_name.toLowerCase() !== 'second device')
    return (
      <Link
        to="/"
        className={`max-w-48 text-lg font-extrabold tracking-tight ${light ? 'text-white' : 'text-ink'}`}
      >
        {settings.store_name}
      </Link>
    )
  return (
    <Link
      to="/"
      aria-label="Second Device — Beranda"
      className={`inline-flex shrink-0 items-center gap-2.5 ${light ? 'text-white' : 'text-ink'}`}
    >
      <span
        className={`flex size-10 items-center justify-center rounded-lg ${light ? 'bg-white/10' : 'bg-navy'} text-white`}
      >
        <ArrowDownUp size={23} strokeWidth={2.2} />
      </span>
      <span className="text-[17px] font-extrabold uppercase leading-[1.05] tracking-[-0.06em]">
        Second
        <br />
        <span className="tracking-[0.04em]">Device</span>
      </span>
    </Link>
  )
}
const links = [
  { path: '/', name: 'Beranda', icon: House },
  { path: '/gadget', name: 'Semua Gadget', icon: Smartphone },
  { path: '/promo', name: 'Promo', icon: Tag },
  { path: '/tentang', name: 'Tentang', icon: ArrowUpRight },
  { path: '/kontak', name: 'Kontak', icon: FaWhatsapp },
]
export default function PublicLayout() {
  const { data } = useStore(),
    settings = data?.settings || defaults
  const location = useLocation(),
    navigate = useNavigate()
  const [menu, setMenu] = useState(false),
    [search, setSearch] = useState(false),
    [q, setQ] = useState('')
  const wa = whatsappLink(settings.whatsapp_number)
  useEffect(() => {
    setMenu(false)
    setSearch(false)
    window.scrollTo({ top: 0, behavior: 'instant' })
    const main = document.getElementById('main-content')
    main?.focus({ preventScroll: true })
  }, [location.pathname])
  return (
    <div className="min-h-dvh overflow-x-clip pb-[calc(4.5rem+env(safe-area-inset-bottom))] lg:pb-0">
      <a
        href="#main-content"
        className="fixed -top-20 left-4 z-100 rounded-lg bg-navy px-5 py-3 text-white focus:top-3"
      >
        Lewati ke konten
      </a>
      <div className="border-b border-line bg-paper">
        <div
          className={`${container} flex h-8 items-center justify-between text-[9px] font-bold uppercase tracking-[0.18em] sm:text-[10px]`}
        >
          <span>Good devices. Second stories.</span>
          <span className="hidden text-muted sm:block">
            Trade In <span className="mx-3 text-line">/</span> Buy{' '}
            <span className="mx-3 text-line">/</span> Sell
          </span>
          <Link to="/trade-in" className="flex items-center gap-1.5">
            Punya gadget lama?
            <ArrowUpRight size={13} />
          </Link>
        </div>
      </div>
      <header className="sticky top-0 z-40 border-b border-line bg-white/95 backdrop-blur-md">
        <div className={`${container} flex h-20 items-center justify-end gap-4 lg:justify-between`}>
          <div className="hidden lg:block">
            <Logo />
          </div>
          <nav aria-label="Navigasi utama" className="hidden h-full items-center gap-7 lg:flex">
            {links.map((item) => (
              <NavLink
                key={item.path}
                end={item.path === '/'}
                to={item.path}
                className={({ isActive }) =>
                  `flex h-full items-center border-b-2 pt-0.5 text-xs font-bold transition ${isActive ? 'border-navy text-navy' : 'border-transparent text-muted hover:text-ink'}`
                }
              >
                {item.name}
              </NavLink>
            ))}
          </nav>
          <div className="flex items-center gap-2 sm:gap-4">
            <button
              onClick={() => setSearch(true)}
              aria-label="Cari gadget"
              className="flex size-11 items-center justify-center rounded-lg hover:bg-paper"
            >
              <Search size={20} />
            </button>
            {wa && (
              <a
                href={wa}
                target="_blank"
                rel="noopener noreferrer"
                className={`${buttonClass} hidden sm:inline-flex`}
              >
                <FaWhatsapp size={16} />
                WhatsApp
                <ArrowUpRight size={14} />
              </a>
            )}
            <button
              onClick={() => setMenu(true)}
              aria-expanded={menu}
              aria-label="Buka menu"
              className="flex size-11 items-center justify-center rounded-lg hover:bg-paper lg:hidden"
            >
              {menu ? <X size={21} /> : <Menu size={21} />}
            </button>
          </div>
        </div>
      </header>
      <main id="main-content" tabIndex={-1} className="outline-none">
        <Outlet />
      </main>
      <StoreFooter settings={settings} products={data?.products || []} />
      <nav
        aria-label="Navigasi mobile"
        className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 border-t border-line bg-white pb-[env(safe-area-inset-bottom)] lg:hidden"
      >
        {[
          { path: '/', name: 'Beranda', icon: House },
          { path: '/gadget', name: 'Gadget', icon: Smartphone },
          { path: '#search', name: 'Cari', icon: Search },
          { path: '/promo', name: 'Promo', icon: Tag },
          { path: '/kontak', name: 'Kontak', icon: FaWhatsapp },
        ].map((l) =>
          l.path === '#search' ? (
            <button
              key={l.path}
              onClick={() => setSearch(true)}
              className="flex min-h-16 flex-col items-center justify-center gap-1 text-[9px] font-semibold text-muted"
            >
              <l.icon size={19} strokeWidth={1.6} />
              {l.name}
            </button>
          ) : (
            <NavLink
              key={l.path}
              to={l.path}
              end={l.path === '/'}
              className={({ isActive }) =>
                `flex min-h-16 flex-col items-center justify-center gap-1 text-[9px] font-semibold ${isActive ? 'text-navy' : 'text-muted'}`
              }
            >
              <l.icon size={19} strokeWidth={1.6} />
              {l.name}
            </NavLink>
          ),
        )}
      </nav>
      <Dialog open={search} onClose={() => setSearch(false)} title="Cari gadget">
        <form
          onSubmit={(e) => {
            e.preventDefault()
            setSearch(false)
            navigate(`/gadget${q.trim() ? `?q=${encodeURIComponent(q.trim())}` : ''}`)
          }}
        >
          <label className="mb-3 block text-sm text-muted" htmlFor="header-search">
            Nama, merek, atau kapasitas perangkat
          </label>
          <input
            autoFocus
            id="header-search"
            className={inputClass}
            placeholder="Contoh: iPhone 13 128 GB"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          <button className={`${buttonClass} mt-4 w-full`}>
            <Search size={17} />
            Cari gadget
          </button>
        </form>
      </Dialog>
      <Dialog open={menu} onClose={() => setMenu(false)} title="Jelajahi Second Device">
        <nav aria-label="Menu mobile" className="flex flex-col">
          {[
            ...links,
            { path: '/trade-in', name: 'Trade In', icon: ArrowDownUp },
            { path: '/ulasan', name: 'Ulasan Pelanggan', icon: FaWhatsapp },
          ].map((l) => (
            <Link
              key={l.path}
              to={l.path}
              onClick={() => setMenu(false)}
              className="flex items-center justify-between border-b border-line py-4 text-sm font-semibold"
            >
              {l.name}
              <ArrowUpRight size={17} />
            </Link>
          ))}
        </nav>
      </Dialog>
    </div>
  )
}
