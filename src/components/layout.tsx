import StoreFooter from './StoreFooter'
import { useEffect, useRef, useState, type FormEvent } from 'react'
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
          className="max-h-12 max-w-32 object-contain object-left sm:max-w-40"
        />
      </Link>
    )
  if (settings.store_name.toLowerCase() !== 'second device')
    return (
      <Link
        to="/"
        className={`inline-block max-w-36 break-words text-base font-extrabold tracking-tight sm:max-w-48 sm:text-lg ${light ? 'text-white' : 'text-ink'}`}
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
    [desktopSearch, setDesktopSearch] = useState(false),
    [q, setQ] = useState('')
  const desktopInput = useRef<HTMLInputElement>(null)
  const desktopSearchButton = useRef<HTMLButtonElement>(null)
  function submitSearch(event: FormEvent) {
    event.preventDefault()
    setSearch(false)
    setDesktopSearch(false)
    navigate(`/gadget${q.trim() ? `?q=${encodeURIComponent(q.trim())}` : ''}`)
  }
  function closeDesktopSearch() {
    setDesktopSearch(false)
    requestAnimationFrame(() => desktopSearchButton.current?.focus())
  }
  useEffect(() => {
    if (desktopSearch) desktopInput.current?.focus()
  }, [desktopSearch])
  useEffect(() => {
    const media = window.matchMedia('(min-width: 1024px)')
    const closeHiddenSearch = () => {
      if (media.matches) {
        setSearch(false)
        setMenu(false)
      } else setDesktopSearch(false)
    }
    media.addEventListener('change', closeHiddenSearch)
    return () => media.removeEventListener('change', closeHiddenSearch)
  }, [])
  const wa = whatsappLink(settings.whatsapp_number)
  useEffect(() => {
    setMenu(false)
    setSearch(false)
    setDesktopSearch(false)
    window.scrollTo({ top: 0, behavior: 'instant' })
    const main = document.getElementById('main-content')
    main?.focus({ preventScroll: true })
  }, [location.pathname])
  return (
    <div className="min-h-dvh min-w-0 overflow-x-clip pb-[calc(5.5rem+env(safe-area-inset-bottom))] lg:pb-0">
      <a
        href="#main-content"
        className="fixed -top-20 left-4 z-100 rounded-lg bg-navy px-5 py-3 text-white focus:top-3"
      >
        Lewati ke konten
      </a>
      <div className="border-b border-line bg-paper">
        <div
          className={`${container} flex min-h-8 items-center justify-between gap-3 py-1 text-[9px] font-bold uppercase tracking-[0.12em] sm:text-[10px] sm:tracking-[0.18em]`}
        >
          <span className="hidden min-[360px]:inline">Good devices. Second stories.</span>
          <span className="hidden text-muted sm:block">
            Trade In <span className="mx-3 text-line">/</span> Buy{' '}
            <span className="mx-3 text-line">/</span> Sell
          </span>
          <Link to="/trade-in" className="ml-auto flex shrink-0 items-center gap-1.5 sm:ml-0">
            Punya gadget lama?
            <ArrowUpRight size={13} />
          </Link>
        </div>
      </div>
      <header className="sticky top-0 z-40 border-b border-line bg-white/95 backdrop-blur-md">
        <div
          className={`${container} flex h-18 items-center justify-between gap-2 sm:gap-4 lg:h-20`}
        >
          <div className="mr-auto min-w-0 shrink-0 lg:mr-0">
            <Logo />
          </div>
          <nav
            aria-label="Navigasi utama"
            className={`hidden h-full min-w-0 items-center gap-4 xl:gap-7 ${desktopSearch ? '' : 'lg:flex'}`}
          >
            {links.map((item) => (
              <NavLink
                key={item.path}
                end={item.path === '/'}
                to={item.path}
                className={({ isActive }) =>
                  `flex h-full shrink-0 items-center whitespace-nowrap border-b-2 pt-0.5 text-xs font-bold transition ${isActive ? 'border-navy text-navy' : 'border-transparent text-muted hover:text-ink'}`
                }
              >
                {item.name}
              </NavLink>
            ))}
          </nav>
          {desktopSearch && (
            <form
              id="navbar-search"
              role="search"
              aria-label="Pencarian navbar"
              onSubmit={submitSearch}
              className="hidden min-w-0 flex-1 items-center gap-2 rounded-xl border border-line bg-paper/60 p-1.5 lg:flex lg:max-w-xl"
            >
              <Search size={18} className="ml-2 shrink-0 text-muted" aria-hidden="true" />
              <label htmlFor="desktop-search" className="sr-only">
                Cari gadget di navbar
              </label>
              <input
                ref={desktopInput}
                id="desktop-search"
                type="search"
                value={q}
                onChange={(event) => setQ(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Escape') closeDesktopSearch()
                }}
                className="min-w-0 flex-1 bg-transparent py-2 text-sm outline-none placeholder:text-muted focus-visible:ring-2 focus-visible:ring-navy/20"
                placeholder="Nama, brand, atau kapasitas…"
              />
              <button type="submit" className={`${buttonClass} !min-h-10 !px-4 !py-2`}>
                Cari
              </button>
              <button
                type="button"
                onClick={closeDesktopSearch}
                aria-label="Tutup pencarian navbar"
                className="flex size-10 shrink-0 items-center justify-center rounded-lg text-muted hover:bg-white focus-visible:outline-2 focus-visible:outline-navy"
              >
                <X size={19} />
              </button>
            </form>
          )}
          <div className="flex shrink-0 items-center gap-1 sm:gap-3">
            {!desktopSearch && (
              <button
                ref={desktopSearchButton}
                onClick={() => setDesktopSearch(true)}
                aria-label="Cari gadget di navbar"
                aria-expanded={desktopSearch}
                aria-controls="navbar-search"
                className="hidden size-11 items-center justify-center rounded-lg hover:bg-paper focus-visible:outline-2 focus-visible:outline-navy lg:flex"
              >
                <Search size={20} />
              </button>
            )}
            <button
              onClick={() => setSearch(true)}
              aria-label="Cari gadget"
              className="flex size-11 items-center justify-center rounded-lg hover:bg-paper lg:hidden"
            >
              <Search size={20} />
            </button>
            {wa && (
              <div className="hidden sm:block">
                <a
                  href={wa}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`${buttonClass} !px-4`}
                >
                  <FaWhatsapp size={16} />
                  WhatsApp
                  <ArrowUpRight size={14} />
                </a>
              </div>
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
      <main id="main-content" tabIndex={-1} className="min-w-0 outline-none">
        <Outlet />
      </main>
      <StoreFooter settings={settings} products={data?.products || []} />
      <nav
        aria-label="Navigasi mobile"
        className="fixed inset-x-0 bottom-0 z-40 grid min-h-18 grid-cols-5 border-t border-line bg-white pb-[env(safe-area-inset-bottom)] shadow-[0_-6px_24px_rgba(23,38,63,0.06)] lg:hidden"
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
              aria-label="Buka pencarian gadget"
              className="relative flex min-h-18 min-w-0 flex-col items-center justify-end pb-2.5 text-[10px] font-extrabold text-navy focus-visible:outline-2 focus-visible:outline-navy"
            >
              <span className="absolute -top-6 left-1/2 flex size-16 -translate-x-1/2 items-center justify-center rounded-full border-[5px] border-white bg-[#f6b845] text-navy shadow-[0_5px_18px_rgba(172,112,15,0.28)] transition-transform active:scale-95 motion-reduce:transition-none">
                <l.icon size={29} strokeWidth={2.2} />
              </span>
              <span>{l.name}</span>
            </button>
          ) : (
            <NavLink
              key={l.path}
              to={l.path}
              end={l.path === '/'}
              className={({ isActive }) =>
                `flex min-h-18 min-w-0 flex-col items-center justify-center gap-1 text-[10px] font-semibold ${isActive ? 'text-navy' : 'text-muted'}`
              }
            >
              <l.icon size={19} strokeWidth={1.6} />
              {l.name}
            </NavLink>
          ),
        )}
      </nav>
      <Dialog open={search} onClose={() => setSearch(false)} title="Cari gadget">
        <form onSubmit={submitSearch}>
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
