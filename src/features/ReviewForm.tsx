import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Button, Field, inputClass } from '../components/ui'
import Turnstile from '../components/Turnstile'
import { isConfigured, requireSupabase } from '../lib/supabase'

export default function ReviewForm() {
  const [name, setName] = useState(''),
    [rating, setRating] = useState(''),
    [body, setBody] = useState(''),
    [consent, setConsent] = useState(false),
    [website, setWebsite] = useState(''),
    [token, setToken] = useState(''),
    [resetKey, setResetKey] = useState(0),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(''),
    [sent, setSent] = useState(false)
  const ready = isConfigured && Boolean(import.meta.env.VITE_TURNSTILE_SITE_KEY)
  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (!token || !consent || !name.trim() || body.trim().length < 10) {
      setError('Lengkapi nama, ulasan minimal 10 karakter, persetujuan, dan verifikasi.')
      return
    }
    setBusy(true)
    try {
      const { data, error } = await requireSupabase().functions.invoke('submit-review', {
        body: {
          display_name: name.trim(),
          rating: Number(rating),
          body: body.trim(),
          consent,
          website,
          captcha_token: token,
        },
      })
      if (error || !data?.success) {
        let message = 'Ulasan belum terkirim. Coba lagi.'
        try {
          const details = await error?.context?.json()
          if (details?.error) message = details.error
        } catch {}
        throw new Error(message)
      }
      setSent(true)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Pengiriman gagal.')
    } finally {
      setToken('')
      setResetKey((n) => n + 1)
      setBusy(false)
    }
  }
  return (
    <div className="mb-12 rounded-2xl border border-line bg-paper/50 p-6 sm:p-8">
      <h2 className="text-2xl font-extrabold tracking-tight">Bagikan pengalamanmu.</h2>
      <p className="mb-6 mt-3 text-sm leading-7 text-muted">
        Tulis pengalaman berinteraksi atau berbelanja di Second Device. Ulasan akan ditinjau sebelum
        tampil; admin tidak mengubah isi tulisanmu.
      </p>
      {sent ? (
        <p role="status" className="rounded-lg bg-success/10 p-5 text-sm text-success">
          Terima kasih. Ulasan sudah diterima dan menunggu moderasi.
        </p>
      ) : (
        <form onSubmit={submit} className="space-y-5">
          {!ready && (
            <p role="status" className="text-sm text-muted">
              Pengiriman ulasan akan dibuka setelah layanan toko siap.
            </p>
          )}
          <fieldset
            disabled={!ready || busy}
            className="grid gap-5 disabled:opacity-60 sm:grid-cols-2"
          >
            <Field label="Nama tampilan" htmlFor="review-name">
              <input
                id="review-name"
                required
                maxLength={100}
                className={inputClass}
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </Field>
            <Field label="Penilaian" htmlFor="review-rating">
              <select
                id="review-rating"
                required
                className={inputClass}
                value={rating}
                onChange={(e) => setRating(e.target.value)}
              >
                <option value="">Pilih rating</option>
                {[5, 4, 3, 2, 1].map((n) => (
                  <option key={n} value={n}>
                    {n} dari 5 bintang
                  </option>
                ))}
              </select>
            </Field>
            <div className="sm:col-span-2">
              <Field label="Pengalaman kamu" htmlFor="review-body">
                <textarea
                  id="review-body"
                  rows={4}
                  minLength={10}
                  maxLength={3000}
                  required
                  className={inputClass}
                  placeholder="Ceritakan pengalamanmu. Hindari nomor telepon, alamat pribadi, atau data sensitif."
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                />
              </Field>
            </div>
            <div className="hidden" aria-hidden="true">
              <label htmlFor="review-website">Website</label>
              <input
                id="review-website"
                tabIndex={-1}
                autoComplete="off"
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
              />
            </div>
            <label className="flex items-start gap-3 text-xs leading-6 sm:col-span-2">
              <input
                type="checkbox"
                required
                className="mt-1 size-4 shrink-0 accent-navy"
                checked={consent}
                onChange={(e) => setConsent(e.target.checked)}
              />
              <span>
                Saya menulis pengalaman saya sendiri dan mengizinkan nama tampilan, rating, dan
                ulasan ini dipublikasikan sesuai{' '}
                <Link to="/privasi" className="underline">
                  kebijakan privasi
                </Link>
                .
              </span>
            </label>
            {ready && (
              <div className="sm:col-span-2">
                <Turnstile action="review" onToken={setToken} resetKey={resetKey} />
              </div>
            )}
            <Button type="submit" disabled={!token || busy}>
              {busy ? 'Mengirim…' : 'Kirim ulasan'}
            </Button>
          </fieldset>
          {error && (
            <p role="alert" className="text-sm text-danger">
              {error}
            </p>
          )}
        </form>
      )}
    </div>
  )
}
