import { useEffect } from 'react'

export function PageMeta({ title, description, image = '/brand/brinco-de-princesa-logo.png', type = 'website', noindex = false }) {
  useEffect(() => {
    const fullTitle = `${title} | Brinco de Princesa`
    document.title = fullTitle
    const meta = document.querySelector('meta[name="description"]')
    if (meta) meta.setAttribute('content', description)
    document.querySelector('meta[property="og:title"]')?.setAttribute('content', fullTitle)
    document.querySelector('meta[property="og:description"]')?.setAttribute('content', description)
    document.querySelector('meta[property="og:type"]')?.setAttribute('content', type)
    document.querySelector('meta[property="og:image"]')?.setAttribute('content', image)
    document.querySelector('meta[name="robots"]')?.setAttribute('content', noindex ? 'noindex, nofollow' : 'index, follow')
  }, [description, image, noindex, title, type])
  return null
}
