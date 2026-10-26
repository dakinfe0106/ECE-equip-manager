import type { ReactNode } from 'react'
import type { AuthContextValue } from '../features/auth/context'
import { AuthContext } from '../features/auth/context'

export const technicianAuth: AuthContextValue = {
  user: {
    id: 1,
    username: 'shop-tech',
    permissions: [
      'inventory.add_asset',
      'inventory.change_asset',
      'inventory.delete_asset',
      'inventory.view_asset',
      'inventory.add_category',
      'inventory.change_category',
      'inventory.delete_category',
      'inventory.view_category',
      'inventory.add_equipmenttype',
      'inventory.change_equipmenttype',
      'inventory.delete_equipmenttype',
      'inventory.view_equipmenttype',
    ],
  },
  status: 'authenticated',
  error: '',
  signIn: async () => {},
  signOut: async () => {},
  retry: () => {},
}

export function withAuth(
  children: ReactNode,
  value: AuthContextValue = technicianAuth,
) {
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
