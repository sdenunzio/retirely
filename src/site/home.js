// ─────────────────────────────────────────────────────────────────────────────
// Home page (marketing) — static, prerendered to dist/index.html.
// Pure string builder; imported by the build script and the test suite.
// ─────────────────────────────────────────────────────────────────────────────

import { SITE, PAGE_BY_SLUG, esc } from '../seo/content.js'
import {
  siteHeader,
  siteFooter,
  brandLockup,
  PAGE_CSS,
  FONT_LINKS,
  APP_URL,
} from './brand.js'

const FEATURES = [
  { ico: '📊', h: 'Every account', p: 'RRSP, TFSA, non-registered and LIRA/LIF, with automatic RRIF conversion at 71.' },
  { ico: '🍁', h: 'CPP, OAS & GIS', p: 'Compare taking CPP at 60, 65 or 70, model OAS clawback, GIS and provincial supplements.' },
  { ico: '🗺️', h: 'All 10 provinces', p: 'Federal + provincial tax brackets so your after-tax income reflects where you live.' },
  { ico: '👫', h: 'Couples & splitting', p: 'Full couple mode with pension income splitting and income equalisation.' },
  { ico: '🎲', h: 'Monte Carlo', p: 'Stress-test your plan against thousands of market scenarios, not a single guess.' },
  { ico: '🔥', h: 'FIRE & more', p: 'FIRE number, rental-property analyzer and estate/probate planner included.' },
]

const STEPS = [
  { h: 'Enter your details', p: 'Age, savings, contributions and when you plan to retire — no sign-up, nothing leaves your browser.' },
  { h: 'Compare strategies', p: 'See standard, early, delayed-CPP and income-splitting plans side by side, with tax and longevity.' },
  { h: 'Refine and decide', p: 'Adjust assumptions, run Monte Carlo, and read the guides to make a confident decision.' },
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

function popularGrid() {
  const cards = POPULAR.map((slug) => {
    const p = PAGE_BY_SLUG[slug]
    if (!p) return ''
    return `<a class="calc-card" href="/${p.slug}">${esc(p.h1)}<span>${esc(p.description.split('.')[0])}.</span></a>`
  }).join('')
  return cards
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
      <h2>Retirement guides &amp; tips</h2>
      <p class="section-sub">Plain-English articles to help you make the big decisions — then run the numbers.</p>
      <div class="card-grid">${articleCards(articles)}</div>
      <p style="text-align:center;margin-top:1.6rem"><a href="/articles">Browse all articles →</a></p>
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
      <div class="hero-inner">
        <div style="display:flex;justify-content:center;margin-bottom:1rem">${brandLockup({ id: 'hero', size: 44, tone: 'dark' })}</div>
        <span class="badge">Free · No sign-up · All 10 provinces</span>
        <h1>Plan your Canadian retirement with confidence</h1>
        <p class="sub">Model RRSP, TFSA, CPP, OAS and pensions side by side, see your after-tax income in every province, and stress-test it with Monte Carlo — all free, all in your browser.</p>
        <div class="hero-cta">
          <a class="btn-primary" href="${APP_URL}">Open the free calculator →</a>
          <a class="btn-ghost" href="/articles">Browse the guides</a>
        </div>
        <p class="trust">No account. No data leaves your device. Illustrative only — not financial advice.</p>
      </div>
    </section>

    <section class="section">
      <h2>One tool for the whole picture</h2>
      <p class="section-sub">Most calculators cover a single account or benefit. Retirely models everything together.</p>
      <div class="grid">
        ${FEATURES.map((f) => `<div class="feature"><div class="ico">${f.ico}</div><h3>${esc(f.h)}</h3><p>${esc(f.p)}</p></div>`).join('')}
      </div>
    </section>

    <section class="section" style="padding-top:1rem">
      <h2>How it works</h2>
      <p class="section-sub">Three steps, about three minutes.</p>
      <div class="steps">
        ${STEPS.map((s, i) => `<div class="step"><div class="n">${i + 1}</div><h3>${esc(s.h)}</h3><p>${esc(s.p)}</p></div>`).join('')}
      </div>
    </section>

    <section class="section" style="padding-top:1rem">
      <h2>Popular calculators</h2>
      <p class="section-sub">Jump straight to the question you’re trying to answer.</p>
      <div class="calc-grid">${popularGrid()}</div>
      <p style="text-align:center;margin-top:1.6rem"><a href="/canadian-retirement-calculator">See all calculators →</a></p>
    </section>

    ${latest}

    <section class="section" style="padding-top:1rem">
      <h2>Frequently asked questions</h2>
      <div style="max-width:720px;margin:0 auto">
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
