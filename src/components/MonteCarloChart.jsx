import React from 'react'
import {
  ComposedChart, Area, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend,
} from 'recharts'
import { Icon, IconBox } from './Icon.jsx'
import styles from './MonteCarloChart.module.css'

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  const p = payload[0]?.payload
  if (!p) return null
  return (
    <div className={styles.tooltip}>
      <div className={styles.tipAge}>Age {label}</div>
      <div className={styles.tipRow}><span>90th pct</span><span>{Math.abs(p.p90) >= 1000 ? `$${(p.p90/1000).toFixed(1)}M` : `$${p.p90}k`}</span></div>
      <div className={styles.tipRow}><span>75th pct</span><span>{Math.abs(p.p75) >= 1000 ? `$${(p.p75/1000).toFixed(1)}M` : `$${p.p75}k`}</span></div>
      <div className={styles.tipRow} style={{ fontWeight: 600 }}><span>Median</span><span>{Math.abs(p.p50) >= 1000 ? `$${(p.p50/1000).toFixed(1)}M` : `$${p.p50}k`}</span></div>
      <div className={styles.tipRow}><span>25th pct</span><span>{Math.abs(p.p25) >= 1000 ? `$${(p.p25/1000).toFixed(1)}M` : `$${p.p25}k`}</span></div>
      <div className={styles.tipRow}><span>10th pct</span><span>{Math.abs(p.p10) >= 1000 ? `$${(p.p10/1000).toFixed(1)}M` : `$${p.p10}k`}</span></div>
    </div>
  )
}

export function MonteCarloChart({ mcResults, shared, person, onRun, mcRunning }) {
  const { mcStdDev, mcSimCount } = shared

  return (
    <div className={styles.wrap}>
      <div className={styles.header}>
        <div className={styles.titleGroup}>
          <div className={styles.title}>Monte Carlo simulation</div>
          <div className={styles.subtitle}>Randomised return sequences to show range of outcomes</div>
        </div>
        <div className={styles.controls}>
          <label className={styles.controlLabel}>
            Volatility (σ): <strong>{mcStdDev}%</strong>
            <input type="range" min={4} max={20} step={1} value={mcStdDev}
              onChange={e => shared.setMcStdDev?.(Number(e.target.value))}
              className={styles.slider}
            />
          </label>
          <label className={styles.controlLabel}>
            Simulations: <strong>{mcSimCount.toLocaleString()}</strong>
            <select value={mcSimCount}
              onChange={e => shared.setMcSimCount?.(Number(e.target.value))}
              className={styles.select}
            >
              <option value={500}>500</option>
              <option value={1000}>1,000</option>
              <option value={2000}>2,000</option>
            </select>
          </label>
          <button className={styles.runBtn} onClick={onRun} disabled={mcRunning}>
            {mcRunning ? 'Running…' : mcResults ? 'Re-run ↻' : 'Run simulation ↗'}
          </button>
        </div>
      </div>

      {!mcResults && !mcRunning && (
        <div className={styles.emptyState}>
          <IconBox name="montecarlo" size={32} tone="teal" />
          <p>Click <strong>Run simulation</strong> to model {mcSimCount.toLocaleString()} randomised return sequences and see the probability band of outcomes for your best scenario.</p>
        </div>
      )}

      {mcRunning && (
        <div className={styles.emptyState}>
          <div className={styles.spinner} />
          <p>Running {mcSimCount.toLocaleString()} simulations…</p>
        </div>
      )}

      {mcResults && !mcRunning && (
        <>
          {/* Survival rate badge */}
          <div className={styles.survivalRow}>
            <div className={`${styles.survivalBadge} ${mcResults.survivalRate >= 85 ? styles.survGood : mcResults.survivalRate >= 70 ? styles.survWarn : styles.survBad}`}>
              <span className={styles.survRate}>{mcResults.survivalRate}%</span>
              <span className={styles.survLabel}>survival rate</span>
            </div>
            <div className={styles.survExplain}>
              In <strong>{mcResults.survivalRate}%</strong> of {mcResults.simCount.toLocaleString()} simulations,
              the <em>{mcResults.scenarioLabel}</em> scenario survived to your life expectancy of{' '}
              <strong>{person.lifeExpectancy}</strong>. A rate above 85% is generally considered robust.
            </div>
          </div>

          <div className={styles.chartWrap}>
            <ResponsiveContainer width="100%" height={300}>
              <ComposedChart data={mcResults.bands} margin={{ top: 10, right: 20, bottom: 0, left: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--gray-10)" />
                <XAxis dataKey="age" tick={{ fontSize: 11, fill: 'var(--gray-40)' }} />
                <YAxis tick={{ fontSize: 11, fill: 'var(--gray-40)' }} tickFormatter={v => Math.abs(v) >= 1000 ? `$${(v/1000).toFixed(1)}M` : `$${v}k`} />
                <Tooltip content={<CustomTooltip />} />
                {/* Outer band 10–90 */}
                <Area dataKey="p90" name="p90" fill="#DBEAFE" stroke="none" legendType="none" />
                <Area dataKey="p10" name="p10" fill="var(--white)" stroke="none" legendType="none" />
                {/* Inner band 25–75 */}
                <Area dataKey="p75" name="75th pct" fill="#93C5FD" stroke="none" fillOpacity={0.5} legendType="none" />
                <Area dataKey="p25" name="25th pct" fill="var(--white)" stroke="none" legendType="none" />
                {/* Median */}
                <Line dataKey="p50" name="Median" type="monotone"
                  stroke="#1D4ED8" strokeWidth={2.5} dot={false} activeDot={{ r: 4 }} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>

          <div className={styles.legend}>
            <span className={styles.legendItem}><span className={styles.legendBox} style={{ background: '#DBEAFE' }} />10th – 90th percentile</span>
            <span className={styles.legendItem}><span className={styles.legendBox} style={{ background: '#93C5FD' }} />25th – 75th percentile</span>
            <span className={styles.legendItem}>
              <svg width="20" height="4"><line x1="0" y1="2" x2="20" y2="2" stroke="#1D4ED8" strokeWidth="2.5" /></svg>
              Median outcome
            </span>
          </div>

          <p className={styles.note}>
            Returns drawn from a log-normal distribution. σ = {mcStdDev}% annual volatility around your {shared.postReturnRate}% expected return.
            Inflation, CPP, OAS, and RRIF minimums are held constant across simulations.
          </p>
        </>
      )}
    </div>
  )
}
