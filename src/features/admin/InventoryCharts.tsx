import { useMemo, useState } from 'react'
import type { Product, TradeIn } from '../../types'
import { stockLabel } from '../../lib/utils'

const dayKey = (date: Date) =>
  new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Jakarta',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date)
export function inventorySeries(products: Product[], days: number, now = new Date()) {
  const rows = Array.from({ length: days }, (_, i) => {
    const date = new Date(now.getTime() - (days - i - 1) * 86400000)
    return {
      day: dayKey(date),
      label: new Intl.DateTimeFormat('id-ID', {
        day: 'numeric',
        month: 'short',
        timeZone: 'Asia/Jakarta',
      }).format(date),
      incoming: 0,
      sold: 0,
    }
  })
  for (const product of products) {
    const incoming = rows.find((row) => row.day === dayKey(new Date(product.created_at)))
    if (incoming) incoming.incoming++
    if (product.status === 'sold' && product.sold_at) {
      const sold = rows.find((row) => row.day === dayKey(new Date(product.sold_at!)))
      if (sold) sold.sold++
    }
  }
  return rows
}
export default function InventoryCharts({
  products,
  trades,
}: {
  products: Product[]
  trades: TradeIn[]
}) {
  const [days, setDays] = useState(30)
  const rows = useMemo(() => inventorySeries(products, days), [products, days])
  const top = Math.max(1, ...rows.flatMap((r) => [r.incoming, r.sold]))
  const x = (i: number) => 36 + (i * 604) / (rows.length - 1)
  const y = (value: number) => 194 - (value / top) * 152
  const path = (key: 'incoming' | 'sold') =>
    rows.map((r, i) => `${i === 0 ? 'M' : 'L'} ${x(i)} ${y(r[key])}`).join(' ')
  const statusRows = Object.entries(stockLabel).map(([key, label]) => ({
    key,
    label,
    count: products.filter((p) => p.status === key).length,
  }))
  const largest = Math.max(1, ...statusRows.map((row) => row.count))
  return (
    <section aria-label="Grafik inventaris" className="my-8 space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold tracking-tight">Pergerakan inventaris.</h2>
          <p className="mt-2 text-xs text-muted">
            Listing masuk dan unit yang ditandai terjual, berdasarkan data toko.
          </p>
        </div>
        <div
          aria-label="Periode grafik"
          className="flex rounded-lg border border-line bg-white p-1"
        >
          {[7, 30, 90].map((n) => (
            <button
              key={n}
              aria-pressed={days === n}
              onClick={() => setDays(n)}
              className={`min-h-10 rounded-md px-3 text-xs font-bold ${days === n ? 'bg-navy text-white' : 'text-muted hover:bg-paper'}`}
            >
              {n} hari
            </button>
          ))}
        </div>
      </div>
      <div className="grid gap-5 xl:grid-cols-[1.5fr_1fr]">
        <div className="min-w-0 rounded-xl border border-line bg-white p-5 sm:p-7">
          <div className="flex gap-6 text-xs">
            <span className="font-bold text-navy">
              ● Masuk: {rows.reduce((n, r) => n + r.incoming, 0)}
            </span>
            <span className="font-bold text-success">
              ● Ditandai terjual: {rows.reduce((n, r) => n + r.sold, 0)}
            </span>
          </div>
          <svg
            viewBox="0 0 670 230"
            role="img"
            aria-label={`Grafik unit masuk dan ditandai terjual selama ${days} hari`}
            className="mt-6 w-full overflow-visible"
          >
            {[0, 0.5, 1].map((f) => (
              <g key={f}>
                <line
                  x1="36"
                  y1={y(top * f)}
                  x2="640"
                  y2={y(top * f)}
                  stroke="#e2e5e9"
                  strokeDasharray="4 5"
                />
                <text x="25" y={y(top * f) + 4} textAnchor="end" fontSize="11" fill="#636b77">
                  {Math.round(top * f)}
                </text>
              </g>
            ))}
            <path
              d={path('incoming')}
              fill="none"
              stroke="#17263f"
              strokeWidth="3"
              strokeLinejoin="round"
            />
            <path
              d={path('sold')}
              fill="none"
              stroke="#2c6a50"
              strokeWidth="3"
              strokeDasharray="5 4"
              strokeLinejoin="round"
            />
            {rows.map((r, i) => (
              <g key={r.day}>
                <circle
                  cx={x(i)}
                  cy={y(r.incoming)}
                  r="5"
                  fill="#17263f"
                  tabIndex={0}
                  aria-label={`${r.label}: ${r.incoming} masuk, ${r.sold} ditandai terjual`}
                  className="outline-navy"
                >
                  <title>
                    {r.label}: {r.incoming} masuk, {r.sold} ditandai terjual
                  </title>
                </circle>
                {(i === 0 || i === rows.length - 1 || i === Math.floor(rows.length / 2)) && (
                  <text
                    x={x(i)}
                    y="219"
                    textAnchor={i === 0 ? 'start' : i === rows.length - 1 ? 'end' : 'middle'}
                    fontSize="11"
                    fill="#636b77"
                  >
                    {r.label}
                  </text>
                )}
              </g>
            ))}
          </svg>
          <p className="text-[10px] leading-5 text-muted">
            Tanggal memakai WIB. Unit terjual lama tanpa tanggal penjualan tidak dimasukkan ke tren.
            Grafik ini bukan laporan omzet.
          </p>
          <details className="mt-4 text-xs">
            <summary className="min-h-10 cursor-pointer font-bold">Lihat data grafik</summary>
            <div className="max-h-64 overflow-auto">
              <table className="w-full text-left">
                <thead>
                  <tr>
                    <th className="py-2">Tanggal</th>
                    <th>Masuk</th>
                    <th>Terjual</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.day} className="border-t border-line">
                      <td className="py-2">{r.label}</td>
                      <td>{r.incoming}</td>
                      <td>{r.sold}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </details>
        </div>
        <div className="rounded-xl border border-line bg-white p-5 sm:p-7">
          <h3 className="mb-5 text-sm font-bold">Komposisi status unit</h3>
          <svg
            viewBox="0 0 350 235"
            role="img"
            aria-label="Jumlah listing berdasarkan status stok"
            className="w-full"
          >
            {statusRows.map((r, i) => (
              <g key={r.key}>
                <text x="0" y={i * 45 + 20} fontSize="12" fill="#636b77">
                  {r.label}
                </text>
                <rect x="88" y={i * 45 + 5} width="220" height="22" rx="4" fill="#f3f4f6" />
                <rect
                  x="88"
                  y={i * 45 + 5}
                  width={(r.count / largest) * 220}
                  height="22"
                  rx="4"
                  fill={r.key === 'available' ? '#2c6a50' : '#17263f'}
                />
                <text x="320" y={i * 45 + 21} fontSize="12" fill="#111318">
                  {r.count}
                </text>
              </g>
            ))}
          </svg>
          <div className="mt-4 border-t border-line pt-4 text-xs text-muted">
            {products.length} listing tercatat · {trades.filter((t) => t.status === 'new').length}{' '}
            pengajuan trade in baru
          </div>
        </div>
      </div>
    </section>
  )
}
