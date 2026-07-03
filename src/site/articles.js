// ─────────────────────────────────────────────────────────────────────────────
// Articles: load Markdown from content/articles/, and render the Articles hub
// and individual article pages to static, crawlable HTML.
//
//  • loadArticles()  — Node/fs + gray-matter + marked (used by the build script
//                      and the article tests). Returns objects sorted newest-first.
//  • renderArticle() / renderArticlesHub()  — pure string builders.
// ─────────────────────────────────────────────────────────────────────────────

import { readdir, readFile } from 'node:fs/promises'
import { join } from 'node:path'
import matter from 'gray-matter'
import { marked } from 'marked'

import { SITE, PAGE_BY_SLUG, esc } from '../seo/content.js'
import { siteHeader, siteFooter, PAGE_CSS, FONT_LINKS, APP_URL } from './brand.js'

marked.setOptions({ mangle: false, headerIds: false })

const REQUIRED = ['title', 'description', 'date']

function readableDate(iso) {
  // iso = 'YYYY-MM-DD'. Format without relying on Date parsing quirks/timezones.
  const [y, m, d] = iso.split('-').map(Number)
  const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
  return `${months[m - 1]} ${d}, ${y}`
}

/** Parse one Markdown source string into an article object. */
export function parseArticle(slug, source) {
  const { data, content } = matter(source)
  for (const key of REQUIRED) {
    if (!data[key]) throw new Error(`Article "${slug}" is missing required frontmatter: ${key}`)
  }
  // YAML auto-converts an unquoted `2026-06-30` into a Date; normalise back to a
  // stable YYYY-MM-DD string (the Date is UTC midnight, so slicing the ISO is safe).
  const date = data.date instanceof Date ? data.date.toISOString().slice(0, 10) : String(data.date)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    throw new Error(`Article "${slug}" has an invalid date (need YYYY-MM-DD): ${data.date}`)
  }
  const words = content.split(/\s+/).filter(Boolean).length
  return {
    slug,
    title: data.title,
    description: data.description,
    date,
    readableDate: readableDate(date),
    readMinutes: Math.max(1, Math.round(words / 200)),
    tags: data.tags || [],
    related: data.related || [],
    calculator: data.calculator || null, // { slug, label, tab? }
    faqs: data.faqs || [],
    bodyHtml: marked.parse(content),
  }
}

/** Load + parse all articles from a directory, newest first. */
export async function loadArticles(dir) {
  let files = []
  try {
    files = (await readdir(dir)).filter((f) => f.endsWith('.md'))
  } catch {
    return [] // no articles dir yet — fine
  }
  const articles = []
  for (const file of files) {
    const src = await readFile(join(dir, file), 'utf8')
    articles.push(parseArticle(file.replace(/\.md$/, ''), src))
  }
  return articles.sort((a, b) => (a.date < b.date ? 1 : -1))
}

// ── Rendering ────────────────────────────────────────────────────────────────
function docHead({ title, description, canonical, jsonLd }) {
  return `<meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${esc(title)}</title>
    <meta name="description" content="${esc(description)}" />
    <link rel="canonical" href="${canonical}" />
    <meta name="robots" content="index, follow, max-snippet:-1, max-image-preview:large" />
    <meta name="author" content="${SITE.name}" />
    <meta property="og:type" content="article" />
    <meta property="og:site_name" content="${SITE.name}" />
    <meta property="og:url" content="${canonical}" />
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
    <script type="application/ld+json">${JSON.stringify(jsonLd).replace(/<\//g, '<\\/')}</script>`
}

function crumbs(items) {
  const parts = items.map((it, i) =>
    i === items.length - 1
      ? `<span aria-current="page">${esc(it.name)}</span>`
      : `<a href="${it.href}">${esc(it.name)}</a>`,
  )
  return `<nav class="crumbs" aria-label="Breadcrumb">${parts.join('<span class="sep">›</span>')}</nav>`
}

function articleCtaHtml(calc) {
  if (!calc) {
    return `<div class="cta"><a class="cta-btn" href="${APP_URL}">Open the free calculator →</a>
      <p class="cta-note">Free · no sign-up · all 10 provinces.</p></div>`
  }
  const href = calc.tab ? `${APP_URL}?tab=${calc.tab}` : calc.slug ? `/${calc.slug}` : APP_URL
  const label = calc.label || 'Open the calculator'
  return `<div class="cta"><a class="cta-btn" href="${href}">${esc(label)} →</a>
    <p class="cta-note">Free · no sign-up · all 10 provinces.</p></div>`
}

