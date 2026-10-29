import { useEffect } from 'react'
export function useSeo(
  title: string,
  description = 'Jual beli gadget second di Second Device. Lihat kondisi unit, harga, dan stok yang dipublikasikan toko.',
  image?: string,
) {
  useEffect(() => {
    document.title = `${title} — Second Device`
    const site = import.meta.env.VITE_SITE_URL
    if (site) {
      try {
        const canonicalUrl = new URL(window.location.pathname, site).href
        let canonical = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null
        if (!canonical) {
          canonical = document.createElement('link')
          canonical.rel = 'canonical'
          document.head.append(canonical)
        }
        canonical.href = canonicalUrl
        let ogUrl = document.querySelector('meta[property="og:url"]') as HTMLMetaElement | null
        if (!ogUrl) {
          ogUrl = document.createElement('meta')
          ogUrl.setAttribute('property', 'og:url')
          document.head.append(ogUrl)
        }
        ogUrl.content = canonicalUrl
      } catch {
        /* an unset or invalid site URL must not break the storefront */
      }
    }
    for (const [selector, attr, name, content] of [
      ['meta[name="description"]', 'name', 'description', description],
      ['meta[property="og:title"]', 'property', 'og:title', document.title],
      ['meta[property="og:description"]', 'property', 'og:description', description],
      ['meta[property="og:image"]', 'property', 'og:image', image || ''],
    ]) {
      let element = document.querySelector(selector) as HTMLMetaElement | null
      if (!element) {
        element = document.createElement('meta')
        element.setAttribute(attr, name)
        document.head.append(element)
      }
      element.content = content
    }
  }, [title, description, image])
}
