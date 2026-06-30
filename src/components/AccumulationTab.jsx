import React, { useState } from 'react'
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend, ReferenceLine,
} from 'recharts'
import styles from './AccumulationTab.module.css'

const fmtK  = n => n >= 1_000_000 ? `$${(n/1_000_000).toFixed(1)}M` : `$${Math.round(n/1000)}k`
const fmtC  = n => '$' + Math.round(n).toLocaleString('en-CA')
const fmtPct = (a, b) => b > 0 ? ((a / b - 1) * 100).toFixed(0) + '%' : '—'

const TEAL   = '#1FCFB0'
const BLUE   = '#378ADD'
const TEAL2  = '#0F9E75'
const BLUE2  = '#1D5FA8'
const AMBER  = '#F5A623'
const PURPLE = '#9B59B6'

// Merge P1 and P2 year arrays — P2 may have different length
function mergeYears(accP, accS, person, spouse, coupleMode) {
  const maxYrs = Math.max(accP.length, accS ? accS.length : 0)
  return Array.from({ length: maxYrs }, (_, i) => {
    const p = accP[i]
    const s = accS?.[i]
    const age1 = person.currentAge + i + 1
    const age2 = coupleMode ? spouse.currentAge + i + 1 : null
    return {
      year: i + 1,
      age1, age2,
      // P1 breakdown
      p1Rrsp: p?.rrsp ?? 0,
      p1Tfsa: p?.tfsa ?? 0,
      p1Nr:   p?.nr   ?? 0,
      p1Lif:  p?.lif  ?? 0,
      p1Total: p?.total ?? 0,
      p1Contributed: p?.contributed ?? 0,
      p1Growth: p?.growth ?? 0,
      // P2 breakdown
      p2Rrsp: s?.rrsp ?? 0,
      p2Tfsa: s?.tfsa ?? 0,
      p2Nr:   s?.nr   ?? 0,
      p2Lif:  s?.lif  ?? 0,
      p2Total: s?.total ?? 0,
      p2Contributed: s?.contributed ?? 0,
      p2Growth: s?.growth ?? 0,
      // Household combined
      combined: (p?.total ?? 0) + (s?.total ?? 0),
      combinedContrib: (p?.contributed ?? 0) + (s?.contributed ?? 0),
    }
  })
}

function CustomTooltip({ active, payload, label, coupleMode, rows }) {
  if (!active || !payload?.length) return null
  const row = rows.find(r => r.year === label)
  if (!row) return null
  return (
    <div className={styles.tooltip}>
      <div className={styles.tooltipHead}>
        Year {label} · P1 age {row.age1}{coupleMode ? ` · P2 age ${row.age2}` : ''}
      </div>
      {coupleMode ? (
        <>
          <div className={styles.tooltipSection}>Person 1</div>
          <div className={styles.tooltipRow}><span>RRSP</span><strong>{fmtK(row.p1Rrsp)}</strong></div>
          <div className={styles.tooltipRow}><span>TFSA</span><strong>{fmtK(row.p1Tfsa)}</strong></div>
          {row.p1Nr > 0 && <div className={styles.tooltipRow}><span>Non-reg</span><strong>{fmtK(row.p1Nr)}</strong></div>}
          {row.p1Lif > 0 && <div className={styles.tooltipRow}><span>LIF</span><strong>{fmtK(row.p1Lif)}</strong></div>}
          <div className={`${styles.tooltipRow} ${styles.tooltipTotal}`}><span>P1 Total</span><strong>{fmtK(row.p1Total)}</strong></div>
          <div className={styles.tooltipSection}>Person 2</div>
          <div className={styles.tooltipRow}><span>RRSP</span><strong style={{color:BLUE}}>{fmtK(row.p2Rrsp)}</strong></div>
          <div className={styles.tooltipRow}><span>TFSA</span><strong style={{color:BLUE}}>{fmtK(row.p2Tfsa)}</strong></div>
          {row.p2Nr > 0 && <div className={styles.tooltipRow}><span>Non-reg</span><strong style={{color:BLUE}}>{fmtK(row.p2Nr)}</strong></div>}
          {row.p2Lif > 0 && <div className={styles.tooltipRow}><span>LIF</span><strong style={{color:BLUE}}>{fmtK(row.p2Lif)}</strong></div>}
          <div className={`${styles.tooltipRow} ${styles.tooltipTotal}`}><span>P2 Total</span><strong style={{color:BLUE}}>{fmtK(row.p2Total)}</strong></div>
          <div className={`${styles.tooltipRow} ${styles.tooltipCombined}`}><span>Combined</span><strong>{fmtK(row.combined)}</strong></div>
        </>
      ) : (
        <>
          <div className={styles.tooltipRow}><span>RRSP</span><strong>{fmtK(row.p1Rrsp)}</strong></div>
          <div className={styles.tooltipRow}><span>TFSA</span><strong>{fmtK(row.p1Tfsa)}</strong></div>
          {row.p1Nr > 0 && <div className={styles.tooltipRow}><span>Non-reg</span><strong>{fmtK(row.p1Nr)}</strong></div>}
          {row.p1Lif > 0 && <div className={styles.tooltipRow}><span>LIF</span><strong>{fmtK(row.p1Lif)}</strong></div>}
          <div className={`${styles.tooltipRow} ${styles.tooltipTotal}`}><span>Total</span><strong>{fmtK(row.p1Total)}</strong></div>
          <div className={styles.tooltipRow} style={{marginTop:4}}><span>Contributed</span><span>{fmtK(row.p1Contributed)}</span></div>
          <div className={styles.tooltipRow}><span>Growth</span><span style={{color:TEAL}}>{fmtK(row.p1Growth)}</span></div>
        </>
      )}
    </div>
  )
}

