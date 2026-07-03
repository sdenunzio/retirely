import { describe, it, expect } from 'vitest'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

import { logoMark, siteHeader, siteFooter, APP_URL } from './brand.js'
import { renderHome } from './home.js'
import {
  parseArticle,
  loadArticles,
  renderArticle,
  renderArticlesHub,
} from './articles.js'

const ARTICLES_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'content', 'articles')

describe('brand chrome', () => {
  it('renders the real Retirely mark (inline SVG + wordmark), not the RetirePlan file', () => {
    const header = siteHeader('home')
    expect(header).toContain('<svg')
    expect(header).toContain('Retirely')
    expect(header).not.toContain('logo.svg') // the stale RetirePlan asset
    expect(header).not.toContain('RetirePlan')
  })

  it('namespaces logo gradients so multiple marks can coexist on a page', () => {
    expect(logoMark('a')).toContain('id="aBg"')
    expect(logoMark('b')).toContain('id="bTeal"')
  })

  it('header nav + footer point at the app under /calculator', () => {
    expect(APP_URL).toBe('/calculator')
    expect(siteHeader()).toContain(`href="/calculator"`)
    expect(siteFooter()).toContain(`href="/calculator"`)
  })
})

describe('renderHome', () => {
  const html = renderHome({
    articles: [
      { slug: 'a', title: 'Article A', description: 'Desc A', readableDate: 'June 30, 2026', readMinutes: 4, tags: ['Planning'] },
    ],
  })

  it('is a complete document with hero H1 and CTA to /calculator', () => {
    expect(html.startsWith('<!doctype html>')).toBe(true)
    expect(html).toContain('<h1>Plan your Canadian retirement with confidence</h1>')
    expect(html).toContain('href="/calculator"')
  })

  it('sets a self-canonical and WebSite + FAQPage schema', () => {
    expect(html).toContain('<link rel="canonical" href="https://retirely.ca/"')
    expect(html).toContain('"@type":"WebSite"')
    expect(html).toContain('"@type":"FAQPage"')
  })

  it('surfaces provided articles and links to popular calculators', () => {
    expect(html).toContain('/articles/a')
    expect(html).toContain('Article A')
    expect(html).toContain('/rrsp-calculator')
  })
})

describe('parseArticle', () => {
  const SRC = `---
title: Test Article
description: A test description that is reasonably long.
date: 2026-06-01
tags: [Tax, Strategy]
calculator: { slug: rrsp-calculator, label: Open it, tab: accumulation }
faqs:
  - q: Is this a test?
    a: Yes it is.
---

# Heading

Some **body** copy with enough words to register a read time.`

  it('parses frontmatter, body and derived fields', () => {
    const a = parseArticle('test-article', SRC)
    expect(a.slug).toBe('test-article')
    expect(a.title).toBe('Test Article')
    expect(a.tags).toEqual(['Tax', 'Strategy'])
    expect(a.readableDate).toBe('June 1, 2026')
    expect(a.readMinutes).toBeGreaterThanOrEqual(1)
    expect(a.bodyHtml).toContain('<strong>body</strong>')
    expect(a.faqs[0].q).toBe('Is this a test?')
  })

  it('throws on missing required frontmatter', () => {
    expect(() => parseArticle('bad', `---\ntitle: X\n---\nbody`)).toThrow(/description|date/)
  })

  it('throws on a malformed date', () => {
    expect(() => parseArticle('bad', `---\ntitle: X\ndescription: yyyy\ndate: June 2026\n---\nbody`)).toThrow(/date/)
  })
})

describe('starter articles on disk', () => {
  it('all parse and are sorted newest-first', async () => {
    const articles = await loadArticles(ARTICLES_DIR)
    expect(articles.length).toBeGreaterThanOrEqual(5)
    for (let i = 1; i < articles.length; i++) {
      expect(articles[i - 1].date >= articles[i].date).toBe(true)
    }
    // every internal related slug resolves to a real article
    const slugs = new Set(articles.map((a) => a.slug))
    for (const a of articles) {
      for (const rel of a.related) expect(slugs.has(rel), `${a.slug} → ${rel}`).toBe(true)
    }
  })

  it('renderArticle emits Article + Breadcrumb schema and a canonical', async () => {
    const [a] = await loadArticles(ARTICLES_DIR)
    const html = renderArticle(a, {})
    expect(html).toContain('"@type":"Article"')
    expect(html).toContain('"@type":"BreadcrumbList"')
    expect(html).toContain(`<link rel="canonical" href="https://retirely.ca/articles/${a.slug}"`)
    expect(html).toContain(`<h1>${a.title}</h1>`)
  })

  it('renderArticlesHub lists every article', async () => {
    const articles = await loadArticles(ARTICLES_DIR)
    const html = renderArticlesHub(articles)
    for (const a of articles) expect(html).toContain(`/articles/${a.slug}`)
    expect(html).toContain('"@type":"CollectionPage"')
  })
})
