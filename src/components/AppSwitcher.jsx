import React, { useState, useEffect, useRef } from 'react'
import { Link, useLocation } from 'react-router-dom'
import styles from './AppSwitcher.module.css'

const APPS = [
  {
    id: 'retirement',
    path: '/calculator',
    label: 'Retirement Scenarios',
    sub: 'Plan your retirement',
    icon: (
      <svg viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="4" y="26" width="7" height="8" rx="1.5" fill="currentColor" opacity=".35"/>
        <rect x="14.5" y="18" width="7" height="16" rx="1.5" fill="currentColor" opacity=".6"/>
        <rect x="25" y="9" width="7" height="25" rx="1.5" fill="currentColor"/>
        <polyline points="7.5,24 18,16 28.5,7" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        <circle cx="28.5" cy="7" r="2.5" fill="currentColor"/>
      </svg>
    ),
  },
  {
    id: 'speculator',
    path: '/speculator',
    label: 'Property Speculator',
    sub: 'Analyse investments',
    icon: (
      <svg viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M18 4L32 14v18H4V14L18 4z" fill="currentColor" opacity=".2" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>
        <rect x="12" y="20" width="5" height="12" rx="1" fill="currentColor" opacity=".5"/>
        <rect x="19" y="16" width="5" height="16" rx="1" fill="currentColor"/>
        <path d="M18 4L32 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
      </svg>
    ),
  },
  {
    id: 'estate',
    path: '/estate',
    label: 'Estate Planner',
    sub: 'Executor tools & tax impact',
    icon: (
      <svg viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M26 20v-2a4 4 0 0 0-4-4H14a4 4 0 0 0-4 4v2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
        <circle cx="18" cy="11" r="4" stroke="currentColor" strokeWidth="1.5"/>
        <path d="M31 32v-2a4 4 0 0 0-3-3.87" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
        <path d="M24 7.13a4 4 0 0 1 0 7.75" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
        <rect x="4" y="22" width="20" height="10" rx="2" fill="currentColor" opacity=".15" stroke="currentColor" strokeWidth="1.5"/>
        <line x1="9" y1="26" x2="19" y2="26" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
        <line x1="9" y1="29" x2="15" y2="29" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
      </svg>
    ),
  },
]

export function AppSwitcher() {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)
  const location = useLocation()
  const currentPath = location.pathname

  useEffect(() => {
    const handler = e => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  return (
    <div className={styles.wrap} ref={ref}>
      <button
        className={`${styles.trigger} ${open ? styles.triggerOpen : ''}`}
        onClick={() => setOpen(o => !o)}
        title="Switch apps"
        aria-label="App switcher"
      >
        <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
          <rect x="1"  y="1"  width="6" height="6" rx="1.5"/>
          <rect x="9"  y="1"  width="6" height="6" rx="1.5"/>
          <rect x="1"  y="9"  width="6" height="6" rx="1.5"/>
          <rect x="9"  y="9"  width="6" height="6" rx="1.5"/>
        </svg>
        <span className={styles.triggerLabel}>Apps</span>
        <svg className={`${styles.chevron} ${open ? styles.chevronOpen : ''}`} width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
          <polyline points="2,3.5 5,6.5 8,3.5"/>
        </svg>
      </button>

      {open && (
        <div className={styles.dropdown}>
          <div className={styles.dropHeader}>Switch app</div>
          {APPS.map(app => {
            const active = currentPath === app.path || (app.path !== '/' && currentPath.startsWith(app.path))
            return (
              <Link
                key={app.id}
                to={app.path}
                className={`${styles.appItem} ${active ? styles.appItemActive : ''}`}
                onClick={() => setOpen(false)}
              >
                <div className={`${styles.appIcon} ${active ? styles.appIconActive : ''}`}>
                  {app.icon}
                </div>
                <div className={styles.appInfo}>
                  <div className={styles.appLabel}>{app.label}</div>
                  <div className={styles.appSub}>{app.sub}</div>
                </div>
                {active && <div className={styles.activeDot} />}
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
