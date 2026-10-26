import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { AuthContext } from './context'
import type { AuthContextValue, AuthenticationStatus } from './context'
import {
  fetchCurrentUser,
  signIn as apiSignIn,
  signOut as apiSignOut,
  type AuthenticatedUser,
} from './api'

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthenticatedUser | null>(null)
  const [status, setStatus] = useState<AuthenticationStatus>('checking')
  const [error, setError] = useState('')

  const loadCurrentUser = useCallback(() => {
    void fetchCurrentUser()
      .then((currentUser) => {
        setUser(currentUser)
        setStatus(currentUser ? 'authenticated' : 'anonymous')
      })
      .catch((loadError: unknown) => {
        setUser(null)
        setError(
          loadError instanceof Error
            ? loadError.message
            : 'Could not verify your EMS session.',
        )
        setStatus('error')
      })
  }, [])

  useEffect(() => {
    loadCurrentUser()
  }, [loadCurrentUser])

  const retry = useCallback(() => {
    setStatus('checking')
    setError('')
    loadCurrentUser()
  }, [loadCurrentUser])

  const signIn = useCallback(async (username: string, password: string) => {
    const currentUser = await apiSignIn(username, password)
    setUser(currentUser)
    setError('')
    setStatus('authenticated')
  }, [])

  const signOut = useCallback(async () => {
    await apiSignOut()
    setUser(null)
    setError('')
    setStatus('anonymous')
  }, [])

  const value = useMemo<AuthContextValue>(
    () => ({ user, status, error, signIn, signOut, retry }),
    [user, status, error, signIn, signOut, retry],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
