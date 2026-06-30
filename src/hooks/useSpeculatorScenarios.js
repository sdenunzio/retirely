import { useState, useCallback } from 'react'

const KEY     = 'retirement_lab_speculator_v1'
const MAX     = 6

function describe(properties) {
  return properties.map(p =>
    `${p.name} $${Math.round(p.purchasePrice / 1000)}k`
  ).join(' · ')
}

export function useSpeculatorScenarios() {
  const [scenarios, setScenarios] = useState(() => {
    try { return JSON.parse(localStorage.getItem(KEY) ?? '[]') } catch { return [] }
  })
  const [activeId, setActiveId] = useState(null)

  const persist = (list) => {
    setScenarios(list)
    try { localStorage.setItem(KEY, JSON.stringify(list)) } catch {}
  }

  const saveNew = useCallback((name, properties) => {
    const entry = {
      id: crypto.randomUUID(),
      name: name.trim() || `Comparison ${new Date().toLocaleDateString('en-CA')}`,
      description: describe(properties),
      savedAt: new Date().toISOString(),
      properties,
    }
    const updated = [entry, ...scenarios].slice(0, MAX)
    persist(updated)
    setActiveId(entry.id)
    return entry
  }, [scenarios])

  const updateScenario = useCallback((id, properties) => {
    const updated = scenarios.map(s => s.id !== id ? s : {
      ...s, description: describe(properties),
      updatedAt: new Date().toISOString(), properties,
    })
    persist(updated)
  }, [scenarios])

  const saveScenario = useCallback((name, properties) => {
    if (activeId && scenarios.find(s => s.id === activeId))
      return updateScenario(activeId, properties)
    return saveNew(name, properties)
  }, [activeId, scenarios, saveNew, updateScenario])

  const saveAsNew = useCallback((name, properties) => saveNew(name, properties), [saveNew])

  const loadScenario = useCallback((id, setProperties) => {
    const found = scenarios.find(s => s.id === id)
    if (!found) return false
    setProperties(found.properties)
    setActiveId(id)
    return found
  }, [scenarios])

  const deleteScenario = useCallback((id) => {
    persist(scenarios.filter(s => s.id !== id))
    if (activeId === id) setActiveId(null)
  }, [scenarios, activeId])

  const renameScenario = useCallback((id, name) => {
    persist(scenarios.map(s => s.id === id ? { ...s, name } : s))
  }, [scenarios])

  const clearActive = useCallback(() => setActiveId(null), [])
  const activeScenario = scenarios.find(s => s.id === activeId) ?? null

  return {
    scenarios, activeId, activeScenario,
    saveScenario, saveAsNew, loadScenario,
    deleteScenario, renameScenario, clearActive,
    maxScenarios: MAX,
  }
}
