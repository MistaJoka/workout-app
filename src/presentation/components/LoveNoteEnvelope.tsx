import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useSheetFocus } from './useSheetFocus'
import { useTheme } from '../theme/ThemeContext'
import { effectiveMotion, usePrefersReducedMotion } from './MovementMedia'
import { playCelebration } from '../../application/celebrationSounds'
import { useFeedbackSettings } from './useFeedbackSettings'
import type { LoveNoteRecord } from '../../infrastructure/db/schema'

// The full-screen moment for a love note: a closed envelope that wiggles,
// flaps open, and slides the letter up with floating hearts. Used both the
// first time a note unlocks (Complete's RewardItem) and every reread from
// the notes box -- rereading is never a lesser experience than the first
// open. Close is the only way out; it never auto-dismisses (unlike
// LevelUpMoment) because reading the actual words takes real time.

type Stage = 'closed' | 'opening' | 'open'

function useFullMotion(): { full: boolean; reduced: boolean; off: boolean } {
  const { motion } = useTheme()
  const osReduced = usePrefersReducedMotion()
  const effective = effectiveMotion(motion, osReduced)
  return { full: effective === 'full', reduced: effective === 'reduced', off: effective === 'off' }
}

export function LoveNoteEnvelope({
  note,
  giverName,
  onClose,
}: {
  note: LoveNoteRecord
  giverName: string
  onClose: () => void
}) {
  const { full, reduced, off } = useFullMotion()
  // 'off': the open letter, immediately, no animation step at all.
  // 'reduced': a single fade straight to the open letter -- no wiggle/flap
  // choreography in between.
  // 'full': closed (wiggling) -> opening (flap lifts) -> open (letter
  // slides up, hearts float).
  const [stage, setStage] = useState<Stage>(full ? 'closed' : 'open')
  const [feedback] = useFeedbackSettings()
  const played = useRef(false)
  const overlayRef = useRef<HTMLDivElement>(null)
  useSheetFocus(overlayRef, onClose)

  useEffect(() => {
    if (!full) return
    const toOpening = window.setTimeout(() => setStage('opening'), 900)
    const toOpen = window.setTimeout(() => setStage('open'), 1500)
    return () => {
      window.clearTimeout(toOpening)
      window.clearTimeout(toOpen)
    }
  }, [full])

  useEffect(() => {
    if (played.current) return
    played.current = true
    playCelebration('letter', feedback)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Portaled to <body>: Complete renders this deep inside its rewards
  // card, one of whose sibling slots (RewardItem) is mid-CSS-animation
  // (opacity/transform) when this can first open. An actively animating
  // ancestor creates its own stacking context, which would trap a
  // same-tree `position: fixed` overlay behind LevelUpMoment's z-50
  // regardless of this element's own z-index -- the same trap
  // FilterSheet's bottom sheet portals out of for an unrelated reason
  // (a sticky trigger row). Portaling to body sidesteps it entirely.
  return createPortal(
    <div
      ref={overlayRef}
      role="dialog"
      aria-modal="true"
      aria-label={`A note from ${giverName}`}
      data-testid="love-note-envelope"
      className="fixed inset-0 z-[70] flex flex-col items-center justify-center gap-5 bg-black/60 p-6 text-center"
    >
      <style>{ENVELOPE_STYLE}</style>
      <div className={`relative ${off ? '' : reduced ? 'envelope-reduced-fade' : ''}`}>
        <div className={stage === 'closed' && full ? 'envelope-wiggle' : ''}>
          <EnvelopeArt stage={stage} full={full} />
        </div>
        {stage === 'open' && full && <FloatingHearts />}
      </div>
      {stage === 'open' && (
        <div
          className={`max-w-xs space-y-2 rounded-panel bg-surface p-4 text-ink ${full ? 'envelope-text-in' : ''}`}
          data-testid="love-note-text"
        >
          <p aria-hidden="true" className="text-3xl">
            {note.emoji}
          </p>
          <p className="whitespace-pre-wrap text-lg font-semibold">{note.text}</p>
          <p className="text-sm text-ink-muted">— {giverName}</p>
        </div>
      )}
      <button type="button" className="btn-primary btn-lg w-full max-w-xs" onClick={onClose}>
        Close
      </button>
    </div>,
    document.body
  )
}

// Pixel-art envelope: closed (flap down, heart seal) or open (flap folded
// back, the letter tucked inside sliding up as it opens).
function EnvelopeArt({ stage, full }: { stage: Stage; full: boolean }) {
  const open = stage === 'open'
  const flapClass = full ? (stage === 'opening' ? 'envelope-flap-lift' : stage === 'open' ? 'envelope-flap-settled' : '') : ''
  return (
    <svg aria-hidden="true" viewBox="0 0 32 24" width="150" height="112" shapeRendering="crispEdges">
      {/* body */}
      <rect x="2" y="6" width="28" height="16" fill="#fff4e6" />
      <rect x="2" y="6" width="28" height="2" fill="#f7deb8" />
      <rect x="2" y="20" width="28" height="2" fill="#e8b98a" />
      <rect x="2" y="6" width="2" height="16" fill="#e8b98a" />
      <rect x="28" y="6" width="2" height="16" fill="#e8b98a" />
      {/* open flap, folded back behind the letter */}
      {open && <polygon points="2,6 30,6 16,-6" fill="#ffb8d9" className={flapClass} />}
      {/* the letter, only once the flap is open */}
      {open && (
        <g className={full ? 'envelope-letter-slide' : ''}>
          <rect x="8" y="1" width="16" height="17" fill="#fffaf5" />
          <rect x="8" y="1" width="16" height="2" fill="#ffe3ef" />
          <rect x="11" y="7" width="10" height="1.5" fill="#e3c6d6" />
          <rect x="11" y="10" width="10" height="1.5" fill="#e3c6d6" />
          <rect x="11" y="13" width="7" height="1.5" fill="#e3c6d6" />
        </g>
      )}
      {/* closed flap, covering the opening */}
      {!open && <polygon points="2,6 30,6 16,17" fill="#ffb8d9" className={flapClass} />}
      {!open && (
        <g aria-hidden="true">
          <rect x="14" y="10" width="1.5" height="1.5" fill="#e8749f" />
          <rect x="16.5" y="10" width="1.5" height="1.5" fill="#e8749f" />
          <rect x="13" y="11.5" width="6" height="1.5" fill="#e8749f" />
          <rect x="14" y="13" width="4" height="1.5" fill="#e8749f" />
          <rect x="15" y="14.5" width="2" height="1" fill="#e8749f" />
        </g>
      )}
    </svg>
  )
}

const HEART_BITS = ['💕', '💖', '💗', '💝'] as const

// A few hearts drifting up from the open envelope -- decorative only (the
// letter's text is the real information), full motion only.
function FloatingHearts() {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-visible">
      {HEART_BITS.map((bit, i) => (
        <span key={i} className="envelope-heart-float" style={{ left: `${18 + i * 22}%`, animationDelay: `${i * 180}ms` }}>
          {bit}
        </span>
      ))}
    </div>
  )
}

const ENVELOPE_STYLE = `
.envelope-wiggle { animation: envelope-wiggle 1400ms ease-in-out infinite; }
@keyframes envelope-wiggle {
  0%, 100% { transform: rotate(0deg); }
  25% { transform: rotate(-4deg); }
  75% { transform: rotate(4deg); }
}
.envelope-flap-lift { animation: envelope-flap-lift 480ms ease-out both; transform-origin: 50% 6px; }
.envelope-flap-settled { transform-origin: 50% 6px; }
@keyframes envelope-flap-lift {
  from { opacity: 0; transform: scaleY(0.5); }
  to { opacity: 1; transform: none; }
}
.envelope-letter-slide { animation: envelope-letter-slide 460ms 140ms cubic-bezier(.2,.9,.3,1.1) both; }
@keyframes envelope-letter-slide {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: none; }
}
.envelope-text-in { animation: envelope-text-in 420ms ease-out both; }
@keyframes envelope-text-in {
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: none; }
}
.envelope-reduced-fade { animation: envelope-reduced-fade 400ms ease-out both; }
@keyframes envelope-reduced-fade {
  from { opacity: 0; }
  to { opacity: 1; }
}
.envelope-heart-float {
  position: absolute;
  bottom: 8%;
  font-size: 1.1rem;
  animation: envelope-heart-rise 1600ms ease-out both;
}
@keyframes envelope-heart-rise {
  0% { opacity: 0; transform: translateY(0); }
  25% { opacity: 1; }
  100% { opacity: 0; transform: translateY(-70px); }
}
`
