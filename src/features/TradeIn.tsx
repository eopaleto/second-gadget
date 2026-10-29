import { useEffect, useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Link } from 'react-router-dom'
import { ArrowRight, Check, LockKeyhole } from 'lucide-react'
import { tradeSchema, validatePhoto, type TradeInput } from '../lib/validation'
import { isConfigured, requireSupabase } from '../lib/supabase'
import {
  Button,
  container,
  Eyebrow,
  Field,
  FileDropzone,
  inputClass,
  secondaryClass,
} from '../components/ui'
import { useSeo } from '../hooks/useSeo'

type Turnstile = {
  render: (element: HTMLElement, options: Record<string, unknown>) => string
  remove: (id: string) => void
  reset: (id: string) => void
}
declare global {
  interface Window {
    turnstile?: Turnstile
  }
}
export default function TradeIn() {
  useSeo('Trade in gadget')
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<TradeInput>({
    resolver: zodResolver(tradeSchema),
    defaultValues: {
      name: '',
      phone: '',
      brand: '',
      model: '',
      storage_gb: '',
      condition_notes: '',
      accessories: '',
      notes: '',
      consent: false,
      website: '',
    },
  })
  const [files, setFiles] = useState<File[]>([]),
    [error, setError] = useState(''),
    [reference, setReference] = useState(''),
    [token, setToken] = useState('')
  const captcha = useRef<HTMLDivElement>(null),
    widget = useRef<string | undefined>(undefined)
  const siteKey = import.meta.env.VITE_TURNSTILE_SITE_KEY,
    ready = isConfigured && Boolean(siteKey)
  useEffect(() => {
    if (!ready || reference) return
    const render = () => {
      if (captcha.current && window.turnstile && !widget.current)
        widget.current = window.turnstile.render(captcha.current, {
          sitekey: siteKey,
          action: 'trade_in',
          size: 'compact',
          callback: (t: string) => setToken(t),
          'expired-callback': () => setToken(''),
          'error-callback': () => {
            setToken('')
            setError('Verifikasi keamanan gagal dimuat. Periksa koneksi atau muat ulang halaman.')
          },
          theme: 'light',
        })
    }
    let script = document.querySelector<HTMLScriptElement>('script[data-turnstile]')
    if (!script) {
      script = document.createElement('script')
      script.dataset.turnstile = 'true'
      script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit'
      script.async = true
      document.head.append(script)
    }
    script.addEventListener('load', render)
    render()
    return () => {
      script?.removeEventListener('load', render)
      if (widget.current) window.turnstile?.remove(widget.current)
      widget.current = undefined
    }
  }, [ready, siteKey, reference])
  async function submit(values: TradeInput) {
    if (!ready || !token) {
      setError('Selesaikan verifikasi keamanan terlebih dahulu.')
      return
    }
    setError('')
    const body = new FormData()
    Object.entries(values).forEach(([k, v]) => body.append(k, String(v)))
    body.append('captcha_token', token)
    files.forEach((f) => body.append('photos', f))
    try {
      const { data, error: requestError } = await requireSupabase().functions.invoke(
        'submit-trade-in',
        { body },
      )
      if (requestError) {
        let message = 'Pengajuan belum terkirim. Periksa koneksi lalu coba lagi.'
        try {
          const response = await requestError.context?.json()
          if (response?.error) message = response.error
        } catch {
          /* generic error without leaking internals */
        }
        throw new Error(message)
      }
      if (!data?.reference_code)
        throw new Error('Konfirmasi pengajuan belum diterima. Coba kembali.')
      setReference(data.reference_code)
      reset()
      setFiles([])
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Pengajuan gagal dikirim.')
    } finally {
      setToken('')
      if (widget.current) window.turnstile?.reset(widget.current)
    }
  }
  return (
    <section className={`${container} py-12 sm:py-16`}>
      <Eyebrow>Trade in / cerita baru</Eyebrow>
      <h1 className="max-w-2xl text-4xl font-extrabold leading-tight tracking-[-0.05em] sm:text-5xl">
        Mulai dari gadget
        <br />
        yang kamu punya.
      </h1>
      <p className="mt-5 max-w-xl text-sm leading-7 text-muted">
        Ceritakan kondisi perangkatmu. Admin akan meninjau informasi sebelum membahas kemungkinan
        dan nilai tukar.
      </p>
      <div className="mt-10 grid gap-6 border-y border-line py-7 sm:grid-cols-3">
        {[
          'Isi informasi perangkat',
          'Admin meninjau & menghubungi',
          'Diskusikan penawaran bersama',
        ].map((s, i) => (
          <div key={s} className="flex items-center gap-4">
            <span className="text-2xl font-extrabold text-gray-300">0{i + 1}</span>
            <p className="text-xs font-bold">{s}</p>
          </div>
        ))}
      </div>
      <div className="mt-12 grid gap-10 lg:grid-cols-[1.5fr_0.75fr]">
        {reference ? (
          <div role="status" className="rounded-xl border border-success/20 bg-success/5 p-8">
            <Check size={32} className="text-success" />
            <h2 className="mt-4 text-2xl font-bold">Pengajuan diterima.</h2>
            <p className="mt-4 text-sm leading-7 text-muted">
              Simpan nomor referensi ini. Pengajuan akan ditinjau admin dan belum merupakan
              persetujuan trade in.
            </p>
            <p className="my-6 rounded-lg bg-white p-4 font-mono text-lg font-bold">{reference}</p>
            <Link to="/gadget" className={secondaryClass}>
              Kembali ke katalog
              <ArrowRight size={16} />
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit(submit)} className="space-y-6" noValidate>
            {!ready && (
              <div
                role="status"
                className="rounded-lg border border-line bg-paper p-5 text-sm leading-7"
              >
                Form pengajuan belum dibuka. Kamu dapat membaca prosesnya terlebih dahulu;
                pengiriman akan aktif setelah layanan toko siap.
              </div>
            )}
            <fieldset disabled={!ready || isSubmitting} className="space-y-6 disabled:opacity-60">
              <div className="grid gap-5 sm:grid-cols-2">
                {[
                  { key: 'name', label: 'Nama lengkap', placeholder: 'Nama kamu' },
                  { key: 'phone', label: 'Nomor WhatsApp', placeholder: '08xxxxxxxxxx' },
                  { key: 'brand', label: 'Brand perangkat', placeholder: 'Contoh: Apple' },
                  { key: 'model', label: 'Model', placeholder: 'Contoh: iPhone 13' },
                  { key: 'storage_gb', label: 'Kapasitas (GB, opsional)', placeholder: '128' },
                ].map((f) => (
                  <Field
                    key={f.key}
                    label={f.label}
                    htmlFor={f.key}
                    error={errors[f.key as keyof TradeInput]?.message}
                  >
                    <input
                      id={f.key}
                      className={inputClass}
                      placeholder={f.placeholder}
                      type={f.key === 'phone' ? 'tel' : f.key === 'storage_gb' ? 'number' : 'text'}
                      aria-invalid={!!errors[f.key as keyof TradeInput]}
                      aria-describedby={
                        errors[f.key as keyof TradeInput] ? `${f.key}-error` : undefined
                      }
                      {...register(f.key as 'name')}
                    />
                  </Field>
                ))}
              </div>
              {[
                {
                  key: 'condition_notes',
                  label: 'Kondisi perangkat',
                  placeholder: 'Kondisi layar, bodi, baterai, dan cacat yang perlu diketahui…',
                },
                {
                  key: 'accessories',
                  label: 'Kelengkapan (opsional)',
                  placeholder: 'Dus, kabel, atau aksesori lain',
                },
                {
                  key: 'notes',
                  label: 'Catatan tambahan (opsional)',
                  placeholder: 'Perangkat tujuan atau hal yang ingin ditanyakan',
                },
              ].map((f) => (
                <Field
                  key={f.key}
                  label={f.label}
                  htmlFor={f.key}
                  error={errors[f.key as keyof TradeInput]?.message}
                >
                  <textarea
                    id={f.key}
                    rows={3}
                    className={inputClass}
                    placeholder={f.placeholder}
                    aria-invalid={!!errors[f.key as keyof TradeInput]}
                    aria-describedby={`${f.key}-error`}
                    {...register(f.key as 'condition_notes')}
                  />
                </Field>
              ))}
              <Field label="Foto perangkat (opsional)" htmlFor="photos">
                <FileDropzone
                  id="photos"
                  files={files}
                  multiple
                  disabled={!ready || isSubmitting}
                  hint="Maks. 4 foto · JPG, PNG, atau WebP · maks. 5 MB per foto. Hindari IMEI, serial, dan data pribadi."
                  onFiles={(selected) => {
                    const invalid = selected.map(validatePhoto).find(Boolean)
                    if (selected.length > 4 || invalid) {
                      setError(invalid || 'Maksimum 4 foto.')
                      setFiles([])
                    } else {
                      setError('')
                      setFiles(selected)
                    }
                  }}
                />
              </Field>
              <div className="hidden" aria-hidden="true">
                <label htmlFor="website">Website</label>
                <input id="website" tabIndex={-1} autoComplete="off" {...register('website')} />
              </div>
              <label className="flex items-start gap-3 text-xs leading-6">
                <input
                  type="checkbox"
                  className="mt-1 size-4 shrink-0 accent-navy"
                  {...register('consent')}
                />
                <span>
                  Saya menyetujui penggunaan data dan foto untuk tindak lanjut pengajuan ini, sesuai{' '}
                  <Link className="font-bold underline" to="/privasi">
                    kebijakan privasi
                  </Link>
                  .
                </span>
              </label>
              {errors.consent && (
                <p role="alert" className="text-xs text-danger">
                  {errors.consent.message}
                </p>
              )}
              <div ref={captcha} className="min-h-0 overflow-hidden" />
              <Button type="submit" disabled={isSubmitting || !token} className="w-full">
                {isSubmitting ? 'Mengirim pengajuan…' : 'Kirim pengajuan'}
                <ArrowRight size={16} />
              </Button>
            </fieldset>
            {error && (
              <p role="alert" className="rounded-lg bg-danger/5 p-4 text-xs text-danger">
                {error}
              </p>
            )}
          </form>
        )}
        <aside className="h-fit rounded-xl bg-paper p-7">
          <LockKeyhole size={24} strokeWidth={1.4} />
          <h2 className="mt-4 text-lg font-bold">Informasi kamu tetap privat.</h2>
          <p className="mt-3 text-xs leading-7 text-muted">
            Data dan foto pengajuan hanya dapat dibaca oleh admin yang berwenang. Penilaian akhir
            memerlukan pemeriksaan perangkat dan kesepakatan langsung.
          </p>
          <p className="mt-5 border-t border-line pt-5 text-xs leading-7 text-muted">
            Mengisi formulir tidak menjamin perangkat diterima atau menetapkan harga tukar.
          </p>
        </aside>
      </div>
    </section>
  )
}
