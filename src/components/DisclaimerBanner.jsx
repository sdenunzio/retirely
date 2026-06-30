import React, { useState } from 'react'
import styles from './DisclaimerBanner.module.css'

const LS_KEY = 'retireplan_disclaimer_collapsed'

export function DisclaimerBanner() {
  const [collapsed, setCollapsed] = useState(
    () => localStorage.getItem(LS_KEY) === '1'
  )

  const toggle = () => {
    const next = !collapsed
    setCollapsed(next)
    localStorage.setItem(LS_KEY, next ? '1' : '0')
  }

  return (
    <div className={`${styles.banner} ${collapsed ? styles.collapsed : ''}`}>
      <div className={styles.topRow}>
        <div className={styles.left}>
          <span className={styles.icon}>⚠️</span>
          <strong className={styles.title}>Scenario explorer — not financial advice</strong>
        </div>
        <button className={styles.toggleBtn} onClick={toggle} aria-label={collapsed ? 'Expand disclaimer' : 'Collapse disclaimer'}>
          {collapsed ? 'Show' : 'Hide'} <span className={styles.chevron}>{collapsed ? '▾' : '▴'}</span>
        </button>
      </div>

      {!collapsed && (
        <p className={styles.body}>
          Uses 2024 federal + provincial tax brackets, CRA RRIF minimum withdrawal schedule, and simplified OAS clawback.
          Monte Carlo uses log-normal return distribution. No LIRA/LIF, DB pension, spousal RRSP, or CPP contribution-year modelling.
          All projections are illustrative estimates only.{' '}
          <strong>Consult a qualified CFP or tax professional before making any retirement decisions.</strong>
        </p>
      )}
    </div>
  )
}
