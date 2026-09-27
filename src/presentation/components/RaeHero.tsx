import { Link } from 'react-router-dom'
import { RaeFigure } from './Rae'

// Today's centerpiece: full-body Rae on a Pixel Bloom backdrop. The backdrop
// is CSS only, styled after the light "Exercise Asset Pack v1.0" sheet's
// sky, lavender and blush fields. It is not cropped or redrawn from it. Kept
// short (~180px) so the one-tap "Up next" card stays above the fold on a
// 390x844 phone. Taps through to Meet Rae.
export function RaeHero() {
  return (
    <Link to="/rae" aria-label="Meet Rae" className="rae-hero block">
      <span className="rae-hero__sparkle" style={{ left: '14%', top: '22%' }} aria-hidden />
      <span className="rae-hero__sparkle" style={{ left: '78%', top: '16%', animationDelay: '0.8s' }} aria-hidden />
      <span className="rae-hero__sparkle" style={{ left: '86%', top: '52%', animationDelay: '1.6s' }} aria-hidden />
      <span className="rae-hero__sparkle" style={{ left: '22%', top: '60%', animationDelay: '2.2s' }} aria-hidden />
      <span className="rae-hero__floor" aria-hidden />
      <span className="rae-hero__figure">
        <RaeFigure view="3q" height={160} />
      </span>
    </Link>
  )
}
