#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// Local production-faithful static server.
//
// `vite preview` serves dist/ but does NOT apply public/.htaccess, so clean SEO
// URLs (/rrsp-calculator) fall back to the SPA instead of the pre-rendered page.
// This server replicates the .htaccess routing so you can test exactly what
// Hostinger/Apache will serve:
//
//   1) real file on disk?          → serve it (assets, images, *.html, sitemap…)
//   2) "<path>.html" exists?       → serve it (clean-URL SEO page, no redirect)
//   3) otherwise                   → serve /index.html (SPA fallback)
//
// Usage:  npm run build && npm run serve:static
//         PORT is honoured (matches the DevSwarm per-workspace port), else 5000.
// ─────────────────────────────────────────────────────────────────────────────

import { createServer } from 'node:http'
import { readFile, stat } from 'node:fs/promises'
import { join, extname, resolve, normalize, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { existsSync } from 'node:fs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const DIST = resolve(__dirname, '..', 'dist')
const PORT = Number(process.env.PORT) || 5000

if (!existsSync(DIST)) {
  console.error('✗ dist/ not found — run `npm run build` first.')
  process.exit(1)
}

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.ico': 'image/x-icon',
  '.webmanifest': 'application/manifest+json',
  '.xml': 'application/xml',
  '.txt': 'text/plain; charset=utf-8',
  '.woff2': 'font/woff2',
}

const isFile = async (p) => {
  try {
    return (await stat(p)).isFile()
  } catch {
    return false
  }
}

// Keep every resolved path inside dist/ (defence against path traversal).
const safeJoin = (base, path) => {
  const target = normalize(join(base, path))
  return target.startsWith(base) ? target : base
}

const send = async (res, file, code = 200) => {
  const body = await readFile(file)
  res.writeHead(code, { 'content-type': MIME[extname(file)] || 'application/octet-stream' })
  res.end(body)
}

const server = createServer(async (req, res) => {
  const path = decodeURIComponent((req.url || '/').split('?')[0])

  // 1) real file
  const direct = safeJoin(DIST, path)
  if (path !== '/' && (await isFile(direct))) return send(res, direct)

  // 2) clean-URL SEO page → <path>.html
  const asHtml = safeJoin(DIST, path.replace(/\/$/, '') + '.html')
  if (path !== '/' && (await isFile(asHtml))) return send(res, asHtml)

  // 3) SPA fallback
  return send(res, join(DIST, 'index.html'))
})

server.listen(PORT, () => {
  console.log(`\n  Retirely (production-faithful) → http://localhost:${PORT}\n`)
  console.log('  Try:')
  console.log(`    http://localhost:${PORT}/                                    (app)`)
  console.log(`    http://localhost:${PORT}/rrsp-calculator                     (SEO page, clean URL)`)
  console.log(`    http://localhost:${PORT}/ontario/retirement-calculator       (province page)`)
  console.log(`    http://localhost:${PORT}/speculator                          (SPA tool, pre-rendered shell)\n`)
})
