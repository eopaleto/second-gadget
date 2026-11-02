import { useEffect } from 'react'
import { useStore } from '../lib/data'
import { imageUrl } from '../lib/supabase'

export default function StoreFavicon() {
  const { data } = useStore()
  const logo = imageUrl(data?.settings.logo_path)
  useEffect(() => {
    let icon = document.querySelector<HTMLLinkElement>('link[rel="icon"]')
    if (!icon) {
      icon = document.createElement('link')
      icon.rel = 'icon'
      document.head.append(icon)
    }
    icon.href = logo || '/favicon.svg'
    if (logo) icon.removeAttribute('type')
    else icon.type = 'image/svg+xml'
  }, [logo])
  return null
}
