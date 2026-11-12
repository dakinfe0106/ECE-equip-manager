import { useState } from 'react'
import { Link, NavLink } from 'react-router'
import { useAuth } from '../../features/auth/useAuth'
import { describeAuthError } from '../../features/auth/api'
import { getUserDisplay } from '../../features/auth/userDisplay'
import { navigationItems } from './navigation'
import SidebarIcon from './SidebarIcon'

export default function Sidebar() {
  const { user, logout } = useAuth()
  const [isSigningOut, setIsSigningOut] = useState(false)
  const [error, setError] = useState('')
  const { displayName, avatarText } = getUserDisplay(user)
  const visibleItems = navigationItems.filter((item) => user && item.roles.includes(user.role))
  const workspaceItems = visibleItems.filter((item) => item.group === 'workspace')
  const administrationItems = visibleItems.filter((item) => item.group === 'administration')

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

  function renderItem(item: typeof navigationItems[number]) {
    return (
      <NavLink key={item.path} to={item.path} end={item.path === '/'} aria-label={item.label} title={item.label}
        className={({ isActive }) => `my-[3px] flex min-h-[42px] items-center gap-[11px] rounded-lg px-3 py-[11px] text-[13px] transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary max-[760px]:size-[42px] max-[760px]:shrink-0 max-[760px]:justify-center max-[760px]:p-0 ${isActive ? 'bg-sidebar-active text-white shadow-[0_5px_14px_var(--color-sidebar-shadow)]' : 'text-sidebar-text hover:bg-sidebar-hover hover:text-white'}`}>
        <SidebarIcon name={item.icon} />
        <span className="max-[760px]:hidden">{item.label}</span>
      </NavLink>
    )
  }

  return (
    <aside className="sidebar fixed inset-y-0 left-0 z-20 flex h-dvh w-[248px] flex-col bg-sidebar px-[14px] pt-5 pb-[14px] text-sidebar-text max-[760px]:w-[60px] max-[760px]:px-[5px]">
      <Link to="/" aria-label="ECE Equipment Manager home" className="flex shrink-0 items-center gap-[11px] px-[7px] pb-[26px] focus-visible:outline-2 focus-visible:outline-primary max-[760px]:justify-center max-[760px]:px-0">
        <span aria-hidden="true" className="grid size-[35px] shrink-0 place-items-center rounded-[10px] bg-linear-to-br from-brand-start to-brand-end text-base font-extrabold text-white shadow-[0_6px_15px_var(--color-sidebar-shadow)]">E</span>
        <span className="brand-name max-[760px]:hidden">
          <strong className="block text-[15px] leading-5 font-bold tracking-[-0.2px] text-white">ECE Equipment</strong>
          <span className="mt-px block text-[11px] text-sidebar-muted">Manager</span>
        </span>
      </Link>
      <nav className="min-h-0 flex-1 overflow-y-auto" aria-label="Main navigation">
        <p className="mx-[11px] mt-2 mb-2 text-[10px] font-bold tracking-[0.12em] text-sidebar-label uppercase max-[760px]:hidden">Workspace</p>
        {workspaceItems.map(renderItem)}
        {administrationItems.length > 0 && (
          <div role="group" aria-label="Administration" className="mt-6 border-t border-sidebar-line pt-4">
            <p className="mx-[11px] mb-2 text-[10px] font-bold tracking-[0.12em] text-sidebar-label uppercase max-[760px]:hidden">Administration</p>
            {administrationItems.map(renderItem)}
          </div>
        )}
      </nav>
      <div className="mt-auto shrink-0 border-t border-sidebar-line px-2 pt-[13px] pb-[3px] max-[760px]:px-0">
        <div className="flex items-center gap-[10px] max-[760px]:flex-col max-[760px]:gap-1">
          <span aria-hidden="true" className="grid size-[34px] shrink-0 place-items-center rounded-full bg-sidebar-avatar text-[11px] font-bold text-sidebar-avatar-text">{avatarText}</span>
          <div className="min-w-0 flex-1 max-[760px]:hidden">
            <p className="truncate text-xs leading-[17px] font-bold text-white" title={displayName}>{displayName}</p>
            <p className="truncate text-[11px] leading-[17px] text-sidebar-muted" title={user?.role_label}>{user?.role_label}</p>
          </div>
          <button type="button" onClick={() => { void handleLogout() }} disabled={isSigningOut} aria-label={isSigningOut ? 'Signing out…' : 'Sign out'} title="Sign out" className="shrink-0 cursor-pointer rounded-sm py-2 text-[10px] text-sidebar-muted hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-wait disabled:opacity-60">
            {isSigningOut ? 'Signing out…' : 'Sign out'}
          </button>
        </div>
        {error && <p role="alert" className="mt-2 break-words text-[10px] text-red-200">{error}</p>}
      </div>
    </aside>
  )
}
