import type { CurrentUser } from '../../features/auth/api'

type UserRole = CurrentUser['role']
export type NavigationIcon = 'dashboard' | 'assets' | 'lending' | 'borrowers' | 'maintenance' | 'analytics' | 'import' | 'users'

interface NavigationItem {
  label: string
  path: string
  icon: NavigationIcon
  roles: readonly UserRole[]
  group: 'workspace' | 'administration'
  inProgress?: boolean
}

const allRoles: readonly UserRole[] = ['ADMINISTRATOR', 'TECHNICIAN', 'FACULTY']
const staffRoles: readonly UserRole[] = ['ADMINISTRATOR', 'TECHNICIAN']

export const navigationItems: readonly NavigationItem[] = [
  { label: 'Dashboard', path: '/', icon: 'dashboard', roles: allRoles, group: 'workspace' },
  { label: 'Assets', path: '/assets', icon: 'assets', roles: allRoles, group: 'workspace' },
  { label: 'Lending', path: '/loans', icon: 'lending', roles: staffRoles, group: 'workspace', inProgress: true },
  { label: 'Borrowers', path: '/borrowers', icon: 'borrowers', roles: staffRoles, group: 'workspace', inProgress: true },
  { label: 'Maintenance', path: '/maintenance', icon: 'maintenance', roles: staffRoles, group: 'workspace', inProgress: true },
  { label: 'Analytics', path: '/analytics', icon: 'analytics', roles: allRoles, group: 'workspace', inProgress: true },
  { label: 'Import & Export', path: '/import-export', icon: 'import', roles: staffRoles, group: 'workspace', inProgress: true },
  { label: 'Users & Access', path: '/users', icon: 'users', roles: ['ADMINISTRATOR'], group: 'administration', inProgress: true },
]
