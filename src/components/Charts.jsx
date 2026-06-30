import React, { useState } from 'react'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine, ReferenceArea,
} from 'recharts'
import { fmtM, fmt } from '../lib/engine.js'
import styles from './Charts.module.css'

const DASHES = ['0', '6 3', '3 3', '8 3 3 3']

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div className={styles.tooltip}>
      <div className={styles.tooltipAge}>Age {label}</div>
      {payload.map((p, i) => (
        <div key={i} className={styles.tooltipRow} style={{ color: p.color }}>
          <span>{p.name}</span>
          <span>{Math.abs(p.value) >= 1000 ? '$' + (p.value/1000).toFixed(1) + 'M' : '$' + Math.round(p.value) + 'k'}</span>
        </div>
      ))}
    </div>
  )
}

function buildData(scenarios, retAge, lifeExp) {
  return Array.from({ length: lifeExp - retAge }, (_, i) => {
    const age = retAge + i
    const row = { age }
    for (const s of scenarios) {
      const yr = s.result.yearData.find(d => d.age === age)
      row[s.id + '_bal']    = yr ? Math.round(yr.balance / 1000) : 0
      row[s.id + '_income'] = yr ? Math.round((yr.govIncome + yr.withdrawn) / 1000) : 0
      row[s.id + '_tax']    = yr ? Math.round(yr.tax / 1000) : 0
      row[s.id + '_spend']  = yr ? Math.round(yr.spending / 1000) : 0
    }
    return row
  })
}

// ── Build milestone events from all inputs ────────────────────────────────────
function buildEvents(person, spouse, shared, propertyState) {
  const events = []
  const add = (age, label, icon, color, category) => {
    if (age != null && isFinite(age) && age >= (person.currentAge || 0)) {
      events.push({ age, label, icon, color, category })
    }
  }

  // Primary person
  add(person.retirementAge, 'P1 retires', '🏁', '#1FCFB0', 'retirement')
  add(person.oasStartAge,   `OAS starts${shared.coupleMode ? ' (P1)' : ''}`, '🍁', '#1FCFB0', 'government')
  add(person.retirementAge < 65 ? 65 : null, `CPP eligible${shared.coupleMode ? ' (P1)' : ''}`, '🍁', '#1FCFB0', 'government')

  if (person.oasStartAge >= 75) {
    // OAS 75 boost already baked in — skip separate marker
  } else {
    // Show the 75 boost as a distinct marker
    add(75, `OAS +10%${shared.coupleMode ? ' (P1)' : ''}`, '📈', '#1FCFB0', 'government')
  }
  add(71, `RRIF starts${shared.coupleMode ? ' (P1)' : ''}`, '💰', '#F5A623', 'financial')

  if (person.dbPensionEnabled && person.dbPensionMonthly > 0) {
    add(person.retirementAge, `DB pension${shared.coupleMode ? ' (P1)' : ''} starts`, '🏦', '#1FCFB0', 'pension')
    if (person.dbPensionBridge > 0) {
      add(65, `Bridge benefit ends${shared.coupleMode ? ' (P1)' : ''}`, '🏦', '#F5A623', 'pension')
    }
  }

  // Spouse
  if (shared.coupleMode && spouse) {
    add(spouse.retirementAge, 'P2 retires', '🏁', '#378ADD', 'retirement')
    add(spouse.oasStartAge,   'OAS starts (P2)', '🍁', '#378ADD', 'government')
    add(75,                   'OAS +10% (P2)',    '📈', '#378ADD', 'government')
    add(71,                   'RRIF starts (P2)', '💰', '#F5A623', 'financial')

    if (spouse.dbPensionEnabled && spouse.dbPensionMonthly > 0) {
      add(spouse.retirementAge, 'DB pension (P2) starts', '🏦', '#378ADD', 'pension')
      if (spouse.dbPensionBridge > 0) {
        add(65, 'Bridge benefit ends (P2)', '🏦', '#F5A623', 'pension')
      }
    }
  }

  // Windfall
  if ((shared.windfall ?? 0) > 0) {
    const wAmt = shared.windfall >= 1_000_000 ? '$' + (shared.windfall/1_000_000).toFixed(1) + 'M' : '$' + Math.round(shared.windfall/1000) + 'k'
    add(shared.windfallAge, `Windfall ${wAmt}`, '💎', '#9B59B6', 'financial')
  }

  // Home events
  if (shared.homeEnabled) {
    add(shared.homeDownsizeAge, 'Downsize home', '🏡', '#F5A623', 'property')
  }
  if (shared.primaryHomeEnabled && shared.reverseMortgageEnabled) {
    add(shared.reverseMortgageStartAge, 'Reverse mortgage starts', '🏠', '#F5A623', 'property')
  }

  // Commercial property
  if (propertyState && !propertyState._wizard) {
    if (propertyState.sellEnabled && propertyState.sellAge) {
      add(propertyState.sellAge, 'Property sale', '🏢', '#D85A30', 'property')
    }
  }

  // Life expectancy markers
  add(person.lifeExpectancy, `P1 life exp. (${person.lifeExpectancy})`, '•', 'rgba(255,255,255,.25)', 'lifespan')
  if (shared.coupleMode && spouse) {
    add(spouse.lifeExpectancy, `P2 life exp. (${spouse.lifeExpectancy})`, '•', 'rgba(55,138,221,.4)', 'lifespan')
  }

  // Deduplicate events at the same age — stack labels
  return events.sort((a, b) => a.age - b.age)
}

