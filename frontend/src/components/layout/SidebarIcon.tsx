import type { NavigationIcon } from './navigation'

const paths: Record<NavigationIcon, string> = {
  dashboard: 'M3 3h6v6H3z M15 3h6v6h-6z M3 15h6v6H3z M15 15h6v6h-6z',
  assets: 'M5 2h14v20H5z M8 7h8 M8 11h8',
  lending: 'M3 8h18l-4-5H7z M5 12v9 M19 12v9 M2 21h20',
  borrowers: 'M16 21v-3a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v3 M16 3a4 4 0 0 1 0 8 M21 21v-3a4 4 0 0 0-3-3.87 M13 6a4 4 0 1 1-8 0 4 4 0 0 1 8 0',
  maintenance: 'M14.7 6.3a5 5 0 0 0-6.4 6.4L2 19l3 3 6.3-6.3a5 5 0 0 0 6.4-6.4l-3 3-3-3z',
  analytics: 'M3 21h19 M6 21V10 M12 21V3 M18 21v-7',
  import: 'M12 16V2 M7 7l5-5 5 5 M3 15v6h18v-6',
  users: 'M16 21v-3a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v3 M13 6a4 4 0 1 1-8 0 4 4 0 0 1 8 0 M19 4v6 M16 7h6',
}

export default function SidebarIcon({ name }: { name: NavigationIcon }) {
  return (
    <svg className="nav-icon" viewBox="0 0 24 24" aria-hidden="true">
      <path d={paths[name]} />
    </svg>
  )
}
