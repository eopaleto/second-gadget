import { useEffect } from 'react'
export function useSeo(
  title: string,
  description = 'Jual beli gadget second di Second Device. Lihat kondisi unit, harga, dan stok yang dipublikasikan toko.',
  image?: string,
) {
  useEffect(() => {
    document.title = `${title} — Second Device`
    const site = import.meta.env.VITE_SITE_URL
    const socialImage = new URL(image || '/favicon.svg', site || window.location.origin).href
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
      ['meta[property="og:image"]', 'property', 'og:image', socialImage],
      ['meta[property="og:image:alt"]', 'property', 'og:image:alt', 'Logo Second Device'],
      ['meta[name="twitter:card"]', 'name', 'twitter:card', 'summary'],
      ['meta[name="twitter:title"]', 'name', 'twitter:title', document.title],
      ['meta[name="twitter:description"]', 'name', 'twitter:description', description],
      ['meta[name="twitter:image"]', 'name', 'twitter:image', socialImage],
      ['meta[name="twitter:image:alt"]', 'name', 'twitter:image:alt', 'Logo Second Device'],
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
