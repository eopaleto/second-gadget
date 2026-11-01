import { useState } from 'react'
import { RatingStars } from '../../components/StarRating'
import type { Review } from '../../types'
import { requireSupabase } from '../../lib/supabase'
import { dateLabel } from '../../lib/utils'
import { Button, EmptyState, inputClass } from '../../components/ui'

export default function ReviewModeration({
  reviews,
  onSaved,
  readOnly = false,
}: {
  reviews: Review[]
  onSaved: (message: string) => void
  readOnly?: boolean
}) {
  const [filter, setFilter] = useState('pending'),
    [busy, setBusy] = useState(''),
    [error, setError] = useState('')
  const rows = reviews.filter(
    (r) => filter === 'all' || (filter === 'pending' ? !r.is_approved : r.is_approved),
  )
  async function moderate(review: Review) {
    if (readOnly) return
    setBusy(review.id)
    setError('')
    try {
      const { error } = await requireSupabase()
        .from('reviews')
        .update({ is_approved: !review.is_approved })
        .eq('id', review.id)
      if (error) throw error
      onSaved(review.is_approved ? 'Ulasan disembunyikan.' : 'Ulasan dipublikasikan.')
    } catch {
      setError('Moderasi belum tersimpan. Periksa izin admin dan migration terbaru.')
    } finally {
      setBusy('')
    }
  }
  return (
    <section>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight">Ulasan pengguna.</h1>
          <p className="mt-2 text-xs leading-6 text-muted">
            Admin meninjau dan memublikasikan. Nama, rating, dan isi ulasan tidak dapat ditulis
            ulang.
          </p>
        </div>
        <label className="text-xs font-bold">
          Tampilkan
          <select
            className={`${inputClass} mt-2`}
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          >
            <option value="pending">Menunggu moderasi</option>
            <option value="published">Dipublikasikan</option>
            <option value="all">Semua ulasan</option>
          </select>
        </label>
      </div>
      {error && (
        <p role="alert" className="mb-4 text-sm text-danger">
          {error}
        </p>
      )}
      {rows.length ? (
        <div className="space-y-4">
          {rows
            .sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at))
            .map((r) => (
              <article key={r.id} className="rounded-xl border border-line bg-white p-6">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <h2 className="font-bold">{r.display_name}</h2>
                  <div className="flex flex-wrap items-center gap-3">
                    {r.rating ? <RatingStars value={r.rating} /> : null}
                    <span className="text-xs text-muted">{dateLabel(r.created_at)}</span>
                  </div>
                </div>
                <p className="my-5 whitespace-pre-line text-sm leading-7">{r.body}</p>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <span className="text-xs text-muted">
                    {r.is_approved ? 'Dipublikasikan' : 'Menunggu moderasi'}
                  </span>
                  {!readOnly && (
                    <Button
                      disabled={Boolean(busy) || !r.permission_to_publish}
                      secondary={r.is_approved}
                      onClick={() => void moderate(r)}
                    >
                      {busy === r.id
                        ? 'Menyimpan…'
                        : r.is_approved
                          ? 'Sembunyikan'
                          : 'Setujui & tampilkan'}
                    </Button>
                  )}
                </div>
                {!r.permission_to_publish && (
                  <p className="mt-3 text-xs text-danger">Izin publikasi belum tersedia.</p>
                )}
              </article>
            ))}
        </div>
      ) : (
        <EmptyState
          title="Belum ada ulasan pada daftar ini."
          description="Ulasan dikirim pengguna melalui halaman Ulasan, lalu ditinjau di sini."
        />
      )}
    </section>
  )
}
