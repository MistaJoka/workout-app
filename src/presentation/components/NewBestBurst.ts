// "New best!" after a set that beat the user's own prior best for this
// move: a small toast near where the big reps/seconds number sits. Plain
// DOM appended to <body> (role="status" for one aria-live announcement,
// pointer-events: none so nothing waits for it), same reasoning as
// SetBurst.ts — a counted set can swap the player straight to the rest
// screen, which would unmount a React-owned toast mid-flight. The text
// itself always renders; only its sparkle/motion dresses down under
// reduced/off (CLAUDE.md: a motion setting never removes information).
const DURATION_MS = 1700
const STYLE_ID = 'new-best-burst-style'

export function fireNewBestBurst(label = 'New best!'): void {
  if (typeof document === 'undefined') return
  ensureStyle()
  const root = document.createElement('div')
  root.className = 'new-best-burst new-best-burst--pop'
  root.setAttribute('role', 'status')
  root.dataset.testid = 'new-best-burst'
  const text = document.createElement('span')
  text.className = 'new-best-burst__label'
  text.textContent = label
  root.appendChild(text)
  document.body.appendChild(root)
  window.setTimeout(() => root.remove(), DURATION_MS + 150)
}

function ensureStyle(): void {
  if (document.getElementById(STYLE_ID)) return
  const style = document.createElement('style')
  style.id = STYLE_ID
  style.textContent = `
.new-best-burst {
  position: fixed;
  left: 50%;
  top: 112px;
  transform: translateX(-50%);
  z-index: 60;
  pointer-events: none;
}
.new-best-burst__label {
  display: inline-block;
  padding: 0.5rem 1rem;
  border-radius: 999px;
  background: linear-gradient(135deg, #ffe08a, #ff8fb8, #c9a7ff);
  color: #5a3a1a;
  font-weight: 800;
  font-size: 1rem;
  box-shadow: 0 0 0 2px #f5b942, 0 0 0 4px #fff6d8;
  white-space: nowrap;
}
[data-motion='full'] .new-best-burst--pop .new-best-burst__label {
  animation: new-best-burst-pop ${DURATION_MS}ms cubic-bezier(0.2, 0.9, 0.3, 1.1) both;
}
[data-motion='reduced'] .new-best-burst--pop .new-best-burst__label {
  animation: new-best-burst-fade ${DURATION_MS}ms ease-in-out both;
}
[data-motion='off'] .new-best-burst--pop .new-best-burst__label {
  animation: none;
}
@media (prefers-reduced-motion: reduce) {
  [data-motion='full'] .new-best-burst--pop .new-best-burst__label {
    animation: new-best-burst-fade ${DURATION_MS}ms ease-in-out both;
  }
}
@keyframes new-best-burst-pop {
  0% { transform: scale(0.5) translateY(6px); opacity: 0; }
  14% { transform: scale(1.08) translateY(0); opacity: 1; }
  25% { transform: scale(1) translateY(0); opacity: 1; }
  82% { opacity: 1; }
  100% { opacity: 0; }
}
@keyframes new-best-burst-fade {
  0% { opacity: 0; }
  12% { opacity: 1; }
  82% { opacity: 1; }
  100% { opacity: 0; }
}`
  document.head.appendChild(style)
}
