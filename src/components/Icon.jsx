/**
 * Icon — centralised SVG icon set in the teal/navy brand theme.
 * Usage: <Icon name="scenarios" size={20} />
 * All icons are 24×24 viewBox stroked with currentColor by default.
 */
import React from 'react'

const PATHS = {
  // ── Navigation / tabs ──────────────────────────────────────────────
  scenarios: (
    <g strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="14" width="4" height="7" rx="1"/>
      <rect x="10" y="9"  width="4" height="12" rx="1"/>
      <rect x="17" y="4"  width="4" height="17" rx="1"/>
      <path d="M3 7l5-4 5 4 5-5" strokeWidth="1.5" fill="none"/>
      <circle cx="18" cy="3" r="1.5" fill="currentColor" stroke="none"/>
    </g>
  ),
  fire: (
    <path d="M12 2C9 6 6 8.5 6 12a6 6 0 0012 0c0-2-1-3.5-2-5-1 2-2 2.5-2 4a2 2 0 01-4 0c0-3 2-5 2-9z" strokeLinecap="round" strokeLinejoin="round"/>
  ),
  montecarlo: (
    <g strokeLinecap="round">
      <path d="M3 17c2-4 3-1 5-5s2-7 4-7 2 4 4 6 2 5 5 3" fill="none"/>
      <circle cx="19" cy="5" r="1.5" fill="currentColor" stroke="none"/>
      <circle cx="9"  cy="18" r="1.5" fill="currentColor" stroke="none"/>
      <circle cx="14" cy="11" r="1.5" fill="currentColor" stroke="none"/>
    </g>
  ),
  tax: (
    <g strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="2"/>
      <path d="M7 8h10M7 12h6M7 16h8"/>
    </g>
  ),
  workback: (
    <g strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9"/>
      <path d="M12 7v5l3 3"/>
      <path d="M7.5 4.5L5 2M16.5 4.5L19 2"/>
    </g>
  ),
  property: (
    <g strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 21h18M3 9l9-6 9 6M5 21V9M19 21V9"/>
      <rect x="9" y="14" width="6" height="7" rx="1"/>
    </g>
  ),
  residence: (
    <g strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 12L12 3l9 9"/>
      <path d="M5 10v11h14V10"/>
      <rect x="9" y="15" width="6" height="6" rx=".5"/>
    </g>
  ),
  drawdown: (
    <g strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="2"/>
      <path d="M3 9h18M9 9v12"/>
      <path d="M13 13h4M13 17h4"/>
    </g>
  ),
  cards: (
    <g strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="5" width="20" height="14" rx="2"/>
      <path d="M2 10h20"/>
      <path d="M6 15h3M13 15h5"/>
    </g>
  ),
  charts: (
    <g strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 3v18h18"/>
      <path d="M7 16l4-5 4 3 5-6" fill="none"/>
    </g>
  ),
  comparison: (
    <g strokeLinecap="round" strokeLinejoin="round">
      <path d="M8 3H5a2 2 0 00-2 2v14a2 2 0 002 2h3M16 3h3a2 2 0 012 2v14a2 2 0 01-2 2h-3M12 3v18M8 8h-.01M8 12h-.01M8 16h-.01M16 8h-.01M16 12h-.01M16 16h-.01"/>
    </g>
  ),

  // ── Onboarding / wizard ────────────────────────────────────────────
  province: (
    <g strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2a8 8 0 018 8c0 5.5-8 13-8 13S4 15.5 4 10a8 8 0 018-8z"/>
      <circle cx="12" cy="10" r="2.5"/>
    </g>
  ),
  couple: (
    <g strokeLinecap="round" strokeLinejoin="round">
      <circle cx="9" cy="7" r="3"/>
      <circle cx="17" cy="7" r="3"/>
      <path d="M3 21v-1a6 6 0 0112 0v1M13 20a6 6 0 0110 0"/>
    </g>
  ),
  person: (
    <g strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="8" r="4"/>
      <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/>
    </g>
  ),
  ages: (
    <g strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2"/>
      <path d="M3 10h18M8 2v4M16 2v4"/>
      <circle cx="12" cy="15" r="2"/>
    </g>
  ),
  income: (
    <g strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="7" width="20" height="14" rx="2"/>
      <path d="M16 7V5a2 2 0 00-4 0v2M12 12v4M10 14h4"/>
    </g>
  ),
  assets: (
    <g strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="11" width="18" height="11" rx="2"/>
      <path d="M7 11V7a5 5 0 0110 0v4"/>
      <circle cx="12" cy="16" r="1.5" fill="currentColor" stroke="none"/>
    </g>
  ),
  government: (
    <g strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 21h18M3 10l9-7 9 7M5 10v11M19 10v11M9 10v11M15 10v11"/>
    </g>
  ),
  spending: (
    <g strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9"/>
      <path d="M12 7v5l3.5 3.5"/>
      <path d="M16 6l-3.5 2"/>
    </g>
  ),
  windfall: (
    <g strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 18.09l-6.18 2.93L7 14.14 2 9.27l6.91-1.01z"/>
    </g>
  ),
  review: (
    <g strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 12A10 10 0 112 12a10 10 0 0120 0z"/>
      <path d="M8 12l3 3 5-5"/>
    </g>
  ),

  // ── Decisions / toggles ────────────────────────────────────────────
  yes: (
    <g strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9"/>
      <path d="M8 12l3 3 5-5"/>
    </g>
  ),
  no: (
    <g strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9"/>
      <path d="M15 9l-6 6M9 9l6 6"/>
    </g>
  ),
  buying: (
    <g strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/>
      <path d="M3 6h18M16 10a4 4 0 01-8 0"/>
    </g>
  ),
  owned: (
    <g strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 10.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l2.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z"/>
    </g>
  ),
  single: (
    <g strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="8" r="4"/>
      <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/>
    </g>
  ),
  oas65: (
    <g strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2"/>
      <path d="M3 10h18M8 2v4M16 2v4M12 14v4M10 16h4"/>
    </g>
  ),
  oas70: (
    <g strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6z"/>
    </g>
  ),
  downsize: (
    <g strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"/>
      <path d="M9 22V12h6v10M15 7l-3-3-3 3"/>
    </g>
  ),
  skip: (
    <g strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9"/>
      <path d="M9 9l6 6M15 9l-6 6"/>
    </g>
  ),
  guided: (
    <g strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9"/>
      <path d="M12 8v4l3 3"/>
      <path d="M12 3v1M21 12h-1M12 20v1M4 12H3"/>
    </g>
  ),
  advanced: (
    <g strokeLinecap="round" strokeLinejoin="round">
      <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
    </g>
  ),

  // ── Features / sections ────────────────────────────────────────────
  reversemortgage: (
    <g strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"/>
      <path d="M12 22v-8"/>
      <path d="M9 17l3-3 3 3"/>
      <path d="M8 14a4 4 0 018 0"/>
    </g>
  ),
  export: (
    <g strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
      <path d="M7 10l5 5 5-5M12 15V3"/>
    </g>
  ),
  pdf: (
    <g strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
      <path d="M14 2v6h6M9 15h6M9 11h3"/>
    </g>
  ),
  excel: (
    <g strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
      <path d="M14 2v6h6M9 11l6 8M15 11l-6 8"/>
    </g>
  ),
  save: (
    <g strokeLinecap="round" strokeLinejoin="round">
      <path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z"/>
      <path d="M17 21v-8H7v8M7 3v5h8"/>
    </g>
  ),
  load: (
    <g strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v13"/>
    </g>
  ),
  sun: (
    <g strokeLinecap="round">
      <circle cx="12" cy="12" r="4"/>
      <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"/>
    </g>
  ),
  moon: (
    <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" strokeLinecap="round" strokeLinejoin="round"/>
  ),
  profile: (
    <g strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="8" r="4"/>
      <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/>
    </g>
  ),
  reset: (
    <g strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 12a9 9 0 109-9 9 9 0 00-9 9"/>
      <path d="M3 3v6h6"/>
    </g>
  ),
  info: (
    <g strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9"/>
      <path d="M12 8h.01M12 11v5"/>
    </g>
  ),
  close: (
    <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" strokeLinejoin="round"/>
  ),
  menu: (
    <path d="M3 12h18M3 6h18M3 18h18" strokeLinecap="round"/>
  ),
  chevronRight: (
    <path d="M9 18l6-6-6-6" strokeLinecap="round" strokeLinejoin="round"/>
  ),
  chevronLeft: (
    <path d="M15 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round"/>
  ),
  check: (
    <path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round"/>
  ),
  plus: (
    <path d="M12 5v14M5 12h14" strokeLinecap="round"/>
  ),
  help: (
    <g strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9"/>
      <path d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3M12 17h.01"/>
    </g>
  ),
  warning: (
    <g strokeLinecap="round" strokeLinejoin="round">
      <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
      <path d="M12 9v4M12 17h.01"/>
    </g>
  ),
  couple2: (
    <g strokeLinecap="round" strokeLinejoin="round">
      <circle cx="8"  cy="7" r="3"/>
      <circle cx="16" cy="7" r="3"/>
      <path d="M2 20c0-3.3 2.7-6 6-6M16 14c3.3 0 6 2.7 6 6M12 14c1.5 0 2.8.4 4 1"/>
    </g>
  ),
}

