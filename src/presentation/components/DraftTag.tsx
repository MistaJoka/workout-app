// Marks a workout built from Rae's moves that the owner hasn't reviewed yet
// (REQ-20260929-006). Remove a template's tag by approving it there.
export function DraftTag() {
  return <span className="ml-2 rounded-full bg-field-notice px-2 py-0.5 align-middle text-xs font-semibold text-ink-muted">Draft</span>
}