function relatedArticlesHtml(article, bySlug) {
  const links = (article.related || [])
    .map((s) => bySlug[s])
    .filter(Boolean)
    .map((a) => `<a href="/articles/${a.slug}">${esc(a.title)}</a>`)
  // Also link the topic page for the article's calculator, if any.
  if (article.calculator?.slug && PAGE_BY_SLUG[article.calculator.slug]) {
    const p = PAGE_BY_SLUG[article.calculator.slug]
    links.push(`<a href="/${p.slug}">${esc(p.h1)}</a>`)
  }
  if (!links.length) return ''
  return `<nav class="related" aria-label="Related"><h2>Keep reading</h2><div class="related-grid">${links.join('')}</div></nav>`
}

function faqBlock(faqs) {
  if (!faqs?.length) return ''
  const items = faqs.map((f) => `<div class="faq-item"><h3>${esc(f.q)}</h3><p>${esc(f.a)}</p></div>`).join('')
  return `<section class="faq"><h2>Frequently asked questions</h2>${items}</section>`
}

export function renderArticle(article, bySlug = {}) {
  const canonical = `${SITE.domain}/articles/${article.slug}`
  const graph = [
    {
      '@type': 'Article',
      headline: article.title,
      description: article.description,
      datePublished: article.date,
      dateModified: article.date,
      inLanguage: SITE.locale,
      image: SITE.ogImage,
      author: { '@type': 'Organization', name: SITE.name, url: `${SITE.domain}/` },
      publisher: { '@type': 'Organization', name: SITE.name, logo: { '@type': 'ImageObject', url: SITE.logo } },
      mainEntityOfPage: canonical,
    },
    {
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: `${SITE.domain}/` },
        { '@type': 'ListItem', position: 2, name: 'Articles', item: `${SITE.domain}/articles` },
        { '@type': 'ListItem', position: 3, name: article.title, item: canonical },
      ],
    },
  ]
  if (article.faqs?.length) {
    graph.push({
      '@type': 'FAQPage',
      mainEntity: article.faqs.map((f) => ({
        '@type': 'Question',
        name: f.q,
        acceptedAnswer: { '@type': 'Answer', text: f.a },
      })),
    })
  }
  const tags = article.tags.map((t) => `<span class="tag">${esc(t)}</span>`).join(' ')
  return `<!doctype html>
<html lang="en-CA">
  <head>
    ${docHead({ title: `${article.title} | Retirely`, description: article.description, canonical, jsonLd: { '@context': 'https://schema.org', '@graph': graph } })}
  </head>
  <body>
    ${siteHeader('articles')}
    <main class="page">
      ${crumbs([{ name: 'Home', href: '/' }, { name: 'Articles', href: '/articles' }, { name: article.title }])}
      <article class="article">
        <h1>${esc(article.title)}</h1>
        <div class="byline"><span>${esc(article.readableDate)}</span><span class="dot">·</span><span>${article.readMinutes} min read</span>${tags ? `<span class="dot">·</span>${tags}` : ''}</div>
        <div class="article-body">${article.bodyHtml}</div>
        ${articleCtaHtml(article.calculator)}
        ${faqBlock(article.faqs)}
      </article>
      ${relatedArticlesHtml(article, bySlug)}
    </main>
    ${siteFooter()}
  </body>
</html>`
}

export function renderArticlesHub(articles) {
  const canonical = `${SITE.domain}/articles`
  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'CollectionPage',
        name: 'Retirement guides & tips',
        description: 'Plain-English articles on Canadian retirement planning from Retirely.',
        url: canonical,
        inLanguage: SITE.locale,
      },
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Home', item: `${SITE.domain}/` },
          { '@type': 'ListItem', position: 2, name: 'Articles', item: canonical },
        ],
      },
    ],
  }
  const cards = articles
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
  const empty = `<p class="muted">New guides are on the way — in the meantime, jump into the <a href="${APP_URL}">calculator</a>.</p>`
  return `<!doctype html>
<html lang="en-CA">
  <head>
    ${docHead({ title: 'Retirement Guides & Tips (Canada) | Retirely', description: 'Plain-English articles on Canadian retirement planning: CPP timing, RRSP vs TFSA, RRIF minimums, OAS clawback, drawdown order and more.', canonical, jsonLd })}
  </head>
  <body>
    ${siteHeader('articles')}
    <main class="page">
      ${crumbs([{ name: 'Home', href: '/' }, { name: 'Articles' }])}
      <h1>Retirement guides &amp; tips</h1>
      <p class="lead">Plain-English articles to help you make the big Canadian retirement decisions — then run the numbers in the free calculator.</p>
      ${articles.length ? `<div class="card-grid">${cards}</div>` : empty}
    </main>
    ${siteFooter()}
  </body>
</html>`
}
