export type DayPart = 'morning' | 'afternoon' | 'evening' | 'night'

export function dayPart(date: Date): DayPart {
  const h = date.getHours()
  if (h >= 5 && h < 12) return 'morning'
  if (h >= 12 && h < 17) return 'afternoon'
  if (h >= 17 && h < 21) return 'evening'
  return 'night'
}

// The default profile is named "Me"; "Good morning, Me" reads wrong, so a
// name is only added when someone has set a real one.
export function greeting(date: Date, name?: string): string {
  const part = dayPart(date)
  const base = part === 'night' ? 'Good evening' : `Good ${part}`
  const trimmed = name?.trim()
  return trimmed && trimmed.toLowerCase() !== 'me' ? `${base}, ${trimmed}` : base
}
