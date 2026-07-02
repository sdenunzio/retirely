#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// Post-build SEO generator.
//
// Runs after `vite build`. Writes one pre-rendered, fully-crawlable HTML page
// per search intent into dist/<slug>/index.html (topic + programmatic province
// pages), and regenerates dist/sitemap.xml + dist/robots.txt from the same data.
//
// This is the mechanism that gives crawlers and AI answer engines the complete
// picture without executing JavaScript — the gap that every client-rendered
// competitor in this space leaves open.
// ─────────────────────────────────────────────────────────────────────────────

import { mkdir, writeFile, readFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { PAGES, APP_ROUTES, SITE, sitemapUrls } from '../src/seo/content.js'
import { renderPage, buildAppShell } from '../src/seo/render.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const DIST = resolve(__dirname, '..', 'dist')

if (!existsSync(DIST)) {
  console.error('✗ dist/ not found — run `vite build` before generating SEO pages.')
  process.exit(1)
}

async function writePage(slug, html) {
  // Flat files so clean URLs are served with NO redirect via an .htaccess
  // rewrite ("/rrsp-calculator" → "rrsp-calculator.html"). This avoids the
  // directory-index 301-to-trailing-slash behaviour that would otherwise
  // create a canonical mismatch.
  //   "rrsp-calculator"            → dist/rrsp-calculator.html
  //   "ontario/retirement-…"       → dist/ontario/retirement-….html
  const outFile = join(DIST, `${slug}.html`)
  await mkdir(dirname(outFile), { recursive: true })
  await writeFile(outFile, html, 'utf8')
}

function sitemapXml() {
  const urls = sitemapUrls()
    .map(
      (u) =>
        `  <url>\n    <loc>${u.loc}</loc>\n    <lastmod>${u.lastmod}</lastmod>\n` +
        `    <changefreq>monthly</changefreq>\n    <priority>${u.priority}</priority>\n  </url>`,
    )
    .join('\n')
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`
}

function robotsTxt() {
  return `# Retirely — retirely.ca
User-agent: *
Allow: /
Disallow: /src/
Disallow: /.git/

Sitemap: ${SITE.domain}/sitemap.xml
`
}

async function main() {
  let count = 0
  for (const page of PAGES) {
    await writePage(page.slug, renderPage(page))
    count++
  }

  // Route-specific shells for the interactive SPA tools, derived from the built
  // index.html so they keep the correct hashed bundle references but carry the
  // right canonical / title / crawlable content for their URL.
  const indexHtml = await readFile(join(DIST, 'index.html'), 'utf8')
  for (const route of APP_ROUTES) {
    await writePage(route.path, buildAppShell(indexHtml, route))
    count++
  }

  await writeFile(join(DIST, 'sitemap.xml'), sitemapXml(), 'utf8')
  await writeFile(join(DIST, 'robots.txt'), robotsTxt(), 'utf8')

  console.log(
    `✓ Generated ${count} pages (${PAGES.length} SEO + ${APP_ROUTES.length} app shells) ` +
      `+ sitemap.xml (${sitemapUrls().length} URLs) + robots.txt`,
  )
}

main().catch((err) => {
  console.error('✗ SEO generation failed:', err)
  process.exit(1)
})
