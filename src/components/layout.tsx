import StoreFooter from './StoreFooter'
import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import {
  ArrowDownUp,
  ArrowUpRight,
  House,
  Menu,
  Moon,
  Search,
  Smartphone,
  Sun,
  Tag,
  X,
} from 'lucide-react'
import { FaWhatsapp } from 'react-icons/fa'
import { useStore, defaults } from '../lib/data'
import { rupiah, safeHttpUrl, whatsappLink } from '../lib/utils'
import { imageUrl } from '../lib/supabase'
import { container, Dialog, inputClass, buttonClass } from './ui'

export function Logo() {
  const { data } = useStore()
  const settings = data?.settings || defaults
  const src = imageUrl(settings.logo_path)
  if (!src) return null
  return (
    <Link
      to="/"
      aria-label={`${settings.store_name} — Beranda`}
      className="inline-flex min-h-11 shrink-0 items-center"
    >
      <img
        src={src}
        alt={settings.store_name}
        width="160"
        height="48"
        className="max-h-12 max-w-32 object-contain object-center sm:max-w-40"
      />
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
const searchablePages = [
  ...links.map(({ path, name }) => ({
    path,
    name,
    keywords:
      path === '/kontak' ? 'whatsapp chat hubungi' : path === '/promo' ? 'diskon potongan' : '',
  })),
  { path: '/trade-in', name: 'Trade In', keywords: 'jual tukar tambah gadget lama' },
  { path: '/ulasan', name: 'Ulasan Pelanggan', keywords: 'review testimoni' },
  { path: '/privasi', name: 'Kebijakan Privasi', keywords: 'data privacy' },
]
function normalizeSearchValue(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase()
}
export default function PublicLayout() {
  const { data } = useStore(),
    settings = data?.settings || defaults
  const location = useLocation(),
    navigate = useNavigate()
  const [menu, setMenu] = useState(false),
    [search, setSearch] = useState(false),
    [desktopSearch, setDesktopSearch] = useState(false),
    [mobileHeaderSearch, setMobileHeaderSearch] = useState(false),
    [darkMode, setDarkMode] = useState(() => localStorage.getItem('storefront-theme') === 'dark'),
    [q, setQ] = useState('')
  const desktopInput = useRef<HTMLInputElement>(null)
  const desktopSearchRef = useRef<HTMLDivElement>(null)
  const mobileSearchInput = useRef<HTMLInputElement>(null)
  const mobileSearchRef = useRef<HTMLDivElement>(null)
  const mobileSearchButtonRef = useRef<HTMLButtonElement>(null)
  const searchTokens = normalizeSearchValue(q.trim()).split(/\s+/).filter(Boolean)
  const matchingPages = searchTokens.length
    ? searchablePages
        .filter((page) => {
          const text = normalizeSearchValue(`${page.name} ${page.path} ${page.keywords}`)
          return searchTokens.every((token) => text.includes(token))
        })
        .slice(0, 4)
    : []
  const matchingProducts = searchTokens.length
    ? (data?.products || [])
        .filter((product) => {
          if (product.status !== 'available' || product.stock_quantity < 1) return false
          const text = normalizeSearchValue(
            [
              product.name,
              product.model,
              product.sku,
              product.slug,
              product.brands?.name,
              product.categories?.name,
              product.storage_gb ? `${product.storage_gb} GB` : '',
              product.ram_gb ? `${product.ram_gb} GB RAM` : '',
              product.color,
            ].join(' '),
          )
          return searchTokens.every((token) => text.includes(token))
        })
        .slice(0, 5)
    : []
  function closeSearch() {
    setSearch(false)
    setDesktopSearch(false)
    setMobileHeaderSearch(false)
    setQ('')
  }
  function renderSearchResults(id: string, className: string) {
    const resultPages = searchTokens.length ? matchingPages : searchablePages.slice(0, 4)
    return (
      <div
        id={id}
        aria-live="polite"
        className={`${className} max-h-[min(70dvh,28rem)] overflow-y-auto rounded-xl border border-line bg-white p-2 shadow-xl`}
      >
        {resultPages.length > 0 && (
          <section aria-label="Halaman">
            <p className="px-3 pb-1 pt-2 text-[10px] font-bold uppercase tracking-wider text-muted">
              {searchTokens.length ? 'Halaman' : 'Menu populer'}
            </p>
            {resultPages.map((page) => (
              <Link
                key={page.path}
                to={page.path}
                onClick={closeSearch}
                className="flex min-h-11 items-center justify-between gap-3 rounded-lg px-3 py-2 text-sm font-semibold hover:bg-paper focus-visible:outline-2 focus-visible:outline-navy"
              >
                {page.name}
                <ArrowUpRight size={16} className="shrink-0 text-muted" />
              </Link>
            ))}
          </section>
        )}
        {matchingProducts.length > 0 && (
          <section
            aria-label="Gadget tersedia"
            className={resultPages.length ? 'mt-2 border-t border-line pt-2' : ''}
          >
            <p className="px-3 pb-1 pt-2 text-[10px] font-bold uppercase tracking-wider text-muted">
              Gadget tersedia
            </p>
            {matchingProducts.map((product) => (
              <Link
                key={product.id}
                to={`/gadget/${product.slug}`}
                onClick={closeSearch}
                className="flex min-h-14 items-center justify-between gap-3 rounded-lg px-3 py-2 hover:bg-paper focus-visible:outline-2 focus-visible:outline-navy"
              >
                <span className="min-w-0">
                  <span className="block truncate text-sm font-semibold">{product.name}</span>
                  <span className="mt-0.5 block truncate text-xs text-muted">
                    {[
                      product.brands?.name,
                      product.model,
                      product.storage_gb && `${product.storage_gb} GB`,
                    ]
                      .filter(Boolean)
                      .join(' · ')}
                  </span>
                </span>
                <span className="shrink-0 text-xs font-bold">{rupiah(product.price)}</span>
              </Link>
            ))}
          </section>
        )}
        {searchTokens.length > 0 && !matchingPages.length && !matchingProducts.length && (
          <p className="px-3 py-4 text-sm text-muted">Tidak ada hasil yang cocok.</p>
        )}
        <Link
          to={`/gadget?q=${encodeURIComponent(q.trim())}`}
          onClick={closeSearch}
          className="mt-2 flex min-h-11 items-center justify-between gap-3 border-t border-line px-3 pt-2 text-sm font-bold text-navy hover:underline"
        >
          Cari semua gadget untuk “{q.trim()}”
          <ArrowUpRight size={16} className="shrink-0" />
        </Link>
      </div>
    )
  }
  function submitSearch(event: FormEvent) {
    event.preventDefault()
    setSearch(false)
    setDesktopSearch(false)
    setMobileHeaderSearch(false)
    const query = q.trim()
    setQ('')
    navigate(`/gadget${query ? `?q=${encodeURIComponent(query)}` : ''}`)
  }
  function closeDesktopSearch() {
    setDesktopSearch(false)
    desktopInput.current?.blur()
  }
  useEffect(() => {
    if (desktopSearch) desktopInput.current?.focus()
  }, [desktopSearch])
  useEffect(() => {
    if (mobileHeaderSearch) mobileSearchInput.current?.focus()
  }, [mobileHeaderSearch])
  useEffect(() => {
    const previousColorScheme = document.documentElement.style.colorScheme
    document.documentElement.style.colorScheme = darkMode ? 'dark' : 'light'
    localStorage.setItem('storefront-theme', darkMode ? 'dark' : 'light')
    return () => {
      document.documentElement.style.colorScheme = previousColorScheme
    }
  }, [darkMode])
  useEffect(() => {
    function closeSearchOnOutsideClick(event: PointerEvent) {
      const target = event.target as Node
      if (!desktopSearchRef.current?.contains(target)) setDesktopSearch(false)
      if (
        !mobileSearchRef.current?.contains(target) &&
        !mobileSearchButtonRef.current?.contains(target)
      )
        setMobileHeaderSearch(false)
    }
    document.addEventListener('pointerdown', closeSearchOnOutsideClick)
    return () => document.removeEventListener('pointerdown', closeSearchOnOutsideClick)
  }, [])
  useEffect(() => {
    const media = window.matchMedia('(min-width: 1024px)')
    const closeHiddenSearch = () => {
      if (media.matches) {
        setSearch(false)
        setMobileHeaderSearch(false)
        setMenu(false)
      } else setDesktopSearch(false)
    }
    media.addEventListener('change', closeHiddenSearch)
    return () => media.removeEventListener('change', closeHiddenSearch)
  }, [])
  useEffect(() => {
    function handleSearchShortcut(event: KeyboardEvent) {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        setMenu(false)
        if (window.matchMedia('(min-width: 1024px)').matches) setDesktopSearch(true)
        else setMobileHeaderSearch(true)
      }
    }
    window.addEventListener('keydown', handleSearchShortcut)
    return () => window.removeEventListener('keydown', handleSearchShortcut)
  }, [])
  const wa = whatsappLink(settings.whatsapp_number)
  useEffect(() => {
    setMenu(false)
    setSearch(false)
    setDesktopSearch(false)
    setMobileHeaderSearch(false)
    setQ('')
    window.scrollTo({ top: 0, behavior: 'instant' })
    const main = document.getElementById('main-content')
    main?.focus({ preventScroll: true })
  }, [location.pathname])
  return (
    <div
      className={`storefront min-h-dvh min-w-0 overflow-x-clip pb-[calc(4.5rem+env(safe-area-inset-bottom))] lg:pb-0 ${darkMode ? 'theme-dark' : ''}`}
    >
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
          className={`${container} relative flex min-h-18 items-center justify-between gap-2 py-2 sm:gap-4 lg:h-20 lg:py-0`}
        >
          <div className="mr-auto min-w-0 shrink-0 lg:mr-0">
            <Logo />
          </div>
          <nav
            aria-label="Navigasi utama"
            className="hidden h-full min-w-0 items-center gap-3 lg:flex xl:gap-4"
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
          <div
            ref={desktopSearchRef}
            className="relative hidden min-w-0 lg:block lg:max-w-64 lg:flex-1"
          >
            <form
              id="navbar-search"
              role="search"
              aria-label="Pencarian navbar"
              onSubmit={submitSearch}
              className={`flex min-w-0 items-center gap-2 rounded-xl border bg-white px-3 py-1.5 transition-colors ${desktopSearch ? 'border-navy ring-2 ring-navy/10' : 'border-line'}`}
            >
              <Search size={18} className="ml-2 shrink-0 text-muted" aria-hidden="true" />
              <label htmlFor="desktop-search" className="sr-only">
                Cari gadget di navbar
              </label>
              <input
                ref={desktopInput}
                id="desktop-search"
                type="search"
                aria-autocomplete="list"
                aria-expanded={desktopSearch}
                aria-controls="desktop-search-results"
                aria-keyshortcuts="Control+K Meta+K"
                value={q}
                onFocus={() => setDesktopSearch(true)}
                onChange={(event) => setQ(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Escape') closeDesktopSearch()
                }}
                className="min-w-0 flex-1 bg-transparent py-2 text-sm outline-none placeholder:text-muted"
                placeholder="Cari menu atau gadget…"
                title="Cari menu atau gadget (Ctrl+K)"
              />
              {q && (
                <button
                  type="button"
                  onClick={() => {
                    setQ('')
                    desktopInput.current?.focus()
                  }}
                  aria-label="Hapus pencarian"
                  className="flex size-9 shrink-0 items-center justify-center rounded-lg text-muted hover:bg-paper focus-visible:outline-2 focus-visible:outline-navy"
                >
                  <X size={17} />
                </button>
              )}
            </form>
            {desktopSearch &&
              renderSearchResults(
                'desktop-search-results',
                'absolute left-0 right-0 top-[calc(100%+0.75rem)] z-50',
              )}
          </div>
          <div className="flex shrink-0 items-center gap-1 sm:gap-3">
            <button
              ref={mobileSearchButtonRef}
              type="button"
              onClick={() => setMobileHeaderSearch((open) => !open)}
              aria-label={mobileHeaderSearch ? 'Tutup pencarian navbar' : 'Buka pencarian navbar'}
              aria-expanded={mobileHeaderSearch}
              aria-controls="mobile-navbar-search"
              aria-keyshortcuts="Control+K Meta+K"
              className="flex size-11 items-center justify-center rounded-lg hover:bg-paper focus-visible:outline-2 focus-visible:outline-navy lg:hidden"
            >
              {mobileHeaderSearch ? <X size={20} /> : <Search size={20} />}
            </button>
            <button
              type="button"
              onClick={() => setDarkMode((enabled) => !enabled)}
              aria-label={darkMode ? 'Aktifkan mode terang' : 'Aktifkan mode malam'}
              aria-pressed={darkMode}
              title={darkMode ? 'Mode terang' : 'Mode malam'}
              className="flex size-11 items-center justify-center rounded-lg hover:bg-paper focus-visible:outline-2 focus-visible:outline-navy"
            >
              {darkMode ? <Sun size={20} /> : <Moon size={20} />}
            </button>
            <div className="hidden sm:block">
              <a
                href={wa ?? undefined}
                target="_blank"
                rel="noopener noreferrer"
                className={`${buttonClass} !bg-[#1EBE5D] px-4`}
              >
                <FaWhatsapp size={16} />
                WhatsApp
                <ArrowUpRight size={14} />
              </a>
            </div>
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
        {mobileHeaderSearch && (
          <div
            ref={mobileSearchRef}
            id="mobile-navbar-search"
            className={`${container} absolute inset-x-0 top-[calc(100%+0.5rem)] z-50 lg:hidden`}
          >
            <form
              role="search"
              aria-label="Pencarian navbar mobile"
              onSubmit={submitSearch}
              className="flex min-w-0 items-center gap-2 rounded-xl border border-line bg-white p-2 shadow-xl"
            >
              <Search size={18} className="ml-2 shrink-0 text-muted" aria-hidden="true" />
              <label htmlFor="mobile-navbar-search-input" className="sr-only">
                Cari gadget di navbar
              </label>
              <input
                ref={mobileSearchInput}
                id="mobile-navbar-search-input"
                type="search"
                aria-autocomplete="list"
                aria-expanded={mobileHeaderSearch}
                aria-controls="mobile-navbar-search-results"
                value={q}
                onChange={(event) => setQ(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Escape') setMobileHeaderSearch(false)
                }}
                className="min-w-0 flex-1 bg-transparent py-2 text-sm outline-none placeholder:text-muted"
                placeholder="Cari menu atau gadget…"
              />
              <button
                type="submit"
                aria-label="Cari"
                className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-navy text-white"
              >
                <Search size={18} />
              </button>
            </form>
            {renderSearchResults('mobile-navbar-search-results', 'mt-2')}
          </div>
        )}
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
              aria-keyshortcuts="Control+K Meta+K"
              className="relative flex min-h-18 min-w-0 flex-col items-center justify-end pb-2.5 text-[10px] font-extrabold text-navy focus-visible:outline-2 focus-visible:outline-navy"
            >
              <span className="absolute -top-6 left-1/2 flex size-16 -translate-x-1/2 items-center justify-center rounded-full border-[5px] border-white bg-navy text-white shadow-[0_5px_18px_rgba(23,38,63,0.22)] transition-transform active:scale-95 motion-reduce:transition-none">
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
      <Dialog open={search} onClose={closeSearch} title="Cari gadget">
        <form onSubmit={submitSearch}>
          <label className="mb-3 block text-sm text-muted" htmlFor="header-search">
            Cari menu, merek, model, atau kapasitas perangkat
          </label>
          <input
            autoFocus
            id="header-search"
            aria-autocomplete="list"
            aria-expanded={searchTokens.length > 0}
            aria-controls="mobile-search-results"
            className={inputClass}
            placeholder="Contoh: iPhone 13 128 GB"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          {renderSearchResults('mobile-search-results', 'mt-3 border-line')}
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
