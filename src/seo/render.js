// ─────────────────────────────────────────────────────────────────────────────
// Static-HTML renderer for Retirely's SEO landing pages.
//
// Pure string builders (browser-free) → a complete, crawlable HTML document per
// page, including per-page meta, Open Graph, and JSON-LD (BreadcrumbList +
// FAQPage + WebApplication, plus HowTo where present). Imported by the build
// script and exercised by the test suite.
// ─────────────────────────────────────────────────────────────────────────────

import { SITE, PAGE_BY_SLUG, esc } from './content.js'
import { siteHeader, siteFooter, PAGE_CSS, FONT_LINKS, APP_URL } from '../site/brand.js'

const url = (slug) => `${SITE.domain}/${slug}`

// ── App-route shell ──────────────────────────────────────────────────────────
// Given the built dist/index.html, produce a route-specific shell for an
// interactive SPA route: correct <title>, description, canonical and OG, plus a
// crawlable content summary in place of the generic homepage fallback. The same
// hashed JS bundle still boots the app, so the route hydrates normally.
export function buildAppShell(indexHtml, route) {
  const canonical = `${SITE.domain}/${route.path}`
  let html = indexHtml
    .replace(/<title>[\s\S]*?<\/title>/, `<title>${esc(route.title)}</title>`)
    .replace(
      /<meta name="description" content="[\s\S]*?"\s*\/>/,
      `<meta name="description" content="${esc(route.description)}" />`,
    )
    .replace(
      /<link rel="canonical" href="[\s\S]*?"\s*\/>/,
      `<link rel="canonical" href="${canonical}" />`,
    )
    .replace(/<meta property="og:url" content="[\s\S]*?"\s*\/>/, `<meta property="og:url" content="${canonical}" />`)
    .replace(/<meta property="og:title" content="[\s\S]*?"\s*\/>/, `<meta property="og:title" content="${esc(route.title)}" />`)

  // Replace the homepage fallback <main>…</main> with route-specific content.
  const fallback = `<main style="max-width:820px;margin:0 auto;padding:2rem 1.25rem;font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;line-height:1.6;color:#1a2733"><h1 style="color:#0D1B2A">${esc(route.h1)}</h1>${route.hero}<p>Loading the interactive tool…</p></main>`
  html = html.replace(/<main[\s\S]*?<\/main>/, fallback)
  return html
}

// ── <head> ───────────────────────────────────────────────────────────────────
function head(page) {
  const canonical = url(page.slug)
  return `<meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${esc(page.title)}</title>
    <meta name="description" content="${esc(page.description)}" />
    <link rel="canonical" href="${canonical}" />
    <meta name="robots" content="index, follow, max-snippet:-1, max-image-preview:large" />
    <meta name="author" content="${SITE.name}" />

    <meta property="og:type" content="website" />
    <meta property="og:site_name" content="${SITE.name}" />
    <meta property="og:url" content="${canonical}" />
    <meta property="og:title" content="${esc(page.title)}" />
    <meta property="og:description" content="${esc(page.description)}" />
    <meta property="og:image" content="${SITE.ogImage}" />
    <meta property="og:locale" content="en_CA" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${esc(page.title)}" />
    <meta name="twitter:description" content="${esc(page.description)}" />
    <meta name="twitter:image" content="${SITE.ogImage}" />

    <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
    <link rel="icon" type="image/x-icon" href="/favicon.ico" />
    <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
    <link rel="manifest" href="/site.webmanifest" />
    <meta name="theme-color" content="#0D1B2A" />

    ${FONT_LINKS}

    <style>${PAGE_CSS}</style>
    ${schema(page)}`
}

// ── JSON-LD ──────────────────────────────────────────────────────────────────
function breadcrumbItems(page) {
  const items = [{ name: 'Home', item: SITE.appUrl }]
  if (page.province) {
    items.push({ name: 'Canadian Retirement Calculator', item: url('canadian-retirement-calculator') })
  }
  items.push({ name: page.h1, item: url(page.slug) })
  return items.map((it, i) => ({
    '@type': 'ListItem',
    position: i + 1,
    name: it.name,
    item: it.item,
  }))
}

function schema(page) {
  const graph = [
    {
      '@type': 'WebApplication',
      '@id': url(page.slug) + '#app',
      name: page.h1,
      url: url(page.slug),
      description: page.description,
      applicationCategory: 'FinanceApplication',
      operatingSystem: 'Any',
      isAccessibleForFree: true,
      inLanguage: SITE.locale,
      offers: { '@type': 'Offer', price: '0', priceCurrency: 'CAD' },
      publisher: { '@type': 'Organization', name: SITE.name, url: SITE.appUrl, logo: SITE.logo },
    },
    {
      '@type': 'BreadcrumbList',
      itemListElement: breadcrumbItems(page),
    },
  ]
  if (page.faqs?.length) {
    graph.push({
      '@type': 'FAQPage',
      mainEntity: page.faqs.map((f) => ({
        '@type': 'Question',
        name: f.q,
        acceptedAnswer: { '@type': 'Answer', text: f.a },
      })),
    })
  }
  if (page.howTo) {
    graph.push({
      '@type': 'HowTo',
      name: page.howTo.name,
      step: page.howTo.steps.map((s, i) => ({
        '@type': 'HowToStep',
        position: i + 1,
        name: s.name,
        text: s.text,
      })),
    })
  }
  const json = JSON.stringify({ '@context': 'https://schema.org', '@graph': graph })
  // Escape </script to keep the inline JSON-LD well-formed.
  return `<script type="application/ld+json">${json.replace(/<\//g, '<\\/')}</script>`
}

