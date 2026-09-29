import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { guardNavigation } from '../components/unsavedGuard'

export function AppShell() {
  return (
    <div className="min-h-screen bg-bg text-ink flex flex-col">
      <main className="flex-1 pb-20">
        <Outlet />
      </main>
      {/* Fixed height so screens with their own bottom CTA can sit at bottom-16. */}
      {/* Order is right-thumb reach, hardest to easiest, not visit frequency:
          Settings (rarest) sits leftmost, Today (most-used) sits rightmost,
          the easiest slot for a right-handed one-handed grip. */}
      <nav
        className="fixed bottom-0 left-0 right-0 z-10 flex h-16 border-t-2 border-edge bg-surface"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        <NavItem to="/settings" label="Settings" icon={<SettingsIcon />} />
        <NavItem to="/progress" label="Progress" icon={<ProgressIcon />} />
        <NavItem to="/library" label="Library" icon={<LibraryIcon />} />
        <NavItem to="/" label="Today" end icon={<TodayIcon />} />
      </nav>
    </div>
  )
}

function NavItem({ to, label, end, icon }: { to: string; label: string; end?: boolean; icon: React.ReactNode }) {
  const navigate = useNavigate()
  return (
    <NavLink
      to={to}
      end={end}
      // A screen with unsaved edits (the routine builder) gets to ask first.
      onClick={(e) => {
        e.preventDefault()
        guardNavigation(() => navigate(to))
      }}
      className={({ isActive }) =>
        `flex flex-1 flex-col items-center justify-center gap-0.5 text-xs font-bold ${
          isActive ? 'text-primary-ink' : 'text-ink-muted'
        }`
      }
    >
      {({ isActive }) => (
        <>
          <span
            className={`flex h-7 w-11 items-center justify-center rounded-control ${isActive ? 'bg-field-primary' : ''}`}
            aria-hidden="true"
          >
            {icon}
          </span>
          {label}
        </>
      )}
    </NavLink>
  )
}

// 24px, 2px stroke, rounded joins — the icon language the asset system
// asks for (simple geometry that survives small sizes, recolorable).
const iconProps = {
  width: 22,
  height: 22,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2.2,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
}

function TodayIcon() {
  return (
    <svg {...iconProps}>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
    </svg>
  )
}

function LibraryIcon() {
  return (
    <svg {...iconProps}>
      <rect x="3" y="4" width="7" height="16" rx="2" />
      <rect x="14" y="4" width="7" height="10" rx="2" />
      <path d="M14 18h7" />
    </svg>
  )
}

function ProgressIcon() {
  return (
    <svg {...iconProps}>
      <path d="M4 19V11M10 19V5M16 19v-8M22 19H2" />
    </svg>
  )
}

function SettingsIcon() {
  return (
    <svg {...iconProps}>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" />
    </svg>
  )
}
