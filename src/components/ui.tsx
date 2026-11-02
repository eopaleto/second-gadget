import { useEffect, useRef, useState, type ReactNode, type ButtonHTMLAttributes } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, PackageOpen, RefreshCw, UploadCloud, X } from 'lucide-react'
import { motion, useReducedMotion } from 'motion/react'

export const container = 'mx-auto w-full max-w-[1280px] px-5 sm:px-8 lg:px-12'
export const inputClass =
  'w-full min-h-11 rounded-lg border border-line bg-white px-3 py-2.5 text-sm text-ink outline-none transition focus:border-navy focus:ring-2 focus:ring-navy/15 disabled:bg-paper disabled:text-muted'
export const buttonClass =
  'button-primary inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-navy px-5 py-3 text-sm font-bold text-white transition hover:bg-navy-hover focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-navy disabled:cursor-not-allowed disabled:opacity-50 motion-reduce:transition-none'
export const secondaryClass =
  'inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-line bg-white px-5 py-3 text-sm font-bold text-ink transition hover:border-ink focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-navy disabled:cursor-not-allowed disabled:opacity-50'
export function Button(props: ButtonHTMLAttributes<HTMLButtonElement> & { secondary?: boolean }) {
  const { secondary, className = '', ...rest } = props
  return <button className={`${secondary ? secondaryClass : buttonClass} ${className}`} {...rest} />
}
export function Eyebrow({ children, light = false }: { children: ReactNode; light?: boolean }) {
  return (
    <p
      className={`mb-4 text-[10px] font-extrabold uppercase tracking-[0.22em] sm:text-xs ${light ? 'text-white/60' : 'text-muted'}`}
    >
      {children}
    </p>
  )
}
export function SectionTitle({
  eyebrow,
  title,
  description,
  to,
  link = 'Lihat semua',
}: {
  eyebrow?: string
  title: string
  description?: string
  to?: string
  link?: string
}) {
  return (
    <div className="mb-8 flex flex-wrap items-end justify-between gap-5">
      {' '}
      <div>
        {eyebrow && <Eyebrow>{eyebrow}</Eyebrow>}
        <h2 className="text-3xl font-extrabold tracking-[-0.045em] sm:text-4xl">{title}</h2>
        {description && <p className="mt-3 max-w-xl text-sm leading-7 text-muted">{description}</p>}
      </div>
      {to && (
        <Link
          to={to}
          className="inline-flex min-h-11 items-center gap-3 text-sm font-bold underline-offset-4 hover:underline"
        >
          {link}
          <ArrowRight size={17} />
        </Link>
      )}
    </div>
  )
}
export function EmptyState({
  title,
  description,
  action,
  compact = false,
}: {
  title: string
  description: string
  action?: ReactNode
  compact?: boolean
}) {
  return (
    <div
      className={`flex flex-col items-center rounded-xl border border-dashed border-line bg-paper/40 px-6 text-center ${compact ? 'py-10' : 'py-16 sm:py-20'}`}
    >
      <div className="mb-5 flex size-14 items-center justify-center rounded-2xl border border-line bg-white">
        <PackageOpen size={24} strokeWidth={1.3} />
      </div>
      <h3 className="text-xl font-bold tracking-tight">{title}</h3>
      <p className="mt-3 max-w-md text-sm leading-7 text-muted">{description}</p>
      {action && <div className="mt-6">{action}</div>}
    </div>
  )
}
export function Loading({ label = 'Memuat data toko…' }: { label?: string }) {
  return (
    <div
      role="status"
      className="flex min-h-52 items-center justify-center gap-3 p-8 text-sm text-muted"
    >
      <RefreshCw className="animate-spin motion-reduce:animate-none" size={18} />
      {label}
    </div>
  )
}
export function ErrorState({ retry }: { retry?: () => void }) {
  return (
    <div role="alert" className="rounded-xl border border-danger/20 bg-danger/5 p-8 text-center">
      <h3 className="font-bold">Data belum berhasil dimuat</h3>
      <p className="my-3 text-sm text-muted">
        Periksa koneksi internet lalu coba lagi. Informasi stok belum dapat ditampilkan.
      </p>
      {retry && (
        <Button secondary onClick={retry}>
          <RefreshCw size={16} />
          Coba lagi
        </Button>
      )}
    </div>
  )
}
export function Reveal({ children, className = '' }: { children: ReactNode; className?: string }) {
  const reduced = useReducedMotion()
  return (
    <motion.div
      className={className}
      initial={reduced ? false : { opacity: 0, y: 10 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '0px 0px -20px 0px' }}
      transition={{ duration: 0.4 }}
    >
      {children}
    </motion.div>
  )
}
export function Dialog({
  open,
  onClose,
  title,
  children,
  wide = false,
}: {
  open: boolean
  onClose: () => void
  title: string
  children: ReactNode
  wide?: boolean
}) {
  const ref = useRef<HTMLDialogElement>(null)
  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    if (open && !dialog.open) dialog.showModal()
    if (!open && dialog.open) dialog.close()
    if (open) {
      const previous = document.body.style.overflow
      document.body.style.overflow = 'hidden'
      return () => {
        document.body.style.overflow = previous
      }
    }
  }, [open])
  return (
    <dialog
      ref={ref}
      aria-label={title}
      onCancel={(event) => {
        event.preventDefault()
        onClose()
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          const r = e.currentTarget.getBoundingClientRect()
          if (
            e.clientX < r.left ||
            e.clientX > r.right ||
            e.clientY < r.top ||
            e.clientY > r.bottom
          )
            onClose()
        }
      }}
      className={`m-auto max-h-[90dvh] w-[calc(100%_-_2rem)] rounded-2xl bg-white p-0 text-ink shadow-2xl backdrop:bg-ink/50 ${wide ? 'max-w-4xl' : 'max-w-lg'}`}
    >
      <div className="sticky top-0 z-10 flex items-center justify-between gap-4 border-b border-line bg-white px-6 py-4">
        <h2 className="text-lg font-bold">{title}</h2>
        <button
          aria-label="Tutup dialog"
          className="flex size-11 shrink-0 items-center justify-center rounded-lg hover:bg-paper"
          onClick={onClose}
        >
          <X size={20} />
        </button>
      </div>
      <div className="p-6">{children}</div>
    </dialog>
  )
}
export function Field({
  label,
  htmlFor,
  error,
  children,
}: {
  label: string
  htmlFor: string
  error?: string
  children: ReactNode
}) {
  return (
    <div>
      <label htmlFor={htmlFor} className="mb-2 block text-xs font-bold">
        {label}
      </label>
      {children}
      {error && (
        <p id={`${htmlFor}-error`} role="alert" className="mt-1 text-xs text-danger">
          {error}
        </p>
      )}
    </div>
  )
}

