import { useLocation } from 'react-router'
import { useAuth } from '../../features/auth/useAuth'

const pageNames: Record<string, string> = {
  '/': 'Dashboard',
  '/assets': 'Assets',
  '/assets/new': 'Add Asset',
  '/categories': 'Categories',
  '/equipment-types': 'Equipment Types',
}

export default function Header() {
  const { pathname } = useLocation()
  const { user } = useAuth()
  const pageName = pageNames[pathname.replace(/\/+$/, '') || '/'] || 'Workspace'
  const displayName = [user?.first_name, user?.last_name].filter(Boolean).join(' ') || user?.username || ''
  const initials = displayName.trim().split(/\s+/).map((part) => part[0]).join('').slice(0, 2).toUpperCase()

  return (
    <header aria-label="Application header" className="flex h-[66px] shrink-0 items-center justify-between gap-3 border-b border-line bg-white/95 px-8 max-[760px]:px-4">
      <nav aria-label="Breadcrumb" className="min-w-0 flex-1 text-xs">
        <ol className="flex min-w-0 items-center gap-2.5">
          <li className="shrink-0 text-subtle max-[760px]:hidden">ECE Equipment Manager</li>
          <li aria-hidden="true" className="text-line max-[760px]:hidden">/</li>
          <li aria-current="page" className="truncate font-bold text-body" title={pageName}>{pageName}</li>
        </ol>
      </nav>
      <div className="flex shrink-0 items-center gap-3 max-[520px]:gap-2">
        <span className="rounded-full bg-role-soft px-[9px] py-[5px] text-[9px] font-bold whitespace-nowrap text-role">{user?.role_label}</span>
        <button type="button" disabled aria-label="Notifications (coming soon)" title="Notifications coming soon" className="grid size-8 cursor-not-allowed place-items-center rounded-lg text-muted max-[520px]:hidden">
          <svg aria-hidden="true" className="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4" />
          </svg>
        </button>
        <div role="img" aria-label={`Signed in as ${displayName}`} title={displayName} className="grid size-8 shrink-0 place-items-center rounded-full bg-avatar-soft text-[11px] font-bold text-avatar">
          <span aria-hidden="true">{initials}</span>
        </div>
      </div>
    </header>
  )
}
