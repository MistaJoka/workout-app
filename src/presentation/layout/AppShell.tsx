import { NavLink, Outlet } from 'react-router-dom'

export function AppShell() {
  return (
    <div className="min-h-screen bg-bg text-ink flex flex-col">
      <main className="flex-1 pb-16">
        <Outlet />
      </main>
      <nav className="fixed bottom-0 left-0 right-0 flex border-t border-edge bg-surface">
        <NavItem to="/" label="Today" end />
        <NavItem to="/library" label="Library" />
        <NavItem to="/progress" label="Progress" />
        <NavItem to="/settings" label="Settings" />
      </nav>
    </div>
  )
}

function NavItem({ to, label, end }: { to: string; label: string; end?: boolean }) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) => `flex-1 py-3 text-center text-sm ${isActive ? 'text-primary font-semibold' : 'text-ink-muted'}`}
    >
      {label}
    </NavLink>
  )
}