export function AccumulationTab({ results, person, spouse, shared }) {
  const [view, setView] = useState('chart') // 'chart' | 'table'
  const [chartMode, setChartMode] = useState('stacked') // 'stacked' | 'growth'

  if (!results?.accP?.length) {
    return (
      <div className={styles.empty}>
        Calculate your scenarios first to see the accumulation breakdown.
      </div>
    )
  }

  const { accP, accS, projAtRetP, projAtRetS, totalTodayP, totalTodayS } = results
  const coupleMode = shared.coupleMode
  const hasLif = accP.some(y => y.lif > 0) || accS?.some(y => y.lif > 0)

  const rows = mergeYears(accP, accS, person, spouse, coupleMode)
  const finalP = accP[accP.length - 1]
  const finalS = accS?.[accS.length - 1]

  // KPI summary cards
  const totalGrowthP = finalP ? finalP.total - finalP.contributed : 0
  const totalGrowthS = finalS ? finalS.total - finalS.contributed : 0
  const growthPct = finalP?.contributed > 0
    ? ((finalP.total / finalP.contributed - 1) * 100).toFixed(0) : 0

  return (
    <div className={styles.wrap}>

      {/* ── Summary KPIs ── */}
      <div className={styles.kpiRow}>
        <div className={styles.kpi}>
          <div className={styles.kpiLabel}>Today{coupleMode ? ' (P1)' : ''}</div>
          <div className={styles.kpiVal}>{fmtK(totalTodayP)}</div>
          <div className={styles.kpiSub}>Starting balance</div>
        </div>
        <div className={`${styles.kpi} ${styles.kpiAccent}`}>
          <div className={styles.kpiLabel}>At retirement{coupleMode ? ' (P1)' : ''}</div>
          <div className={styles.kpiVal} style={{color: TEAL}}>{fmtK(projAtRetP)}</div>
          <div className={styles.kpiSub}>Age {person.retirementAge} · {accP.length} yrs</div>
        </div>
        <div className={styles.kpi}>
          <div className={styles.kpiLabel}>Growth{coupleMode ? ' (P1)' : ''}</div>
          <div className={styles.kpiVal} style={{color: TEAL}}>{fmtK(totalGrowthP)}</div>
          <div className={styles.kpiSub}>Investment returns</div>
        </div>
        <div className={styles.kpi}>
          <div className={styles.kpiLabel}>Contributions{coupleMode ? ' (P1)' : ''}</div>
          <div className={styles.kpiVal}>{fmtK(finalP?.contributed ?? 0)}</div>
          <div className={styles.kpiSub}>{growthPct}% return on contrib.</div>
        </div>
        {coupleMode && (
          <>
            <div className={`${styles.kpi} ${styles.kpiAccent2}`}>
              <div className={styles.kpiLabel}>At retirement (P2)</div>
              <div className={styles.kpiVal} style={{color: BLUE}}>{fmtK(projAtRetS)}</div>
              <div className={styles.kpiSub}>Age {spouse.retirementAge} · {accS?.length ?? 0} yrs</div>
            </div>
            <div className={`${styles.kpi} ${styles.kpiAccentCombined}`}>
              <div className={styles.kpiLabel}>Combined at retirement</div>
              <div className={styles.kpiVal}>{fmtK(projAtRetP + projAtRetS)}</div>
              <div className={styles.kpiSub}>Household total</div>
            </div>
          </>
        )}
      </div>

      {/* ── View / chart mode toggles ── */}
      <div className={styles.controls}>
        <div className={styles.toggleGroup}>
          <button className={`${styles.toggleBtn} ${view === 'chart' ? styles.toggleBtnOn : ''}`} onClick={() => setView('chart')}>Chart</button>
          <button className={`${styles.toggleBtn} ${view === 'table' ? styles.toggleBtnOn : ''}`} onClick={() => setView('table')}>Table</button>
        </div>
        {view === 'chart' && (
          <div className={styles.toggleGroup}>
            <button className={`${styles.toggleBtn} ${chartMode === 'stacked' ? styles.toggleBtnOn : ''}`} onClick={() => setChartMode('stacked')}>Account breakdown</button>
            <button className={`${styles.toggleBtn} ${chartMode === 'growth' ? styles.toggleBtnOn : ''}`} onClick={() => setChartMode('growth')}>Growth vs. contributions</button>
          </div>
        )}
      </div>

      {/* ── Charts ── */}
      {view === 'chart' && (
        <div className={styles.charts}>

          {/* P1 chart */}
          <div className={styles.chartBlock}>
            <div className={styles.chartTitle}>
              {coupleMode ? 'Person 1' : 'Your portfolio'} — accumulation to retirement
              <span className={styles.chartRetLabel}>Ret. age {person.retirementAge}</span>
            </div>
            <ResponsiveContainer width="100%" height={240}>
              {chartMode === 'stacked' ? (
                <AreaChart data={accP} margin={{top:8,right:8,left:0,bottom:0}}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="year" tick={{fontSize:10,fill:'var(--text-muted)'}} tickFormatter={y => `Y${y}`} interval={Math.floor(accP.length/6)} />
                  <YAxis tickFormatter={fmtK} tick={{fontSize:10,fill:'var(--text-muted)'}} width={52} />
                  <Tooltip content={<CustomTooltip coupleMode={false} rows={rows} />} />
                  <Area type="monotone" dataKey="rrsp" stackId="1" stroke={TEAL}  fill={TEAL}  fillOpacity={0.7} name="RRSP" />
                  <Area type="monotone" dataKey="tfsa" stackId="1" stroke={TEAL2} fill={TEAL2} fillOpacity={0.5} name="TFSA" />
                  <Area type="monotone" dataKey="nr"   stackId="1" stroke={AMBER} fill={AMBER} fillOpacity={0.4} name="Non-reg" />
                  {hasLif && <Area type="monotone" dataKey="lif" stackId="1" stroke={PURPLE} fill={PURPLE} fillOpacity={0.4} name="LIF" />}
                  <Legend iconType="square" wrapperStyle={{fontSize:11}} />
                </AreaChart>
              ) : (
                <BarChart data={accP} margin={{top:8,right:8,left:0,bottom:0}}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="year" tick={{fontSize:10,fill:'var(--text-muted)'}} tickFormatter={y => `Y${y}`} interval={Math.floor(accP.length/6)} />
                  <YAxis tickFormatter={fmtK} tick={{fontSize:10,fill:'var(--text-muted)'}} width={52} />
                  <Tooltip content={<CustomTooltip coupleMode={false} rows={rows} />} />
                  <Bar dataKey="contributed" stackId="a" fill="var(--bg-elevated)" stroke="var(--border)" strokeWidth={1} name="Contributed" />
                  <Bar dataKey="growth" stackId="a" fill={TEAL} fillOpacity={0.85} name="Investment growth" radius={[3,3,0,0]} />
                  <Legend iconType="square" wrapperStyle={{fontSize:11}} />
                </BarChart>
              )}
            </ResponsiveContainer>
          </div>

          {/* P2 chart — only if couple mode */}
          {coupleMode && accS?.length > 0 && (
            <div className={styles.chartBlock}>
              <div className={styles.chartTitle}>
                Person 2 — accumulation to retirement
                <span className={styles.chartRetLabel}>Ret. age {spouse.retirementAge}</span>
              </div>
              <ResponsiveContainer width="100%" height={240}>
                {chartMode === 'stacked' ? (
                  <AreaChart data={accS} margin={{top:8,right:8,left:0,bottom:0}}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                    <XAxis dataKey="year" tick={{fontSize:10,fill:'var(--text-muted)'}} tickFormatter={y => `Y${y}`} interval={Math.floor((accS?.length||1)/6)} />
                    <YAxis tickFormatter={fmtK} tick={{fontSize:10,fill:'var(--text-muted)'}} width={52} />
                    <Tooltip content={<CustomTooltip coupleMode={false} rows={rows.map(r=>({...r,p1Rrsp:r.p2Rrsp,p1Tfsa:r.p2Tfsa,p1Nr:r.p2Nr,p1Lif:r.p2Lif,p1Total:r.p2Total,p1Contributed:r.p2Contributed,p1Growth:r.p2Growth,age1:r.age2}))} />} />
                    <Area type="monotone" dataKey="rrsp" stackId="1" stroke={BLUE}  fill={BLUE}  fillOpacity={0.7} name="RRSP" />
                    <Area type="monotone" dataKey="tfsa" stackId="1" stroke={BLUE2} fill={BLUE2} fillOpacity={0.5} name="TFSA" />
                    <Area type="monotone" dataKey="nr"   stackId="1" stroke={AMBER} fill={AMBER} fillOpacity={0.4} name="Non-reg" />
                    {accS?.some(y=>y.lif>0) && <Area type="monotone" dataKey="lif" stackId="1" stroke={PURPLE} fill={PURPLE} fillOpacity={0.4} name="LIF" />}
                    <Legend iconType="square" wrapperStyle={{fontSize:11}} />
                  </AreaChart>
                ) : (
                  <BarChart data={accS} margin={{top:8,right:8,left:0,bottom:0}}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                    <XAxis dataKey="year" tick={{fontSize:10,fill:'var(--text-muted)'}} tickFormatter={y => `Y${y}`} interval={Math.floor((accS?.length||1)/6)} />
                    <YAxis tickFormatter={fmtK} tick={{fontSize:10,fill:'var(--text-muted)'}} width={52} />
                    <Tooltip content={<CustomTooltip coupleMode={false} rows={rows.map(r=>({...r,p1Rrsp:r.p2Rrsp,p1Tfsa:r.p2Tfsa,p1Nr:r.p2Nr,p1Lif:r.p2Lif,p1Total:r.p2Total,p1Contributed:r.p2Contributed,p1Growth:r.p2Growth,age1:r.age2}))} />} />
                    <Bar dataKey="contributed" stackId="a" fill="var(--bg-elevated)" stroke="var(--border)" strokeWidth={1} name="Contributed" />
                    <Bar dataKey="growth" stackId="a" fill={BLUE} fillOpacity={0.85} name="Investment growth" radius={[3,3,0,0]} />
                    <Legend iconType="square" wrapperStyle={{fontSize:11}} />
                  </BarChart>
                )}
              </ResponsiveContainer>
            </div>
          )}

          {/* Combined chart — only if couple */}
          {coupleMode && (
            <div className={`${styles.chartBlock} ${styles.chartBlockFull}`}>
              <div className={styles.chartTitle}>
                Combined household — accumulation
                <span className={styles.chartRetLabel}>Earliest ret. age {Math.min(person.retirementAge, spouse.retirementAge)}</span>
              </div>
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={rows} margin={{top:8,right:8,left:0,bottom:0}}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="year" tick={{fontSize:10,fill:'var(--text-muted)'}} tickFormatter={y => `Y${y}`} interval={Math.floor(rows.length/6)} />
                  <YAxis tickFormatter={fmtK} tick={{fontSize:10,fill:'var(--text-muted)'}} width={52} />
                  <Tooltip formatter={(v, name) => [fmtK(v), name]} labelFormatter={l => `Year ${l}`} contentStyle={{background:'var(--bg-card)',border:'1px solid var(--border)',borderRadius:8,fontSize:12}} />
                  <Area type="monotone" dataKey="p1Total" stroke={TEAL} fill={TEAL} fillOpacity={0.5} name="Person 1" />
                  <Area type="monotone" dataKey="p2Total" stroke={BLUE} fill={BLUE} fillOpacity={0.4} name="Person 2" />
                  <Legend iconType="square" wrapperStyle={{fontSize:11}} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      )}

      {/* ── Table ── */}
      {view === 'table' && (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th className={styles.th}>Year</th>
                <th className={styles.th}>P1 Age</th>
                {coupleMode && <th className={styles.th}>P2 Age</th>}
                <th className={`${styles.th} ${styles.right}`}>P1 RRSP</th>
                <th className={`${styles.th} ${styles.right}`}>P1 TFSA</th>
                <th className={`${styles.th} ${styles.right}`}>P1 Non-reg</th>
                {hasLif && <th className={`${styles.th} ${styles.right}`}>P1 LIF</th>}
                <th className={`${styles.th} ${styles.right} ${styles.subtotal}`}>P1 Total</th>
                {coupleMode && <>
                  <th className={`${styles.th} ${styles.right}`}>P2 RRSP</th>
                  <th className={`${styles.th} ${styles.right}`}>P2 TFSA</th>
                  <th className={`${styles.th} ${styles.right}`}>P2 Non-reg</th>
                  {accS?.some(y=>y.lif>0) && <th className={`${styles.th} ${styles.right}`}>P2 LIF</th>}
                  <th className={`${styles.th} ${styles.right} ${styles.subtotal}`}>P2 Total</th>
                  <th className={`${styles.th} ${styles.right} ${styles.combined}`}>Combined</th>
                </>}
                <th className={`${styles.th} ${styles.right}`}>P1 Contrib.</th>
                <th className={`${styles.th} ${styles.right}`}>P1 Growth</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={r.year} className={`${styles.tr} ${r.year % 5 === 0 ? styles.trMilestone : ''}`}>
                  <td className={styles.td}>{r.year}</td>
                  <td className={styles.td}>{r.age1}</td>
                  {coupleMode && <td className={styles.td}>{r.age2}</td>}
                  <td className={`${styles.td} ${styles.right}`}>{fmtK(r.p1Rrsp)}</td>
                  <td className={`${styles.td} ${styles.right}`}>{fmtK(r.p1Tfsa)}</td>
                  <td className={`${styles.td} ${styles.right} ${styles.dim}`}>{r.p1Nr > 0 ? fmtK(r.p1Nr) : '—'}</td>
                  {hasLif && <td className={`${styles.td} ${styles.right} ${styles.dim}`}>{r.p1Lif > 0 ? fmtK(r.p1Lif) : '—'}</td>}
                  <td className={`${styles.td} ${styles.right} ${styles.bold} ${styles.teal}`}>{fmtK(r.p1Total)}</td>
                  {coupleMode && <>
                    <td className={`${styles.td} ${styles.right}`}>{fmtK(r.p2Rrsp)}</td>
                    <td className={`${styles.td} ${styles.right}`}>{fmtK(r.p2Tfsa)}</td>
                    <td className={`${styles.td} ${styles.right} ${styles.dim}`}>{r.p2Nr > 0 ? fmtK(r.p2Nr) : '—'}</td>
                    {accS?.some(y=>y.lif>0) && <td className={`${styles.td} ${styles.right} ${styles.dim}`}>{r.p2Lif > 0 ? fmtK(r.p2Lif) : '—'}</td>}
                    <td className={`${styles.td} ${styles.right} ${styles.bold} ${styles.blue}`}>{fmtK(r.p2Total)}</td>
                    <td className={`${styles.td} ${styles.right} ${styles.bold}`}>{fmtK(r.combined)}</td>
                  </>}
                  <td className={`${styles.td} ${styles.right} ${styles.dim}`}>{fmtK(r.p1Contributed)}</td>
                  <td className={`${styles.td} ${styles.right} ${styles.teal}`}>{r.p1Growth > 0 ? fmtK(r.p1Growth) : '—'}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className={styles.footRow}>
                <td className={styles.footLabel} colSpan={coupleMode ? 3 : 2}>Final</td>
                <td className={`${styles.td} ${styles.right} ${styles.bold}`} colSpan={hasLif ? 3 : 2}></td>
                {hasLif && <td className={styles.td}/>}
                <td className={`${styles.td} ${styles.right} ${styles.bold} ${styles.teal}`}>{fmtK(projAtRetP)}</td>
                {coupleMode && <>
                  <td className={`${styles.td} ${styles.right} ${styles.bold}`} colSpan={accS?.some(y=>y.lif>0) ? 3 : 2}></td>
                  {accS?.some(y=>y.lif>0) && <td className={styles.td}/>}
                  <td className={`${styles.td} ${styles.right} ${styles.bold} ${styles.blue}`}>{fmtK(projAtRetS)}</td>
                  <td className={`${styles.td} ${styles.right} ${styles.bold}`}>{fmtK(projAtRetP+projAtRetS)}</td>
                </>}
                <td className={styles.td} colSpan={2}></td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}

      <div className={styles.note}>
        Projections use {shared.preReturnRate}% pre-retirement annual return. Monthly contributions allocated proportionally across account types. LIRA grows at the same rate and converts to LIF at retirement.
      </div>
    </div>
  )
}
