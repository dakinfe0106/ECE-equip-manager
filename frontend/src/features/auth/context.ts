import { createContext, useContext } from 'react'
import type { AuthenticatedUser } from './api'

export type AuthenticationStatus =
  | 'checking'
  | 'authenticated'
  | 'anonymous'
  | 'error'

export interface AuthContextValue {
  user: AuthenticatedUser | null
  status: AuthenticationStatus
  error: string
  signIn: (username: string, password: string) => Promise<void>
  signOut: () => Promise<void>
  retry: () => void
}

export const AuthContext = createContext<AuthContextValue | null>(null)

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider.')
  }
  return context
}
