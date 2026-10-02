export type WeightUnit = 'kg' | 'lb'

const LB_PER_KG = 2.2046226218

export function kgToUnit(kg: number, unit: WeightUnit): number {
  return unit === 'kg' ? kg : kg * LB_PER_KG
}

export function unitToKg(value: number, unit: WeightUnit): number {
  return unit === 'kg' ? value : value / LB_PER_KG
}

// Display step: 2.5 kg or 5 lb — the smallest change a typical home rack
// can make, and what the progression policy uses in kg.
export function stepInUnit(unit: WeightUnit): number {
  return unit === 'kg' ? 2.5 : 5
}

// Round to the unit's plate step so lb displays don't show 88.2 for 40 kg.
export function roundToStep(value: number, unit: WeightUnit): number {
  const step = stepInUnit(unit)
  return Math.round(value / step) * step
}

export function formatWeight(kg: number, unit: WeightUnit): string {
  const value = kgToUnit(kg, unit)
  const rounded = Math.round(value * 10) / 10
  return `${Number.isInteger(rounded) ? rounded : rounded.toFixed(1)} ${unit}`
}

// Onboarding's starting pick for the weight unit, before anyone has chosen
// one: en-US reads pounds, everywhere else reads metric. Only the initial
// suggestion -- the person can still change it on the same screen, and the
// stored setting (not this) governs every display after that.
export function defaultWeightUnitForLocale(locale: string | undefined): WeightUnit {
  return locale === 'en-US' ? 'lb' : 'kg'
}