// ── Body sections ────────────────────────────────────────────────────────────
function relatedCluster(page) {
  const links = (page.related || [])
    .map((slug) => PAGE_BY_SLUG[slug])
    .filter(Boolean)
    .map((p) => `<li><a href="/${p.slug}">${esc(p.h1)}</a></li>`)
    .join('')
  return `<ul class="cluster">${links}</ul>`
}

function sectionsHtml(page) {
  return page.sections
    .map((s) => {
      const extra = s.clusterLinks ? relatedCluster(page) : ''
      return `<section><h2>${esc(s.h2)}</h2>${s.html}${extra}</section>`
    })
    .join('\n')
}

function faqHtml(page) {
  if (!page.faqs?.length) return ''
  const items = page.faqs
    .map(
      (f) =>
        `<div class="faq-item"><h3>${esc(f.q)}</h3><p>${esc(f.a)}</p></div>`,
    )
    .join('')
  return `<section class="faq"><h2>Frequently asked questions</h2>${items}</section>`
}

function relatedHtml(page) {
  if (!page.related?.length) return ''
  const links = page.related
    .map((slug) => PAGE_BY_SLUG[slug])
    .filter(Boolean)
    .map((p) => `<a href="/${p.slug}">${esc(p.h1)}</a>`)
    .join('')
  return `<nav class="related" aria-label="Related calculators"><h2>Related calculators</h2><div class="related-grid">${links}</div></nav>`
}

function breadcrumbHtml(page) {
  const items = breadcrumbItems(page)
  const parts = items.map((it, i) =>
    i === items.length - 1
      ? `<span aria-current="page">${esc(it.name)}</span>`
      : `<a href="${it.item.replace(SITE.domain, '') || '/'}">${esc(it.name)}</a>`,
  )
  return `<nav class="crumbs" aria-label="Breadcrumb">${parts.join('<span class="sep">›</span>')}</nav>`
}

function ctaHtml(page) {
  const href = page.ctaTab ? `${APP_URL}?tab=${page.ctaTab}` : APP_URL
  return `<div class="cta">
    <a class="cta-btn" href="${href}">Open the free calculator →</a>
    <p class="cta-note">${esc('Free · no sign-up · all 10 provinces · couples & Monte Carlo built in.')}</p>
  </div>`
}

// ── 404 page ─────────────────────────────────────────────────────────────────
// Served by `ErrorDocument 404 /404.html` with a genuine 404 status. noindex so
// crawlers don't index the error page itself; no canonical (it isn't a real
// destination). On-brand chrome + a few recovery links back into the site.
export function renderNotFound() {
  const links = ['canadian-retirement-calculator', 'rrsp-calculator', 'tfsa-calculator', 'cpp-calculator']
    .map((slug) => PAGE_BY_SLUG[slug])
    .filter(Boolean)
    .map((p) => `<li><a href="/${p.slug}">${esc(p.h1)}</a></li>`)
    .join('')
  return `<!doctype html>
<html lang="en-CA">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Page not found — ${SITE.name}</title>
    <meta name="robots" content="noindex, follow" />
    <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
    <link rel="icon" type="image/x-icon" href="/favicon.ico" />
    <meta name="theme-color" content="#0D1B2A" />
    ${FONT_LINKS}
    <style>${PAGE_CSS}</style>
  </head>
  <body>
    ${siteHeader()}

    <main class="page">
      <h1>Page not found</h1>
      <p class="lead">Sorry — that page doesn't exist or has moved. Try one of these instead:</p>
      <ul class="cluster">
        <li><a href="/">Retirely home</a></li>
        <li><a href="${APP_URL}">Retirement calculator</a></li>
        <li><a href="/articles">Articles &amp; guides</a></li>
        ${links}
      </ul>
    </main>

    ${siteFooter()}
  </body>
</html>`
}

// ── Full document ────────────────────────────────────────────────────────────
export function renderPage(page) {
  return `<!doctype html>
<html lang="en-CA">
  <head>
    ${head(page)}
  </head>
  <body>
    ${siteHeader('calculators')}

    <main class="page">
      ${breadcrumbHtml(page)}
      <article>
        <h1>${esc(page.h1)}</h1>
        <p class="lead">${esc(page.lead)}</p>
        ${ctaHtml(page)}
        ${sectionsHtml(page)}
        ${faqHtml(page)}
      </article>
      ${ctaHtml(page)}
      ${relatedHtml(page)}
    </main>

    ${siteFooter()}
  </body>
</html>`
}
