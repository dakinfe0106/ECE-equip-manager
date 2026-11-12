import { createContext } from 'react'
import type { CurrentUser } from './api'

export interface AuthState {
  user: CurrentUser | null
  status: 'loading' | 'ready' | 'error'
  error: string
  refresh: () => Promise<void>
  login: (username: string, password: string) => Promise<void>
  logout: () => Promise<void>
}

export const AuthContext = createContext<AuthState | undefined>(undefined)
