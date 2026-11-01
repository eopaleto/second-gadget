import { useEffect, useRef, useState } from 'react'
import { useReducedMotion } from 'motion/react'
import { Link } from 'react-router-dom'
import { catalogBrands, brandLogo } from '../lib/catalog'
import { imageUrl } from '../lib/supabase'
import type { Brand } from '../types'
import { container } from './ui'

export default function BrandMarquee({ brands }: { brands: Brand[] }) {
  const viewport = useRef<HTMLDivElement>(null)
  const firstGroup = useRef<HTMLDivElement>(null)
  const gesture = useRef<{ id: number; startX: number; lastX: number; dragged: boolean } | null>(
    null,
  )
  const suppressClick = useRef(false)
  const keyboardFocus = useRef(false)
  const [dragging, setDragging] = useState(false)
  const reducedMotion = useReducedMotion()

  useEffect(() => {
    const element = viewport.current
    const group = firstGroup.current
    if (!element || !group || reducedMotion) return

    element.scrollLeft = group.offsetWidth
    let frame = 0
    let previous = 0
    let remainder = 0
    const advance = (time: number) => {
      const elapsed = previous ? Math.min(time - previous, 50) : 0
      previous = time
      if (!gesture.current && !keyboardFocus.current) {
        remainder += (group.offsetWidth * elapsed) / 70000
        const pixels = Math.floor(remainder)
        if (pixels) {
          element.scrollLeft += pixels
          remainder -= pixels
        }
      }
      frame = requestAnimationFrame(advance)
    }
    frame = requestAnimationFrame(advance)
    return () => cancelAnimationFrame(frame)
  }, [reducedMotion, brands])

  useEffect(() => {
    const release = () => {
      gesture.current = null
      setDragging(false)
    }
    window.addEventListener('pointerup', release)
    window.addEventListener('pointercancel', release)
    window.addEventListener('blur', release)
    return () => {
      window.removeEventListener('pointerup', release)
      window.removeEventListener('pointercancel', release)
      window.removeEventListener('blur', release)
    }
  }, [])

  function finishGesture(element: HTMLDivElement, pointerId: number) {
    if (gesture.current?.id !== pointerId) return
    gesture.current = null
    setDragging(false)
    if (element.hasPointerCapture(pointerId)) element.releasePointerCapture(pointerId)
  }
  const all = [
    ...catalogBrands.filter((b) => !brands.some((x) => x.slug === b.slug)),
    ...brands,
  ].sort((a, b) => a.sort_order - b.sort_order)
  return (
    <section className={`${container} pt-12`} aria-label="Jelajahi brand perangkat">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-extrabold">Satu tempat. Banyak pilihan brand.</h2>
          <p className="mt-1 text-[11px] text-muted">
            Jelajahi merek favoritmu. Stok mengikuti unit yang tersedia.
          </p>
        </div>
      </div>
      <div
        ref={viewport}
        role="region"
        aria-label="Daftar brand, geser ke kiri atau kanan"
        tabIndex={0}
        className={`overflow-x-auto overscroll-x-contain touch-pan-y touch-pinch-zoom select-none border-y border-line py-4 outline-offset-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:py-5 ${dragging ? 'cursor-grabbing' : 'cursor-grab'}`}
        onScroll={() => {
          if (reducedMotion) return
          const element = viewport.current
          const width = firstGroup.current?.offsetWidth || 0
          if (!element || !width) return
          // Keep either swipe direction inside identical copies without a visible jump.
          if (element.scrollLeft < width) element.scrollLeft += width
          else if (element.scrollLeft >= width * 2) element.scrollLeft -= width
        }}
        onPointerDown={(event) => {
          if (!event.isPrimary || event.button !== 0) return
          suppressClick.current = false
          gesture.current = {
            id: event.pointerId,
            startX: event.clientX,
            lastX: event.clientX,
            dragged: false,
          }
        }}
        onPointerMove={(event) => {
          const current = gesture.current
          if (!current || current.id !== event.pointerId) return
          if (!current.dragged && Math.abs(event.clientX - current.startX) < 6) return
          if (!current.dragged) {
            current.dragged = true
            suppressClick.current = true
            event.currentTarget.setPointerCapture(event.pointerId)
            setDragging(true)
          }
          event.currentTarget.scrollLeft -= event.clientX - current.lastX
          current.lastX = event.clientX
        }}
        onPointerUp={(event) => finishGesture(event.currentTarget, event.pointerId)}
        onPointerCancel={(event) => finishGesture(event.currentTarget, event.pointerId)}
        onLostPointerCapture={(event) => finishGesture(event.currentTarget, event.pointerId)}
        onClickCapture={(event) => {
          if (!suppressClick.current) return
          event.preventDefault()
          event.stopPropagation()
          suppressClick.current = false
        }}
        onDragStart={(event) => event.preventDefault()}
        onFocusCapture={(event) => {
          keyboardFocus.current = event.target.matches(':focus-visible')
        }}
        onBlurCapture={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget)) keyboardFocus.current = false
        }}
        onKeyDown={(event) => {
          if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return
          event.preventDefault()
          event.currentTarget.scrollLeft += event.key === 'ArrowRight' ? 144 : -144
        }}
      >
        <div className="flex w-max">
          {(reducedMotion ? [1] : [0, 1, 2]).map((copy) => (
            <div
              key={copy}
              ref={copy === (reducedMotion ? 1 : 0) ? firstGroup : undefined}
              aria-hidden={copy !== 1 ? true : undefined}
              className="flex shrink-0 items-center"
            >
              {all.map((b) => (
                <Link
                  key={b.slug}
                  to={`/gadget?brand=${encodeURIComponent(b.slug)}`}
                  tabIndex={copy !== 1 ? -1 : 0}
                  draggable={false}
                  aria-label={`Lihat gadget ${b.name}`}
                  className="flex h-20 w-36 shrink-0 items-center justify-center px-4 transition-transform hover:scale-105 focus-visible:rounded-lg focus-visible:outline-2 focus-visible:outline-navy sm:h-24 sm:w-44 motion-reduce:transform-none"
                >
                  {brandLogo(b) ? (
                    <img
                      src={imageUrl(brandLogo(b))}
                      alt={b.name}
                      width="144"
                      height="64"
                      loading="lazy"
                      draggable={false}
                      className="h-14 w-full object-contain sm:h-16"
                    />
                  ) : (
                    <span className="text-base font-extrabold sm:text-lg">{b.name}</span>
                  )}
                </Link>
              ))}
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
