import { describe, it, expect } from 'vitest'
import {
  PAGES,
  PAGE_BY_SLUG,
  SITE,
  sitemapUrls,
  rrifRateTable,
  cppTimingTable,
  provinceBracketTable,
  esc,
} from './content.js'
import { APP_ROUTES } from './content.js'
import { renderPage, buildAppShell } from './render.js'

describe('SEO page data integrity', () => {
  it('has a healthy number of pages (topics + 10 provinces)', () => {
    expect(PAGES.length).toBeGreaterThanOrEqual(18)
  })

  it('every page has the required, non-empty fields', () => {
    for (const p of PAGES) {
      expect(p.slug, 'slug').toBeTruthy()
      expect(p.title, `title for ${p.slug}`).toBeTruthy()
      expect(p.description, `description for ${p.slug}`).toBeTruthy()
      expect(p.h1, `h1 for ${p.slug}`).toBeTruthy()
      expect(p.lead, `lead for ${p.slug}`).toBeTruthy()
      expect(Array.isArray(p.sections) && p.sections.length, `sections for ${p.slug}`).toBeTruthy()
      expect(Array.isArray(p.faqs) && p.faqs.length, `faqs for ${p.slug}`).toBeTruthy()
    }
  })

  it('titles and descriptions stay within sensible SERP lengths', () => {
    for (const p of PAGES) {
      expect(p.title.length, `title length for ${p.slug}`).toBeLessThanOrEqual(75)
      expect(p.description.length, `description length for ${p.slug}`).toBeLessThanOrEqual(180)
      expect(p.description.length, `description too short for ${p.slug}`).toBeGreaterThanOrEqual(70)
    }
  })

  it('slugs are unique', () => {
    const slugs = PAGES.map((p) => p.slug)
    expect(new Set(slugs).size).toBe(slugs.length)
  })

  it('every related link points to a real page', () => {
    for (const p of PAGES) {
      for (const rel of p.related || []) {
        expect(PAGE_BY_SLUG[rel], `${p.slug} → ${rel}`).toBeDefined()
      }
    }
  })

  it('includes all 10 provincial retirement pages', () => {
    const provincePages = PAGES.filter((p) => p.province)
    expect(provincePages.length).toBe(10)
    for (const p of provincePages) {
      expect(p.slug.endsWith('/retirement-calculator')).toBe(true)
      expect(provinceBracketTable(p.province).length).toBeGreaterThan(0)
      // slugs must be clean ASCII (no accents, no empty segments)
      expect(p.slug).toMatch(/^[a-z0-9-]+\/retirement-calculator$/)
    }
  })

  it('transliterates accented province names (Québec → quebec)', () => {
    expect(PAGE_BY_SLUG['quebec/retirement-calculator']).toBeDefined()
    expect(PAGE_BY_SLUG['qu-bec/retirement-calculator']).toBeUndefined()
  })
})

describe('engine-derived tables', () => {
  it('RRIF rate table spans 71→95 with the CRA endpoints', () => {
    const rows = rrifRateTable()
    expect(rows[0]).toEqual({ age: 71, pct: 5.28 })
    expect(rows[rows.length - 1]).toEqual({ age: 95, pct: 20 })
  })

  it('CPP timing reflects the −36% / +42% adjustments', () => {
    const [a60, a65, a70] = cppTimingTable()
    expect(a65.monthly).toBeGreaterThan(a60.monthly)
    expect(a70.monthly).toBeGreaterThan(a65.monthly)
    // −36% at 60, +42% at 70 relative to the 65 baseline
    expect(a60.monthly / a65.monthly).toBeCloseTo(0.64, 2)
    expect(a70.monthly / a65.monthly).toBeCloseTo(1.42, 2)
  })
})

describe('sitemap', () => {
  it('lists app routes + every page, with unique absolute URLs', () => {
    const urls = sitemapUrls()
    const locs = urls.map((u) => u.loc)
    expect(new Set(locs).size).toBe(locs.length)
    expect(locs).toContain(`${SITE.domain}/`)
    expect(locs).toContain(`${SITE.domain}/calculator`)
    expect(locs).toContain(`${SITE.domain}/speculator`)
    expect(locs).toContain(`${SITE.domain}/articles`)
    for (const p of PAGES) {
      expect(locs).toContain(`${SITE.domain}/${p.slug}`)
    }
    for (const u of urls) expect(u.loc.startsWith('https://')).toBe(true)
  })
})

describe('esc', () => {
  it('escapes HTML-significant characters', () => {
    expect(esc('a & b <c> "d"')).toBe('a &amp; b &lt;c&gt; &quot;d&quot;')
  })
})

describe('renderPage', () => {
  const html = renderPage(PAGE_BY_SLUG['rrif-minimum-withdrawal-calculator'])

  it('produces a complete HTML document with the H1 and lead', () => {
    expect(html.startsWith('<!doctype html>')).toBe(true)
    expect(html).toContain('<h1>RRIF Minimum Withdrawal Calculator</h1>')
    expect(html).toContain('lang="en-CA"')
  })

  it('includes canonical, description and OG tags', () => {
    expect(html).toContain('<link rel="canonical" href="https://retirely.ca/rrif-minimum-withdrawal-calculator"')
    expect(html).toContain('property="og:title"')
    expect(html).toContain('name="description"')
  })

  it('emits FAQPage, BreadcrumbList and WebApplication JSON-LD', () => {
    expect(html).toContain('"@type":"FAQPage"')
    expect(html).toContain('"@type":"BreadcrumbList"')
    expect(html).toContain('"@type":"WebApplication"')
  })

  it('never leaks a literal </script> inside the JSON-LD block', () => {
    const ld = html.slice(html.indexOf('application/ld+json'))
    const jsonChunk = ld.slice(0, ld.indexOf('</script>'))
    expect(jsonChunk.includes('</script')).toBe(false)
  })

  it('renders a CTA into the interactive app', () => {
    expect(html).toContain('Open the free calculator')
    expect(html).toContain('href="/calculator?tab=')
  })

  it('renders the RRIF rate table with the 71 factor', () => {
    expect(html).toContain('5.28%')
  })
})

describe('buildAppShell', () => {
  // Minimal stand-in for the built dist/index.html.
  const INDEX = `<!doctype html><html><head>
    <title>Retirely — Free Canadian Retirement Calculator</title>
    <meta name="description" content="home description" />
    <link rel="canonical" href="https://retirely.ca/" />
    <meta property="og:url" content="https://retirely.ca/" />
    <meta property="og:title" content="Retirely" />
  </head><body><div id="root">
    <main style="x"><h1 style="color:#0D1B2A">Free Canadian Retirement Calculator</h1><p>home</p></main>
  </div><script type="module" src="/assets/index-abc123.js"></script></body></html>`

  const speculator = APP_ROUTES.find((r) => r.path === 'speculator')
  const shell = buildAppShell(INDEX, speculator)

  it('rewrites title, description and canonical to the route', () => {
    expect(shell).toContain(`<title>${esc(speculator.title)}</title>`)
    expect(shell).toContain('<link rel="canonical" href="https://retirely.ca/speculator" />')
    expect(shell).toContain('<meta property="og:url" content="https://retirely.ca/speculator" />')
    expect(shell).not.toContain('home description')
  })

  it('keeps the hashed JS bundle so the SPA still boots', () => {
    expect(shell).toContain('/assets/index-abc123.js')
  })

  it('replaces the homepage fallback with route content', () => {
    expect(shell).toContain(speculator.h1)
    expect(shell).not.toContain('<p>home</p>')
  })
})
