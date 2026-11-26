/**
 * SettingsContext
 *
 * Loads the user's unit preference from the API once on mount.
 * Exposes { unit, setUnit } to the whole app.
 * setUnit persists to the API automatically.
 */

import { createContext, useContext, useEffect, useState } from 'react'
import { settingsApi } from '../api'

const SettingsContext = createContext(null)

export function SettingsProvider({ children }) {
  const [unit, setUnitState] = useState('in')   // default matches DB seed

  // Load from API on mount
  useEffect(() => {
    settingsApi.get()
      .then((s) => setUnitState(s.unit))
      .catch(() => {/* keep default */})
  }, [])

  async function setUnit(newUnit) {
    try {
      const updated = await settingsApi.update(newUnit)
      setUnitState(updated.unit)
    } catch (err) {
      console.error('Failed to save unit preference', err)
    }
  }

  return (
    <SettingsContext.Provider value={{ unit, setUnit }}>
      {children}
    </SettingsContext.Provider>
  )
}

/** Hook: const { unit, setUnit } = useSettings() */
export function useSettings() {
  const ctx = useContext(SettingsContext)
  if (!ctx) throw new Error('useSettings must be used inside <SettingsProvider>')
  return ctx
}

