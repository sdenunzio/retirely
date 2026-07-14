import { describe, it, expect } from 'vitest'

import { LEGAL_PAGES, LEGAL_BY_SLUG, renderLegalPage, CONTACT_EMAIL } from './legal.js'
import { siteFooter, FONT_LINKS, PAGE_CSS } from './brand.js'
import { sitemapUrls, esc } from '../seo/content.js'

describe('legal pages', () => {
  it('exposes exactly a privacy and a terms page', () => {
    const slugs = LEGAL_PAGES.map((p) => p.slug).sort()
    expect(slugs).toEqual(['privacy', 'terms'])
    expect(LEGAL_BY_SLUG.privacy.h1).toBe('Privacy Policy')
    expect(LEGAL_BY_SLUG.terms.h1).toContain('Disclaimer')
  })

  it('each renders a complete document with canonical, chrome and schema', () => {
    for (const page of LEGAL_PAGES) {
      const html = renderLegalPage(page)
      expect(html.startsWith('<!doctype html>')).toBe(true)
      expect(html).toContain(`<link rel="canonical" href="https://retirely.ca/${page.slug}"`)
      expect(html).toContain(`<h1>${esc(page.h1)}</h1>`)
      expect(html).toContain('"@type":"WebPage"')
      expect(html).toContain('"@type":"BreadcrumbList"')
      expect(html).toContain('class="site-header"')
      expect(html).toContain('class="site-footer"')
      expect(html).toContain(CONTACT_EMAIL)
    }
  })

  it('privacy page states the no-collection facts plainly', () => {
    const html = renderLegalPage(LEGAL_BY_SLUG.privacy)
    expect(html).toMatch(/no cookies/i)
    expect(html).toMatch(/local storage/i)
    expect(html).toMatch(/do not collect personal information/i)
  })

  it('terms page leads with the not-financial-advice disclaimer', () => {
    const html = renderLegalPage(LEGAL_BY_SLUG.terms)
    expect(html).toMatch(/not financial.*advice/i)
    expect(html).toMatch(/limitation of liability/i)
  })

  it('the shared footer links to both legal pages', () => {
    const foot = siteFooter()
    expect(foot).toContain('href="/privacy"')
    expect(foot).toContain('href="/terms"')
  })

  it('both legal pages are in the sitemap', () => {
    const locs = sitemapUrls([]).map((u) => u.loc)
    expect(locs).toContain('https://retirely.ca/privacy')
    expect(locs).toContain('https://retirely.ca/terms')
  })
})

describe('self-hosted fonts', () => {
  it('FONT_LINKS preloads a local woff2 and makes no third-party request', () => {
    expect(FONT_LINKS).toContain('/fonts/dm-sans-400.woff2')
    expect(FONT_LINKS).not.toContain('fonts.googleapis.com')
    expect(FONT_LINKS).not.toContain('fonts.gstatic.com')
  })

  it('PAGE_CSS embeds the @font-face declarations locally', () => {
    expect(PAGE_CSS).toContain('@font-face')
    expect(PAGE_CSS).toContain('/fonts/dm-sans-400.woff2')
    expect(PAGE_CSS).not.toContain('fonts.gstatic.com')
  })
})
