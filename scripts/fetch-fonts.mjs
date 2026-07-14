#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// One-off: download the DM Sans / DM Mono weights we actually use (latin subset)
// from Google's CDN into public/fonts/, so the site self-hosts its fonts and
// makes ZERO third-party requests at runtime. Re-runnable and idempotent.
//
//   node scripts/fetch-fonts.mjs
//
// After running, the emitted @font-face CSS is already baked into
// src/index.css (SPA) and src/site/brand.js (static pages) — this script only
// needs re-running if the weight set changes or to refresh the woff2 files.
// ─────────────────────────────────────────────────────────────────────────────

import { mkdir, writeFile } from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const FONTS_DIR = resolve(__dirname, '..', 'public', 'fonts')

// Chrome UA so Google serves woff2 (not legacy ttf).
const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36'

// The Google CSS2 requests — one per family. We ask for exactly the weights the
// design uses. DM Sans also needs a light italic (used by the app).
const REQUESTS = [
  {
    family: 'DM Sans',
    fileBase: 'dm-sans',
    url: 'https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700;1,9..40,300&display=swap',
  },
  {
    family: 'DM Mono',
    fileBase: 'dm-mono',
    url: 'https://fonts.googleapis.com/css2?family=DM+Mono:wght@400;500&display=swap',
  },
]

async function fetchText(url) {
  const res = await fetch(url, { headers: { 'User-Agent': UA } })
  if (!res.ok) throw new Error(`GET ${url} → ${res.status}`)
  return res.text()
}

// Pull out the `/* latin */` @font-face blocks and their metadata.
function latinBlocks(css) {
  const out = []
  const re = /\/\*\s*([\w-]+)\s*\*\/\s*@font-face\s*{([^}]*)}/g
  let m
  while ((m = re.exec(css))) {
    const subset = m[1]
    if (subset !== 'latin') continue // latin covers English + French (incl. œ/Œ)
    const body = m[2]
    const weight = (body.match(/font-weight:\s*([^;]+);/) || [])[1]?.trim()
    const style = (body.match(/font-style:\s*([^;]+);/) || [])[1]?.trim()
    const src = (body.match(/url\(([^)]+)\)/) || [])[1]?.trim()
    if (weight && style && src) out.push({ weight, style, src })
  }
  return out
}

async function main() {
  await mkdir(FONTS_DIR, { recursive: true })
  const faces = []

  for (const req of REQUESTS) {
    const css = await fetchText(req.url)
    const blocks = latinBlocks(css)
    if (!blocks.length) throw new Error(`No latin blocks found for ${req.family}`)

    for (const b of blocks) {
      const italic = b.style === 'italic'
      const name = `${req.fileBase}-${b.weight}${italic ? '-italic' : ''}.woff2`
      const bytes = Buffer.from(await (await fetch(b.src, { headers: { 'User-Agent': UA } })).arrayBuffer())
      await writeFile(join(FONTS_DIR, name), bytes)
      console.log(`✓ ${name} (${(bytes.length / 1024).toFixed(1)} KB)`)
      faces.push(
        `@font-face{font-family:'${req.family}';font-style:${b.style};font-weight:${b.weight};` +
          `font-display:swap;src:url(/fonts/${name}) format('woff2')}`,
      )
    }
  }

  console.log('\n─── @font-face CSS (already embedded in src/index.css + brand.js) ───\n')
  console.log(faces.join('\n'))
}

main().catch((err) => {
  console.error('✗ font fetch failed:', err)
  process.exit(1)
})
