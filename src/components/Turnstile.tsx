import { useEffect, useRef, useState } from 'react'
export default function Turnstile({
  action,
  onToken,
  resetKey = 0,
}: {
  action: string
  onToken: (token: string) => void
  resetKey?: number
}) {
  const ref = useRef<HTMLDivElement>(null),
    callback = useRef(onToken),
    [error, setError] = useState('')
  callback.current = onToken
  useEffect(() => {
    let widget: string | undefined
    const render = () => {
      if (ref.current && window.turnstile && !widget)
        widget = window.turnstile.render(ref.current, {
          sitekey: import.meta.env.VITE_TURNSTILE_SITE_KEY,
          action,
          size: 'compact',
          theme: 'light',
          callback: (token: string) => {
            setError('')
            callback.current(token)
          },
          'expired-callback': () => callback.current(''),
          'error-callback': () => {
            callback.current('')
            setError('Verifikasi gagal. Periksa koneksi atau muat ulang halaman.')
          },
        })
    }
    const fail = () => setError('Verifikasi tidak dapat dimuat. Periksa koneksi internet.')
    let script = document.querySelector<HTMLScriptElement>('script[data-turnstile]')
    if (!script) {
      script = document.createElement('script')
      script.dataset.turnstile = 'true'
      script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit'
      script.async = true
      document.head.append(script)
    }
    script.addEventListener('load', render)
    script.addEventListener('error', fail)
    render()
    return () => {
      script?.removeEventListener('load', render)
      script?.removeEventListener('error', fail)
      if (widget) window.turnstile?.remove(widget)
    }
  }, [action, resetKey])
  return (
    <div>
      <div ref={ref} />
      {error && (
        <p role="alert" className="mt-2 text-xs text-danger">
          {error}
        </p>
      )}
    </div>
  )
}