export function FileDropzone({
  id,
  files,
  onFiles,
  multiple = false,
  accept = 'image/jpeg,image/png,image/webp',
  hint,
  disabled = false,
}: {
  id: string
  files: File[]
  onFiles: (files: File[]) => void
  multiple?: boolean
  accept?: string
  hint: string
  disabled?: boolean
}) {
  const [dragging, setDragging] = useState(false)
  return (
    <div
      onDragOver={(event) => {
        event.preventDefault()
        if (!disabled) setDragging(true)
      }}
      onDragLeave={(event) => {
        if (!(event.relatedTarget instanceof Node) || !event.currentTarget.contains(event.relatedTarget))
          setDragging(false)
      }}
      onDrop={(event) => {
        event.preventDefault()
        setDragging(false)
        if (!disabled && event.dataTransfer.files.length) onFiles(Array.from(event.dataTransfer.files))
      }}
      className={`rounded-xl border-2 border-dashed transition ${
        dragging ? 'border-navy bg-navy/5' : 'border-line bg-paper/40'
      } focus-within:ring-2 focus-within:ring-navy/20`}
    >
      <input
        id={id}
        type="file"
        accept={accept}
        multiple={multiple}
        disabled={disabled}
        className="sr-only"
        onChange={(event) => {
          onFiles(Array.from(event.target.files || []))
          event.target.value = ''
        }}
      />
      <label
        htmlFor={id}
        className={`flex min-h-40 flex-col items-center justify-center px-5 py-6 text-center ${
          disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'
        }`}
      >
        <span className="mb-3 flex size-11 items-center justify-center rounded-full bg-white text-navy">
          <UploadCloud size={22} />
        </span>
        <span className="text-sm font-bold">Seret dan lepaskan file di sini</span>
        <span className="mt-1 text-xs text-muted">
          atau <span className="font-bold text-navy underline underline-offset-2">pilih file</span>
        </span>
        <span className="mt-2 text-[10px] leading-5 text-muted">{hint}</span>
      </label>
      {files.length > 0 && (
        <ul aria-live="polite" className="border-t border-line px-4 py-3 text-xs text-muted">
          {files.map((file, index) => (
            <li key={`${file.name}-${file.lastModified}-${index}`} className="truncate">
              {file.name}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
