import { useRef } from 'react'
import { ChevronLeft, ChevronRight, Smartphone, ZoomIn } from 'lucide-react'
import type { ProductImage } from '../types'
import { imageUrl } from '../lib/supabase'

type Props = {
  pictures: ProductImage[]
  name: string
  selected: number
  onSelect: (index: number) => void
  onOpen?: () => void
  enlarged?: boolean
}

export default function ProductImageViewer({
  pictures,
  name,
  selected,
  onSelect,
  onOpen,
  enlarged = false,
}: Props) {
  const start = useRef<{ x: number; y: number } | null>(null)
  const suppressClickUntil = useRef(0)
  const index = selected >= 0 && selected < pictures.length ? selected : 0
  const picture = pictures[index]
  const multiple = pictures.length > 1
  function move(direction: number) {
    if (multiple) onSelect((index + direction + pictures.length) % pictures.length)
  }
  const photo = picture ? (
    <img
      src={imageUrl(picture.storage_path)}
      alt={picture.alt_text || name}
      width="700"
      height="700"
      draggable={false}
      className="size-full object-contain"
    />
  ) : (
    <Smartphone size={80} strokeWidth={1} className="text-muted" />
  )
  const controlClass =
    'button-primary absolute top-1/2 z-10 flex size-11 -translate-y-1/2 items-center justify-center rounded-lg bg-navy text-white shadow-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-navy'

  return (
    <div
      role="group"
      aria-label={`Foto produk ${name}`}
      tabIndex={multiple ? 0 : undefined}
      className={`relative flex w-full touch-pan-y touch-pinch-zoom items-center justify-center overflow-hidden bg-paper focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-navy ${enlarged ? 'h-[65dvh] rounded-lg' : 'aspect-square rounded-2xl'}`}
      onKeyDown={(event) => {
        if (!multiple || (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight')) return
        event.preventDefault()
        suppressClickUntil.current = 0
        move(event.key === 'ArrowRight' ? 1 : -1)
      }}
      onTouchStart={(event) => {
        suppressClickUntil.current = 0
        const touch = event.touches.length === 1 ? event.touches[0] : null
        start.current = touch ? { x: touch.clientX, y: touch.clientY } : null
      }}
      onTouchEnd={(event) => {
        const origin = start.current
        start.current = null
        const touch = event.changedTouches[0]
        if (!multiple || !origin || !touch) return
        const dx = touch.clientX - origin.x
        const dy = touch.clientY - origin.y
        if (Math.abs(dx) < 40 || Math.abs(dx) <= Math.abs(dy) * 1.2) return
        suppressClickUntil.current = Date.now() + 500
        if (event.cancelable) event.preventDefault()
        move(dx < 0 ? 1 : -1)
      }}
      onTouchCancel={() => {
        start.current = null
      }}
      onClickCapture={(event) => {
        if (Date.now() >= suppressClickUntil.current) return
        event.preventDefault()
        event.stopPropagation()
      }}
    >
      {onOpen ? (
        <button
          type="button"
          onClick={onOpen}
          disabled={!picture}
          aria-label="Perbesar foto unit"
          className="relative flex size-full items-center justify-center"
        >
          {photo}
          {picture && (
            <span className="absolute bottom-3 right-3 rounded-lg bg-white p-2 text-ink">
              <ZoomIn size={18} />
            </span>
          )}
        </button>
      ) : (
        <div className="flex size-full items-center justify-center">{photo}</div>
      )}
      {multiple && (
        <>
          <button
            type="button"
            aria-label={`Foto sebelumnya: ${name}`}
            onClick={() => move(-1)}
            className={`${controlClass} left-1 sm:left-2`}
          >
            <ChevronLeft size={22} />
          </button>
          <button
            type="button"
            aria-label={`Foto berikutnya: ${name}`}
            onClick={() => move(1)}
            className={`${controlClass} right-1 sm:right-2`}
          >
            <ChevronRight size={22} />
          </button>
          <p
            role="status"
            aria-live="polite"
            aria-atomic="true"
            className="pointer-events-none absolute bottom-2 left-1/2 -translate-x-1/2 rounded-md bg-navy/90 px-2 py-1 text-[10px] font-bold text-white"
          >
            {index + 1} / {pictures.length}
          </p>
        </>
      )}
    </div>
  )
}
