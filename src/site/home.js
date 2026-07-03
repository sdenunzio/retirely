// ─────────────────────────────────────────────────────────────────────────────
// Home page (marketing) — static, prerendered to dist/index.html.
// Pure string builder; imported by the build script and the test suite.
// ─────────────────────────────────────────────────────────────────────────────

import { SITE, PAGE_BY_SLUG, esc } from '../seo/content.js'
import {
  siteHeader,
  siteFooter,
  PAGE_CSS,
  FONT_LINKS,
  APP_URL,
} from './brand.js'

// Inline Lucide-style line icons (stroke = currentColor). No emoji anywhere.
const ICON = {
  layers: '<path d="M12 2 2 7l10 5 10-5-10-5Z"/><path d="m2 17 10 5 10-5"/><path d="m2 12 10 5 10-5"/>',
  landmark: '<line x1="3" y1="21" x2="21" y2="21"/><line x1="6" y1="18" x2="6" y2="11"/><line x1="10" y1="18" x2="10" y2="11"/><line x1="14" y1="18" x2="14" y2="11"/><line x1="18" y1="18" x2="18" y2="11"/><polygon points="12 3 20 8 4 8"/>',
  map: '<path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/>',
  users: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
  activity: '<path d="M22 12h-4l-3 8L9 4l-3 8H2"/>',
  flame: '<path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.4-.5-2-1-3-1.1-2.1-.2-4 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.2.4-2.3 1-3a2.5 2.5 0 0 0 2.5 2.5Z"/>',
  check: '<path d="M20 6 9 17l-5-5"/>',
  lock: '<rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>',
  leaf: '<path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z"/><path d="M2 21c0-3 1.85-5.36 5.08-6"/>',
}

function icon(name, size = 22) {
  return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICON[name]}</svg>`
}

const FEATURES = [
  { icon: 'layers', h: 'Every account', p: 'RRSP, TFSA, non-registered and LIRA/LIF, with automatic RRIF conversion at 71.' },
  { icon: 'landmark', h: 'CPP, OAS & GIS', p: 'Compare taking CPP at 60, 65 or 70, model OAS clawback, GIS and provincial supplements.' },
  { icon: 'map', h: 'All 10 provinces', p: 'Federal and provincial tax brackets, so your after-tax income reflects where you live.' },
  { icon: 'users', h: 'Couples & splitting', p: 'Full couple mode with pension income splitting and income equalisation.' },
  { icon: 'activity', h: 'Monte Carlo', p: 'Stress-test your plan against thousands of market paths instead of a single guess.' },
  { icon: 'flame', h: 'FIRE & more', p: 'A FIRE number, rental-property analyzer and estate/probate planner, all included.' },
]

const STEPS = [
  { h: 'Enter your details', p: 'Age, savings, contributions and your target retirement age. No sign-up, nothing leaves your browser.' },
  { h: 'Compare strategies', p: 'See standard, early, delayed-CPP and income-splitting plans side by side, with tax and longevity.' },
  { h: 'Refine and decide', p: 'Adjust assumptions, run Monte Carlo, and read the guides to reach a confident decision.' },
]

const MARKS = [
  { icon: 'check', label: '100% free' },
  { icon: 'lock', label: 'No sign-up, no account' },
  { icon: 'leaf', label: 'All 10 provinces' },
  { icon: 'activity', label: 'Monte Carlo built in' },
]

const POPULAR = [
  'rrsp-calculator',
  'tfsa-calculator',
  'cpp-calculator',
  'rrif-minimum-withdrawal-calculator',
  'oas-clawback-calculator',
  'fire-calculator-canada',
  'when-to-take-cpp',
  'rrsp-vs-tfsa',
]

const HOME_FAQS = [
  {
    q: 'Is Retirely free?',
    a: 'Yes — Retirely is completely free with no sign-up and no account. It runs entirely in your browser and is an illustrative planning tool, not financial advice.',
  },
  {
    q: 'What can the retirement calculator do?',
    a: 'It models RRSP, TFSA, RRIF, CPP, OAS, GIS and defined-benefit pensions together, compares withdrawal strategies, estimates tax in all 10 provinces, supports couples with income splitting, and runs Monte Carlo simulations.',
  },
  {
    q: 'Does my data leave my device?',
    a: 'No. All calculations run client-side and your inputs are saved only in your own browser’s local storage. Nothing is sent to a server.',
  },
]

function metaHead() {
  const title = 'Retirely — Free Canadian Retirement Calculator & Planning Guides'
  const description =
    'Plan your Canadian retirement for free — no sign-up. Model RRSP, TFSA, CPP, OAS and pensions across all 10 provinces, compare strategies, run Monte Carlo, and read plain-English guides.'
  const graph = [
    {
      '@type': 'Organization',
      '@id': `${SITE.domain}/#org`,
      name: SITE.name,
      url: `${SITE.domain}/`,
      logo: SITE.logo,
    },
    {
      '@type': 'WebSite',
      '@id': `${SITE.domain}/#website`,
      url: `${SITE.domain}/`,
      name: SITE.name,
      description,
      inLanguage: SITE.locale,
      publisher: { '@id': `${SITE.domain}/#org` },
    },
    {
      '@type': 'FAQPage',
      mainEntity: HOME_FAQS.map((f) => ({
        '@type': 'Question',
        name: f.q,
        acceptedAnswer: { '@type': 'Answer', text: f.a },
      })),
    },
  ]
  const json = JSON.stringify({ '@context': 'https://schema.org', '@graph': graph }).replace(/<\//g, '<\\/')
  return `<meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${esc(title)}</title>
    <meta name="description" content="${esc(description)}" />
    <link rel="canonical" href="${SITE.domain}/" />
    <meta name="robots" content="index, follow, max-snippet:-1, max-image-preview:large" />
    <meta name="author" content="${SITE.name}" />
    <meta property="og:type" content="website" />
    <meta property="og:site_name" content="${SITE.name}" />
    <meta property="og:url" content="${SITE.domain}/" />
    <meta property="og:title" content="${esc(title)}" />
    <meta property="og:description" content="${esc(description)}" />
    <meta property="og:image" content="${SITE.ogImage}" />
    <meta property="og:locale" content="en_CA" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${esc(title)}" />
    <meta name="twitter:description" content="${esc(description)}" />
    <meta name="twitter:image" content="${SITE.ogImage}" />
    <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
    <link rel="icon" type="image/x-icon" href="/favicon.ico" />
    <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
    <link rel="manifest" href="/site.webmanifest" />
    <meta name="theme-color" content="#0D1B2A" />
    ${FONT_LINKS}
    <style>${PAGE_CSS}</style>
    <script type="application/ld+json">${json}</script>`
}

