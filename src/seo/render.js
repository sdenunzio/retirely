// ─────────────────────────────────────────────────────────────────────────────
// Static-HTML renderer for Retirely's SEO landing pages.
//
// Pure string builders (browser-free) → a complete, crawlable HTML document per
// page, including per-page meta, Open Graph, and JSON-LD (BreadcrumbList +
// FAQPage + WebApplication, plus HowTo where present). Imported by the build
// script and exercised by the test suite.
// ─────────────────────────────────────────────────────────────────────────────

import { SITE, PAGE_BY_SLUG, esc } from './content.js'

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

    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link href="https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500;9..40,600;9..40,700&family=DM+Mono:wght@400;500&display=swap" rel="stylesheet" />

    <style>${CSS}</style>
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
  const href = page.ctaTab ? `/?tab=${page.ctaTab}` : '/'
  return `<div class="cta">
    <a class="cta-btn" href="${href}">Open the free calculator →</a>
    <p class="cta-note">${esc('Free · no sign-up · all 10 provinces · couples & Monte Carlo built in.')}</p>
  </div>`
}

// ── Full document ────────────────────────────────────────────────────────────
export function renderPage(page) {
  return `<!doctype html>
<html lang="en-CA">
  <head>
    ${head(page)}
  </head>
  <body>
    <header class="site-header">
      <a class="brand" href="/"><img src="/logo.svg" alt="Retirely" width="120" height="28" /></a>
      <nav class="top-nav" aria-label="Primary">
        <a href="/canadian-retirement-calculator">Calculators</a>
        <a href="/when-to-take-cpp">When to take CPP</a>
        <a href="/rrif-minimum-withdrawal-calculator">RRIF minimums</a>
        <a class="nav-cta" href="/">Launch app</a>
      </nav>
    </header>

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

    <footer class="site-footer">
      <p><strong>Retirely</strong> — free Canadian retirement scenario calculator.
      Illustrative only; not financial, tax or investment advice.</p>
      <nav aria-label="Footer">
        <a href="/">Retirement calculator</a>
        <a href="/speculator">Rental property analyzer</a>
        <a href="/estate">Estate planner</a>
        <a href="/canadian-retirement-calculator">All calculators</a>
      </nav>
      <p class="copy">© 2024–2026 Retirely (retirely.ca). All rights reserved.</p>
    </footer>
  </body>
</html>`
}

// ── Styles ───────────────────────────────────────────────────────────────────
const CSS = `
:root{--navy:#0D1B2A;--ink:#1a2733;--muted:#5b6b7a;--teal:#0f9d8f;--teal-d:#0b7d72;--line:#e3e8ee;--bg:#f7f9fb;--card:#fff}
*{box-sizing:border-box}
html{scroll-behavior:smooth}
body{margin:0;font-family:'DM Sans',system-ui,-apple-system,Segoe UI,Roboto,sans-serif;color:var(--ink);background:var(--bg);line-height:1.65;-webkit-font-smoothing:antialiased}
a{color:var(--teal-d);text-decoration:none}
a:hover{text-decoration:underline}
.site-header{display:flex;align-items:center;justify-content:space-between;gap:1rem;padding:.9rem 1.25rem;background:var(--navy);position:sticky;top:0;z-index:5}
.brand img{display:block;height:28px;width:auto}
.top-nav{display:flex;gap:1.1rem;flex-wrap:wrap;align-items:center}
.top-nav a{color:#cdd8e3;font-size:.92rem;font-weight:500}
.top-nav a:hover{color:#fff;text-decoration:none}
.top-nav .nav-cta{background:var(--teal);color:#fff;padding:.45rem .85rem;border-radius:8px}
.page{max-width:800px;margin:0 auto;padding:1.5rem 1.25rem 3rem}
.crumbs{font-size:.85rem;color:var(--muted);margin:.5rem 0 1.25rem}
.crumbs .sep{margin:0 .45rem;color:#aab6c2}
h1{font-size:2.1rem;line-height:1.15;letter-spacing:-.02em;margin:.2rem 0 .6rem;color:var(--navy)}
h2{font-size:1.4rem;letter-spacing:-.01em;margin:2.2rem 0 .6rem;color:var(--navy)}
h3{font-size:1.08rem;margin:1.2rem 0 .3rem;color:var(--ink)}
.lead{font-size:1.18rem;color:#33424f;margin:.4rem 0 1.4rem}
p{margin:.6rem 0}
ul{padding-left:1.2rem}
li{margin:.3rem 0}
.muted{color:var(--muted);font-size:.9rem}
.tbl{margin:1.1rem 0;overflow-x:auto}
.tbl figcaption{font-size:.85rem;color:var(--muted);margin-bottom:.4rem}
table{border-collapse:collapse;width:100%;font-size:.95rem;background:var(--card);border:1px solid var(--line);border-radius:10px;overflow:hidden}
th,td{padding:.55rem .8rem;text-align:left;border-bottom:1px solid var(--line)}
th{background:#eef3f7;font-weight:600;color:var(--navy)}
tbody tr:last-child td{border-bottom:0}
tbody tr:nth-child(even){background:#fafcfd}
.cta{background:linear-gradient(135deg,#0D1B2A,#132b3f);color:#fff;border-radius:14px;padding:1.4rem;text-align:center;margin:1.6rem 0}
.cta-btn{display:inline-block;background:var(--teal);color:#fff;font-weight:600;font-size:1.05rem;padding:.8rem 1.5rem;border-radius:10px}
.cta-btn:hover{background:#12b3a3;text-decoration:none}
.cta-note{color:#b9c6d2;font-size:.86rem;margin:.7rem 0 0}
.cluster{list-style:none;padding:0;display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:.5rem}
.cluster li{margin:0}
.cluster a{display:block;background:var(--card);border:1px solid var(--line);border-radius:10px;padding:.7rem .9rem;font-weight:500}
.cluster a:hover{border-color:var(--teal);text-decoration:none}
.faq{margin-top:2.4rem}
.faq-item{border-top:1px solid var(--line);padding-top:.4rem;margin-top:1rem}
.faq-item h3{margin-top:.4rem}
.related{margin-top:2.6rem;border-top:1px solid var(--line);padding-top:1rem}
.related-grid{display:flex;flex-wrap:wrap;gap:.5rem}
.related-grid a{background:#eef3f7;border-radius:20px;padding:.4rem .9rem;font-size:.9rem;font-weight:500}
.related-grid a:hover{background:#e0eaf0;text-decoration:none}
.site-footer{background:var(--navy);color:#aab6c2;padding:2rem 1.25rem;text-align:center;font-size:.9rem}
.site-footer strong{color:#fff}
.site-footer nav{display:flex;gap:1rem;justify-content:center;flex-wrap:wrap;margin:.8rem 0}
.site-footer a{color:#cdd8e3}
.site-footer .copy{font-size:.8rem;color:#7c8b99;margin-top:.6rem}
@media(max-width:560px){h1{font-size:1.7rem}.lead{font-size:1.05rem}.site-header{flex-direction:column;align-items:flex-start;gap:.6rem}}
`
