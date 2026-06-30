import React from 'react'
import { fmt, fmtM } from '../lib/engine.js'
import { Icon } from './Icon.jsx'
import styles from './ComparisonTable.module.css'

export function ComparisonTable({ scenarios, shared, person, results }) {
  const lifeExp = person.lifeExpectancy

  return (
    <div className={styles.wrap}>
      <div className={styles.tableHead}>
        Scenario comparison
        {shared.coupleMode && (
          <span className={styles.coupleTag}><Icon name="couple" size={12} style={{marginRight:4}}/>Couple — income splitting applied</span>
        )}
      </div>
      <div className={styles.scroll}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Scenario</th>
              <th>Monthly income</th>
              <th>Start pool</th>
              <th>Assets @ 85</th>
              <th>Est. tax paid</th>
              {shared.coupleMode && <th>Split saving</th>}
              <th>Estate</th>
              <th>Longevity</th>
            </tr>
          </thead>
          <tbody>
            {scenarios.map(s => {
              const r = s.result
              const survived = !r.depletedAge
              return (
                <tr key={s.id}>
                  <td>
                    <div className={styles.scenName}>
                      <span className={styles.dot} style={{ background: s.color }} />
                      {s.label}
                    </div>
                  </td>
                  <td className={styles.mono}>{fmt(r.firstYearIncome / 12)}/mo</td>
                  <td className={styles.mono}>{fmtM(r.projAtRet)}</td>
                  <td className={`${styles.mono} ${r.age85Assets > 0 ? styles.good : styles.bad}`}>
                    {r.age85Assets != null ? fmtM(r.age85Assets) : '—'}
                  </td>
                  <td className={styles.mono}>{fmtM(r.totalTax)}</td>
                  {shared.coupleMode && (
                    <td className={`${styles.mono} ${r.incomeSplitSaving > 500 ? styles.good : ''}`}>
                      {r.incomeSplitSaving > 500 ? fmtM(r.incomeSplitSaving) : '—'}
                    </td>
                  )}
                  <td className={styles.mono}>{fmtM(r.estateValue + (results?.primaryHomeEquity || 0))}</td>
                  <td className={survived ? styles.good : styles.bad}>
                    {survived ? `✓ To ${lifeExp}` : `✗ Age ${r.depletedAge}`}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
