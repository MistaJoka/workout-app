import { useEffect, useState } from 'react'
import { readSetting, WEIGHT_UNIT, writeSetting } from '../../infrastructure/settingsKeys'
import type { WeightUnit } from '../units'
import { createSettingCache } from './settingCache'

const DEFAULT: WeightUnit = 'lb'

// Shared across every hook instance: one IndexedDB read per page load, and
// screens mounted after that start on the right unit with no lb→kg flash.
const cache = createSettingCache<WeightUnit>(() => readSetting(WEIGHT_UNIT), DEFAULT)

export function useWeightUnit(): [WeightUnit, (unit: WeightUnit) => void] {
  const [unit, setUnitState] = useState<WeightUnit>(() => cache.peek())

  useEffect(() => {
    let cancelled = false
    void cache.resolve().then((resolved) => {
      if (!cancelled) setUnitState(resolved)
    })
    return () => {
      cancelled = true
    }
  }, [])

  function setUnit(next: WeightUnit) {
    cache.set(next)
    setUnitState(next)
    // A failed write keeps the choice for this visit; there is nothing
    // more useful to do for a display preference.
    writeSetting(WEIGHT_UNIT, next).catch(() => undefined)
  }

  return [unit, setUnit]
}

export async function readWeightUnit(): Promise<WeightUnit> {
  return cache.resolve()
}