export function Icon({ name, size = 20, className = '', color, strokeWidth = 1.75, style }) {
  const paths = PATHS[name]
  if (!paths) {
    // Fallback: generic circle
    console.warn(`Icon "${name}" not found`)
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
        stroke={color || 'currentColor'} strokeWidth={strokeWidth}
        className={className} style={style} aria-hidden="true">
        <circle cx="12" cy="12" r="9"/>
      </svg>
    )
  }
  return (
    <svg
      width={size} height={size} viewBox="0 0 24 24"
      fill="none"
      stroke={color || 'currentColor'}
      strokeWidth={strokeWidth}
      className={className}
      style={style}
      aria-hidden="true"
    >
      {paths}
    </svg>
  )
}

/** IconBox — icon inside a teal/navy themed rounded square, for wizard cards etc. */
export function IconBox({ name, size = 36, tone = 'teal' }) {
  const bg = tone === 'teal'  ? 'rgba(31,207,176,.15)'
           : tone === 'navy'  ? 'rgba(13,27,42,.5)'
           : tone === 'amber' ? 'rgba(245,166,35,.15)'
           : tone === 'red'   ? 'rgba(240,84,84,.15)'
           : 'rgba(255,255,255,.08)'
  const color = tone === 'teal'  ? 'var(--teal)'
              : tone === 'amber' ? 'var(--amber)'
              : tone === 'red'   ? 'var(--danger)'
              : 'rgba(255,255,255,.7)'
  const boxSize = Math.round(size * 1.6)
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      width: boxSize, height: boxSize, borderRadius: 10,
      background: bg, border: `1px solid ${color}30`,
      flexShrink: 0, color,
    }}>
      <Icon name={name} size={size} />
    </span>
  )
}
