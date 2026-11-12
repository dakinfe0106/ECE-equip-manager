import type { ReactNode } from 'react'
import type { AuthState } from '../features/auth/AuthContext'
import { AuthContext } from '../features/auth/AuthContext'

export const technicianAuth: AuthState = {
  user: {
    id: 1,
    username: 'shop-tech',
    first_name: 'Shop',
    last_name: 'Technician',
    role: 'TECHNICIAN',
    role_label: 'Technician',
  },
  status: 'ready',
  error: '',
  refresh: async () => {},
  login: async () => {},
  logout: async () => {},
}

export function withAuth(
  children: ReactNode,
  value: AuthState = technicianAuth,
) {
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
