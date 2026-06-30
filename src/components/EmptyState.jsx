import React from 'react'
import { Icon, IconBox } from './Icon.jsx'
import styles from './EmptyState.module.css'

export function EmptyState({ onCalculate, onOpenInputs }) {
  return (
    <div className={styles.wrap}>
      <IconBox name="scenarios" size={32} tone="teal" />
      <h2 className={styles.title}>Your retirement scenarios</h2>
      <p className={styles.body}>
        Fill in your details to model four Canadian retirement strategies side by side — CPP timing, RRSP/TFSA drawdown, tax, and longevity.
      </p>
      <ul className={styles.list}>
        <li>RRSP, TFSA &amp; non-registered growth to retirement</li>
        <li>CPP, OAS, and GIS benefit modelling</li>
        <li>Asset drawdown with estimated tax</li>
        <li>Longevity analysis to your life expectancy</li>
      </ul>

      {/* Desktop CTA */}
      <button className={`${styles.btn} ${styles.btnDesktop}`} onClick={onCalculate}>
        Run calculation →
      </button>

      {/* Mobile CTA — opens the input panel */}
      {onOpenInputs && (
        <button className={`${styles.btn} ${styles.btnMobile}`} onClick={onOpenInputs}>
          <Icon name="profile" size={15} />
          Enter your details
        </button>
      )}

      <p className={styles.disclaimer}>
        Scenario exploration tool — not financial advice.
      </p>
    </div>
  )
}