function popularList() {
  return POPULAR.map((slug) => {
    const p = PAGE_BY_SLUG[slug]
    if (!p) return ''
    return `<a href="/${p.slug}">${esc(p.h1)}<span>${esc(p.description.split('.')[0])}.</span></a>`
  }).join('')
}

function articleCards(articles) {
  return articles
    .slice(0, 3)
    .map((a) => {
      const tag = a.tags?.[0] ? `<span class="tag">${esc(a.tags[0])}</span>` : ''
      return `<a class="art-card" href="/articles/${a.slug}">
        <div class="meta">${esc(a.readableDate)} · ${a.readMinutes} min read</div>
        <h3>${esc(a.title)}</h3>
        <p>${esc(a.description)}</p>
        ${tag}
      </a>`
    })
    .join('')
}

export function renderHome({ articles = [] } = {}) {
  const latest =
    articles.length > 0
      ? `<section class="section">
      <div class="wrap">
        <div class="section-head">
          <h2>Guides &amp; tips</h2>
          <p>Plain-English articles on the big Canadian retirement decisions — then run the numbers.</p>
        </div>
        <div class="card-grid">${articleCards(articles)}</div>
        <p class="more-link"><a href="/articles">Browse all articles →</a></p>
      </div>
    </section>`
      : ''

  return `<!doctype html>
<html lang="en-CA">
  <head>
    ${metaHead()}
  </head>
  <body>
    ${siteHeader('home')}

    <section class="hero">
      <div class="wrap">
        <div class="hero-inner">
          <span class="badge">Free · No sign-up · All 10 provinces</span>
          <h1>Plan your Canadian retirement with confidence</h1>
          <p class="sub">Model RRSP, TFSA, CPP, OAS and pensions side by side, see your after-tax income in every province, and stress-test it with Monte Carlo — all in your browser.</p>
          <div class="hero-cta">
            <a class="btn-primary" href="${APP_URL}">Open the free calculator →</a>
            <a class="btn-ghost" href="/articles">Browse the guides</a>
          </div>
          <p class="trust">No account. No data leaves your device. Illustrative only — not financial advice.</p>
        </div>
      </div>
    </section>

    <div class="marks">
      <div class="wrap">
        <div class="marks-row">
          ${MARKS.map((m) => `<span class="m">${icon(m.icon, 17)}${esc(m.label)}</span>`).join('')}
        </div>
      </div>
    </div>

    <section class="section">
      <div class="wrap">
        <div class="section-head">
          <h2>One tool for the whole picture</h2>
          <p>Accounts, benefits, tax and longevity, modelled together — not one piece at a time.</p>
        </div>
        <div class="features">
          ${FEATURES.map((f) => `<div class="feat"><span class="ico">${icon(f.icon)}</span><div><h3>${esc(f.h)}</h3><p>${esc(f.p)}</p></div></div>`).join('')}
        </div>
      </div>
    </section>

    <section class="section" style="background:#fff;border-block:1px solid var(--line)">
      <div class="wrap">
        <div class="section-head">
          <h2>How it works</h2>
          <p>Three steps, about three minutes.</p>
        </div>
        <div class="flow">
          ${STEPS.map((s, i) => `<div class="stepf"><div class="n">${i + 1}</div><h3>${esc(s.h)}</h3><p>${esc(s.p)}</p></div>`).join('')}
        </div>
      </div>
    </section>

    <section class="section">
      <div class="wrap">
        <div class="section-head">
          <h2>Popular calculators</h2>
          <p>Jump straight to the question you’re trying to answer.</p>
        </div>
        <div class="linklist">${popularList()}</div>
        <p class="more-link"><a href="/canadian-retirement-calculator">See all calculators →</a></p>
      </div>
    </section>

    ${latest}

    <section class="section" style="background:#fff;border-top:1px solid var(--line)">
      <div class="wrap" style="max-width:760px">
        <div class="section-head">
          <h2>Frequently asked questions</h2>
        </div>
        ${HOME_FAQS.map((f) => `<div class="faq-item"><h3>${esc(f.q)}</h3><p>${esc(f.a)}</p></div>`).join('')}
      </div>
    </section>

    <section class="band">
      <h2>Ready to see your retirement?</h2>
      <p>Free, no sign-up, all 10 provinces — couples and Monte Carlo built in.</p>
      <a class="btn-primary" href="${APP_URL}">Open the free calculator →</a>
    </section>

    ${siteFooter()}
  </body>
</html>`
}