// ── Reference line label rendered inline ─────────────────────────────────────
function EventLabel({ viewBox, event, index, total, chartHeight }) {
  const { x, y } = viewBox
  const isLifespan = event.category === 'lifespan'

  if (isLifespan) {
    return (
      <g>
        <line x1={x} y1={20} x2={x} y2={chartHeight - 20}
          stroke={event.color} strokeWidth={1} strokeDasharray="4 3" />
      </g>
    )
  }

  // Stagger labels vertically to avoid overlap
  const yPos = 18 + (index % 4) * 22

  return (
    <g>
      <line x1={x} y1={yPos + 14} x2={x} y2={chartHeight - 8}
        stroke={event.color} strokeWidth={1.5} strokeDasharray="3 3" opacity={0.7} />
      <rect x={x - 3} y={yPos - 10} width={9} height={9} rx={2}
        fill={event.color} opacity={0.9} />
      <text x={x + 9} y={yPos - 2}
        fill={event.color} fontSize={9.5} fontWeight={600}
        fontFamily="system-ui, sans-serif">
        {event.label}
      </text>
    </g>
  )
}

// ── Timeline chart ────────────────────────────────────────────────────────────
function TimelineChart({ scenarios, person, spouse, shared, propertyState }) {
  const retAge = person.retirementAge
  const lifeExp = person.lifeExpectancy
  const spouseLifeExp = shared.coupleMode ? (spouse?.lifeExpectancy ?? lifeExp) : lifeExp
  const maxAge = Math.max(lifeExp, spouseLifeExp)
  const data = buildData(scenarios, retAge, maxAge)

  const events = buildEvents(person, spouse, shared, propertyState)
  // Only show events within the chart range
  const visibleEvents = events.filter(e => e.age >= retAge && e.age <= maxAge)

  // Assign stagger index per event (excluding lifespan)
  let labelIdx = 0
  const eventsWithIdx = visibleEvents.map(e => ({
    ...e,
    labelIdx: e.category === 'lifespan' ? -1 : labelIdx++,
  }))

  return (
    <div className={styles.timelineWrap}>
      <ResponsiveContainer width="100%" height={340}>
        <LineChart data={data} margin={{ top: 100, right: 24, bottom: 0, left: 10 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--gray-10)" />
          <XAxis dataKey="age" tick={{ fontSize: 11, fill: 'var(--gray-40)' }} />
          <YAxis tick={{ fontSize: 11, fill: 'var(--gray-40)' }} tickFormatter={v => `${Math.abs(v) >= 1000 ? '$' + (v/1000).toFixed(1) + 'M' : '$' + v + 'k'}`} />
          <Tooltip content={<CustomTooltip />} />

          {/* Shaded retirement zones */}
          <ReferenceArea
            x1={retAge} x2={person.lifeExpectancy}
            fill="rgba(31,207,176,.03)" fillOpacity={1}
          />
          {shared.coupleMode && spouse && spouse.retirementAge !== retAge && (
            <ReferenceArea
              x1={Math.min(retAge, spouse.retirementAge)}
              x2={Math.max(retAge, spouse.retirementAge)}
              fill="rgba(55,138,221,.06)" fillOpacity={1}
            />
          )}

          {/* Event reference lines with custom labels */}
          {eventsWithIdx.map((ev, i) => (
            <ReferenceLine
              key={`${ev.age}-${ev.label}`}
              x={ev.age}
              stroke="transparent"
              label={props => (
                <EventLabel
                  {...props}
                  event={ev}
                  index={ev.labelIdx}
                  total={eventsWithIdx.filter(e => e.category !== 'lifespan').length}
                  chartHeight={340}
                />
              )}
            />
          ))}

          {/* Scenario lines */}
          {scenarios.map((s, i) => (
            <Line key={s.id} type="monotone" dataKey={s.id + '_bal'} name={s.label}
              stroke={s.color} strokeWidth={2} strokeDasharray={DASHES[i]}
              dot={false} activeDot={{ r: 4 }} />
          ))}
        </LineChart>
      </ResponsiveContainer>

      {/* Event legend below chart */}
      <div className={styles.eventLegend}>
        {eventsWithIdx.filter(e => e.category !== 'lifespan').map((ev, i) => (
          <div key={i} className={styles.eventLegendItem}>
            <span className={styles.eventDot} style={{ background: ev.color }} />
            <span className={styles.eventAge}>Age {ev.age}</span>
            <span className={styles.eventName}>{ev.label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

const TABS = [
  { id: 'assets',   label: 'Asset balance' },
  { id: 'income',   label: 'Income vs spending' },
  { id: 'tax',      label: 'Annual tax' },
  { id: 'timeline', label: 'Key events' },
]

export function Charts({ scenarios, shared, person, spouse, propertyState }) {
  const [tab, setTab] = useState('assets')
  const retAge = person.retirementAge
  const lifeExp = person.lifeExpectancy
  const data = buildData(scenarios, retAge, lifeExp)

  return (
    <div className={styles.wrap}>
      <div className={styles.header}>
        <div className={styles.tabs}>
          {TABS.map(t => (
            <button key={t.id} className={`${styles.tab} ${tab === t.id ? styles.active : ''}`}
              onClick={() => setTab(t.id)}>
              {t.label}
            </button>
          ))}
        </div>
        {tab !== 'timeline' && (
          <div className={styles.legend}>
            {scenarios.map((s, i) => (
              <span key={s.id} className={styles.legendItem}>
                <svg width="20" height="4" style={{ flexShrink: 0 }}>
                  <line x1="0" y1="2" x2="20" y2="2" stroke={s.color} strokeWidth="2.5"
                    strokeDasharray={DASHES[i]} />
                </svg>
                {s.label}
              </span>
            ))}
          </div>
        )}
      </div>

      {tab === 'assets' && (
        <ResponsiveContainer width="100%" height={280}>
          <LineChart data={data} margin={{ top: 10, right: 20, bottom: 0, left: 10 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--gray-10)" />
            <XAxis dataKey="age" tick={{ fontSize: 11, fill: 'var(--gray-40)' }} />
            <YAxis tick={{ fontSize: 11, fill: 'var(--gray-40)' }} tickFormatter={v => `${Math.abs(v) >= 1000 ? '$' + (v/1000).toFixed(1) + 'M' : '$' + v + 'k'}`} />
            <Tooltip content={<CustomTooltip />} />
            {scenarios.map((s, i) => (
              <Line key={s.id} type="monotone" dataKey={s.id + '_bal'} name={s.label}
                stroke={s.color} strokeWidth={2} strokeDasharray={DASHES[i]}
                dot={false} activeDot={{ r: 4 }} />
            ))}
          </LineChart>
        </ResponsiveContainer>
      )}

      {tab === 'income' && (
        <ResponsiveContainer width="100%" height={280}>
          <LineChart data={data} margin={{ top: 10, right: 20, bottom: 0, left: 10 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--gray-10)" />
            <XAxis dataKey="age" tick={{ fontSize: 11, fill: 'var(--gray-40)' }} />
            <YAxis tick={{ fontSize: 11, fill: 'var(--gray-40)' }} tickFormatter={v => `${Math.abs(v) >= 1000 ? '$' + (v/1000).toFixed(1) + 'M' : '$' + v + 'k'}`} />
            <Tooltip content={<CustomTooltip />} />
            <Line type="monotone" dataKey={scenarios[0]?.id + '_spend'} name="Spending"
              stroke="var(--gray-40)" strokeWidth={1.5} strokeDasharray="4 2" dot={false} />
            {scenarios.map((s, i) => (
              <Line key={s.id} type="monotone" dataKey={s.id + '_income'} name={s.label}
                stroke={s.color} strokeWidth={2} strokeDasharray={DASHES[i]}
                dot={false} activeDot={{ r: 4 }} />
            ))}
          </LineChart>
        </ResponsiveContainer>
      )}

      {tab === 'tax' && (
        <ResponsiveContainer width="100%" height={280}>
          <LineChart data={data} margin={{ top: 10, right: 20, bottom: 0, left: 10 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--gray-10)" />
            <XAxis dataKey="age" tick={{ fontSize: 11, fill: 'var(--gray-40)' }} />
            <YAxis tick={{ fontSize: 11, fill: 'var(--gray-40)' }} tickFormatter={v => `${Math.abs(v) >= 1000 ? '$' + (v/1000).toFixed(1) + 'M' : '$' + v + 'k'}`} />
            <Tooltip content={<CustomTooltip />} />
            {scenarios.map((s, i) => (
              <Line key={s.id} type="monotone" dataKey={s.id + '_tax'} name={s.label}
                stroke={s.color} strokeWidth={2} strokeDasharray={DASHES[i]}
                dot={false} activeDot={{ r: 4 }} />
            ))}
          </LineChart>
        </ResponsiveContainer>
      )}

      {tab === 'timeline' && (
        <TimelineChart
          scenarios={scenarios}
          person={person}
          spouse={spouse}
          shared={shared}
          propertyState={propertyState}
        />
      )}
    </div>
  )
}
