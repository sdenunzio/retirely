import { useEffect } from 'react'

// Lightweight, dependency-free per-route <head> management for the
// client-rendered tool pages (the static SEO landing pages carry their own
// baked-in <head>). Sets title, meta description and canonical, restoring the
// document defaults on unmount so SPA navigation doesn't leak stale tags.
export function usePageMeta({ title, description, canonical }) {
  useEffect(() => {
    const prevTitle = document.title
    if (title) document.title = title

    const setMeta = (selector, attr, value) => {
      if (!value) return () => {}
      let el = document.head.querySelector(selector)
      let created = false
      if (!el) {
        el = document.createElement(selector.startsWith('link') ? 'link' : 'meta')
        if (selector.startsWith('link')) el.setAttribute('rel', 'canonical')
        else el.setAttribute('name', 'description')
        document.head.appendChild(el)
        created = true
      }
      const prev = el.getAttribute(attr)
      el.setAttribute(attr, value)
      return () => {
        if (created) el.remove()
        else if (prev != null) el.setAttribute(attr, prev)
      }
    }

    const restoreDesc = setMeta('meta[name="description"]', 'content', description)
    const restoreCanonical = setMeta('link[rel="canonical"]', 'href', canonical)

    return () => {
      document.title = prevTitle
      restoreDesc()
      restoreCanonical()
    }
  }, [title, description, canonical])
}
