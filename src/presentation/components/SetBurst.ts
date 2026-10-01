// A completed set: a short burst of pixel petals and sparkles rising from
// where Complete Set sits. Pure decoration: plain DOM appended to <body>
// (aria-hidden, pointer-events: none, fixed, so nothing shifts and no tap
// waits for it), removed when it ends. Imperative on purpose: the player
// swaps straight to the rest screen after a set, which would unmount a
// React-owned burst mid-flight. Callers only fire it under full motion.
const PETALS = 24
const COLOURS = ['#ec4899', '#f9a8d4', '#fde68a', '#c4b5fd', '#86efac', '#fb7185']
const DURATION_MS = 900
const STYLE_ID = 'set-burst-style'

export function fireSetBurst(): void {
  if (typeof document === 'undefined') return
  ensureStyle()
  const root = document.createElement('div')
  root.className = 'set-burst'
  root.setAttribute('aria-hidden', 'true')
  root.dataset.testid = 'set-burst'
  for (let i = 0; i < PETALS; i++) {
    // An upward fan, with a little deterministic wobble per petal so it
    // doesn't look stamped.
    const angle = -160 + (140 / (PETALS - 1)) * i + ((i * 37) % 11) - 5
    const distance = 130 + ((i * 53) % 110)
    const rad = (angle * Math.PI) / 180
    const size = i % 3 === 0 ? 16 : 10
    const piece = document.createElement('span')
    piece.className = i % 4 === 0 ? 'set-burst__sparkle' : 'set-burst__petal'
    piece.style.setProperty('--dx', `${Math.cos(rad) * distance}px`)
    piece.style.setProperty('--dy', `${Math.sin(rad) * distance}px`)
    piece.style.setProperty('--spin', `${(i % 2 ? 1 : -1) * (90 + i * 20)}deg`)
    piece.style.width = `${size}px`
    piece.style.height = `${size}px`
    piece.style.background = COLOURS[i % COLOURS.length]
    piece.style.animationDelay = `${(i % 5) * 18}ms`
    root.appendChild(piece)
  }
  document.body.appendChild(root)
  window.setTimeout(() => root.remove(), DURATION_MS + 150)
}

function ensureStyle(): void {
  if (document.getElementById(STYLE_ID)) return
  const style = document.createElement('style')
  style.id = STYLE_ID
  style.textContent = `
.set-burst {
  position: fixed;
  left: 50%;
  bottom: 96px;
  width: 0;
  height: 0;
  z-index: 60;
  pointer-events: none;
}
.set-burst__petal,
.set-burst__sparkle {
  position: absolute;
  left: 0;
  top: 0;
  animation: set-burst-fly ${DURATION_MS}ms cubic-bezier(0.2, 0.7, 0.3, 1) both;
}
.set-burst__petal { border-radius: 2px; }
.set-burst__sparkle {
  clip-path: polygon(50% 0, 62% 38%, 100% 50%, 62% 62%, 50% 100%, 38% 62%, 0 50%, 38% 38%);
}
@keyframes set-burst-fly {
  0% { transform: translate(-50%, -50%) scale(0.4) rotate(0); opacity: 0; }
  12% { opacity: 1; }
  70% { opacity: 1; }
  100% {
    transform: translate(calc(-50% + var(--dx)), calc(-50% + var(--dy) + 24px)) scale(1) rotate(var(--spin));
    opacity: 0;
  }
}`
  document.head.appendChild(style)
}
