// What Complete says about the goal she's saving for: the gain while it's
// ahead ("340 → 365"), or simply that it's ready once reached (a reached
// goal would otherwise read "1000 → 1000", a gain that isn't one). Pure.
export type GoalGainView = { kind: 'gain'; before: number; after: number } | { kind: 'ready' }

export function goalGainView(before: number, after: number, cost: number): GoalGainView {
  if (before >= cost) return { kind: 'ready' }
  return { kind: 'gain', before, after }
}
