import { useState } from 'react'
import { Link, NavLink } from 'react-router'
import { useAuth } from '../../features/auth/useAuth'
import { describeAuthError } from '../../features/auth/api'

// NavLink adds aria-current="page" and tells us which link matches the current URL.
const navLinkClass = ({ isActive }: { isActive: boolean }) =>
  isActive ? 'sidebar-link sidebar-link-active' : 'sidebar-link'

export default function Sidebar() {
  const { user, logout } = useAuth()
  const [isSigningOut, setIsSigningOut] = useState(false)
  const [error, setError] = useState('')
  const displayName = [user?.first_name, user?.last_name].filter(Boolean).join(' ') || user?.username || ''
  const initials = displayName.trim().split(/\s+/).map((part) => part[0]).join('').slice(0, 2).toUpperCase()

  async function handleLogout() {
    if (isSigningOut) return
    setIsSigningOut(true)
    setError('')
    try {
      await logout()
    } catch (failure) {
      setError(describeAuthError(failure))
    } finally {
      setIsSigningOut(false)
    }
  }
  return (
    <aside className="sidebar">
      <Link className="brand" to="/" aria-label="ECE Equipment Manager home">
        <span className="brand-name">ECE Equipment<br />Manager</span>
      </Link>

      <nav className="sidebar-nav" aria-label="Main navigation">
        <span className="sidebar-section-label">WORKSPACE</span>
        <span className="sidebar-link sidebar-link-disabled" aria-disabled="true">
          <svg className="nav-icon" viewBox="0 0 20 20" aria-hidden="true">
            <rect x="2.5" y="2.5" width="6" height="6" rx="1" />
            <rect x="11.5" y="2.5" width="6" height="6" rx="1" />
            <rect x="2.5" y="11.5" width="6" height="6" rx="1" />
            <rect x="11.5" y="11.5" width="6" height="6" rx="1" />
          </svg>
          Dashboard
        </span>
        <NavLink className={navLinkClass} to="/categories">
          <svg className="nav-icon" viewBox="0 0 20 20" aria-hidden="true">
            <path d="M3 5.5h5l1.5 1.8H17v7.2a1.5 1.5 0 0 1-1.5 1.5h-11A1.5 1.5 0 0 1 3 14.5z" />
            <path d="M3 7.3h14" />
          </svg>
          Categories
        </NavLink>

        <NavLink
          to="/equipment-types"
          className={({ isActive }) =>
            `sidebar-link${isActive ? ' sidebar-link-active' : ''}`
          }
        >
          <svg className="nav-icon" viewBox="0 0 20 20" aria-hidden="true">
            <path d="m10 2.7 6.8 3.7v7.2L10 17.3l-6.8-3.7V6.4z" />
            <path d="m3.4 6.6 6.6 3.7 6.6-3.7M10 10.3v6.8" />
          </svg>
          Equipment Types
        </NavLink>
        <NavLink
          to="/"
          end
          className={({ isActive }) =>
            `sidebar-link${isActive ? ' sidebar-link-active' : ''}`
          }
        >
          <svg className="nav-icon" viewBox="0 0 20 20" aria-hidden="true">
            <path d="M3 6.5h14v9A1.5 1.5 0 0 1 15.5 17h-11A1.5 1.5 0 0 1 3 15.5z" />
            <path d="M2.5 6.5 4 3h12l1.5 3.5M7 6.5v2h6v-2" />
          </svg>
          Assets
        </NavLink>
        <span className="sidebar-link sidebar-link-disabled" aria-disabled="true">
          <svg className="nav-icon" viewBox="0 0 20 20" aria-hidden="true">
            <path d="M3 6h12m0 0-2.5-2.5M15 6l-2.5 2.5M17 14H5m0 0 2.5-2.5M5 14l2.5 2.5" />
          </svg>
          Loans
        </span>
        <span className="sidebar-section-label sidebar-section-settings">ADMINISTRATION</span>
        <span className="sidebar-link sidebar-link-disabled" aria-disabled="true">
          <svg className="nav-icon" viewBox="0 0 20 20" aria-hidden="true">
            <path d="m8.4 2.8.4-1h2.4l.4 1a7 7 0 0 1 1.5.7l1-.4 1.7 1.7-.4 1a7 7 0 0 1 .7 1.5l1 .4v2.4l-1 .4a7 7 0 0 1-.7 1.5l.4 1-1.7 1.7-1-.4a7 7 0 0 1-1.5.7l-.4 1H8.8l-.4-1a7 7 0 0 1-1.5-.7l-1 .4-1.7-1.7.4-1a7 7 0 0 1-.7-1.5l-1-.4V7.7l1-.4a7 7 0 0 1 .7-1.5l-.4-1 1.7-1.7 1 .4a7 7 0 0 1 1.5-.7Z" transform="translate(1 1)" />
            <circle cx="10" cy="10" r="2.3" />
          </svg>
          Settings
        </span>
      </nav>
      <div className="shrink-0 px-[15px] py-3 max-[700px]:px-2">
        <div className="flex min-h-[34px] items-center gap-[10px] max-[700px]:flex-col max-[700px]:gap-1">
          <span aria-hidden="true" className="flex size-[34px] shrink-0 items-center justify-center rounded-full bg-[#263d59] text-[11px] font-semibold text-[#d5dfed]">
            {initials}
          </span>
          <div className="min-w-0 flex-1 max-[700px]:hidden">
            <p className="truncate text-[12px] leading-[17px] font-semibold text-white" title={displayName}>{displayName}</p>
            <p className="truncate text-[11px] leading-[17px] text-[#8999ae]" title={user?.role_label}>{user?.role_label}</p>
          </div>
          <button type="button" onClick={() => { void handleLogout() }} disabled={isSigningOut} aria-label={isSigningOut ? 'Signing out…' : 'Sign out'} title="Sign out" className="shrink-0 cursor-pointer rounded-sm py-2 text-[9px] leading-4 text-[#a8b6c9] hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-wait disabled:opacity-60">
            {isSigningOut ? 'Signing out…' : 'Sign out'}
          </button>
        </div>
        {error && <p role="alert" className="mt-2 break-words text-[10px] text-red-200">{error}</p>}
      </div>
    </aside>
  )
}
