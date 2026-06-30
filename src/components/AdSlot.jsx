import React, { useEffect, useRef } from 'react'
import styles from './AdSlot.module.css'

/**
 * AdSlot — Google AdSense responsive unit.
 *
 * To activate:
 *  1. Add to index.html <head>:
 *     <script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=YOUR_CLIENT_ID" crossorigin="anonymous"></script>
 *  2. Replace ADSENSE_CLIENT and ADSENSE_SLOT with your values from AdSense dashboard.
 *  3. Set ADS_ENABLED = true — placeholders disappear, live units render.
 */
export const ADSENSE_CLIENT = 'ca-pub-XXXXXXXXXXXXXXXX'  // ← your publisher ID
export const ADSENSE_SLOT   = '0000000000'               // ← your ad slot ID
export const ADS_ENABLED    = false                       // ← flip to true when ready

export function AdSlot({ format = 'auto', label = 'Advertisement' }) {
  const ref = useRef(null)

  useEffect(() => {
    if (!ADS_ENABLED) return
    try {
      ;(window.adsbygoogle = window.adsbygoogle || []).push({})
    } catch { /* AdSense not loaded yet */ }
  }, [])

  // When ads are off: render nothing — no placeholder, no space
  if (!ADS_ENABLED) return null

  return (
    <div className={styles.wrap} aria-label={label}>
      <ins
        ref={ref}
        className="adsbygoogle"
        style={{ display: 'block' }}
        data-ad-client={ADSENSE_CLIENT}
        data-ad-slot={ADSENSE_SLOT}
        data-ad-format={format}
        data-full-width-responsive="true"
      />
    </div>
  )
}

/**
 * RightAdPanel — sticky 300×600 unit for the right rail.
 * Only renders when ADS_ENABLED = true. Takes zero space otherwise.
 */
export function RightAdPanel() {
  const ref = useRef(null)

  useEffect(() => {
    if (!ADS_ENABLED) return
    try {
      ;(window.adsbygoogle = window.adsbygoogle || []).push({})
    } catch { /* ignore */ }
  }, [])

  if (!ADS_ENABLED) return null

  return (
    <aside className={styles.rightPanel} aria-label="Advertisement">
      <div className={styles.rightLabel}>Advertisement</div>
      <ins
        ref={ref}
        className="adsbygoogle"
        style={{ display: 'block', width: 300, height: 600 }}
        data-ad-client={ADSENSE_CLIENT}
        data-ad-slot={ADSENSE_SLOT}
        data-ad-format="auto"
        data-full-width-responsive="false"
      />
    </aside>
  )
}
