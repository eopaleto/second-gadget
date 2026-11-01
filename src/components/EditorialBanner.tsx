import { useState } from 'react'
import { ArrowUpRight, Pause, Play } from 'lucide-react'

export default function EditorialBanner() {
  const [paused, setPaused] = useState(false)
  const playState = paused ? 'paused' : 'running'
  return (
    <div className="relative isolate min-h-[320px] min-w-0 overflow-hidden bg-[#17191b] [perspective:1200px] sm:min-h-[440px]">
      <div
        className="absolute -inset-[7%] animate-editorial-float [transform-style:preserve-3d] motion-reduce:animate-none motion-reduce:transform-none"
        style={{ animationPlayState: playState }}
      >
        <img
          src="/images/editorial-iphone.webp"
          alt="Foto editorial detail iPhone berwarna silver di atas permukaan gelap"
          width="1200"
          height="1600"
          fetchPriority="high"
          className="absolute size-full object-cover object-center [backface-visibility:hidden]"
        />
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-linear-to-tr from-[#446e9b]/15 via-transparent to-[#e9d0a2]/15 [transform:translateZ(20px)]"
        />
      </div>
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -inset-y-1/2 left-0 w-1/2 animate-editorial-shine bg-linear-to-r from-transparent via-white/8 to-transparent motion-reduce:hidden"
        style={{ animationPlayState: playState }}
      />
      <div className="pointer-events-none absolute inset-x-5 top-6 flex items-start justify-between gap-3 text-[9px] font-semibold tracking-[0.18em] text-white/80 sm:inset-x-6">
        <span>SECOND LOOK. FIRST LOVE.</span>
        <ArrowUpRight size={19} className="shrink-0" />
      </div>
      <div className="absolute inset-x-0 bottom-0 bg-linear-to-t from-black/80 to-transparent p-6 pt-16 text-white sm:p-8 sm:pt-16">
        <p className="text-[10px] uppercase tracking-[0.18em] text-white/60">A new chapter</p>
        <p className="mt-2 text-2xl font-semibold tracking-[-0.04em]">Masih banyak cerita.</p>
      </div>
    </div>
  )
}
