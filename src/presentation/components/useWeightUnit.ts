import { useEffect, useState } from 'react'
import { getSetting, setSetting } from '../../infrastructure/db/repositories/settingsRepository'
import type { WeightUnit } from '../units'

const KEY = 'weightUnit'
const DEFAULT: WeightUnit = 'lb'

export function useWeightUnit(): [WeightUnit, (unit: WeightUnit) => void] {
  const [unit, setUnitState] = useState<WeightUnit>(DEFAULT)

  useEffect(() => {
    let cancelled = false
    getSetting<WeightUnit>(KEY).then((stored) => {
      if (!cancelled && stored) setUnitState(stored)
    })
    return () => {
      cancelled = true
    }
  }, [])

  function setUnit(next: WeightUnit) {
    setUnitState(next)
    void setSetting(KEY, next)
  }

  return [unit, setUnit]
}

export async function readWeightUnit(): Promise<WeightUnit> {
  return (await getSetting<WeightUnit>(KEY)) ?? DEFAULT
}
