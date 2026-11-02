import React, { Suspense, lazy } from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MotionConfig } from 'motion/react'
import { AuthProvider } from './app/Auth'
import { RealtimeSync } from './app/RealtimeSync'
import PublicLayout from './components/layout'
import { Loading } from './components/ui'
import Home from './features/Home'
import StoreFavicon from './components/StoreFavicon'
import './index.css'

const Catalog = lazy(() => import('./features/Catalog'))
const ProductDetail = lazy(() => import('./features/ProductDetail'))
const Information = lazy(() => import('./features/Information'))
const TradeIn = lazy(() => import('./features/TradeIn'))
const Admin = lazy(() => import('./features/admin/Admin'))
const client = new QueryClient({
  defaultOptions: { queries: { retry: 1, staleTime: 300_000, refetchOnWindowFocus: false } },
})
class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { failed: boolean }> {
  state = { failed: false }
  static getDerivedStateFromError() {
    return { failed: true }
  }
  render() {
    return this.state.failed ? (
      <div role="alert" className="mx-auto max-w-lg p-10 text-center">
        <h1 className="text-2xl font-bold">Halaman belum dapat ditampilkan.</h1>
        <p className="mt-4 text-sm text-muted">Coba muat ulang untuk mengambil versi terbaru.</p>
        <button
          className="mt-6 rounded-lg bg-navy px-5 py-3 text-white"
          onClick={() => window.location.reload()}
        >
          Muat ulang
        </button>
      </div>
    ) : (
      this.props.children
    )
  }
}
ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <QueryClientProvider client={client}>
        <StoreFavicon />
        <AuthProvider>
          <RealtimeSync />
          <MotionConfig reducedMotion="user">
            <BrowserRouter>
              <Suspense fallback={<Loading />}>
                <Routes>
                  <Route element={<PublicLayout />}>
                    <Route index element={<Home />} />
                    <Route path="gadget" element={<Catalog />} />
                    <Route path="gadget/:slug" element={<ProductDetail />} />
                    <Route path="trade-in" element={<TradeIn />} />
                    {['promo', 'tentang', 'kontak', 'ulasan', 'privasi'].map((path) => (
                      <Route path={path} key={path} element={<Information />} />
                    ))}
                    <Route path="*" element={<Information />} />
                  </Route>
                  <Route path="admin/*" element={<Admin />} />
                </Routes>
              </Suspense>
            </BrowserRouter>
          </MotionConfig>
        </AuthProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  </React.StrictMode>,
)
