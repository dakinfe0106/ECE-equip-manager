import { useCallback, useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { AuthContext } from './AuthContext'
import { describeAuthError, fetchCurrentUser, signIn, signOut } from './api'
import type { CurrentUser } from './api'
import type { AuthState } from './AuthContext'
import { SESSION_CHECK_EVENT } from './sessionFetch'

export default function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<CurrentUser | null>(null)
  const [status, setStatus] = useState<AuthState['status']>('loading')
  const [error, setError] = useState('')
  const generation = useRef(0)
  const checkingSession = useRef(false)

  const refresh = useCallback(async (background = false) => {
    if (background && checkingSession.current) return
    checkingSession.current = true
    const request = ++generation.current
    if (!background) {
      setStatus('loading')
      setError('')
    }
    try {
      const currentUser = await fetchCurrentUser()
      if (request !== generation.current) return
      setUser(currentUser)
      setStatus('ready')
    } catch (failure) {
      if (request !== generation.current) return
      if (background) return
      setError(describeAuthError(failure))
      setStatus('error')
    } finally {
      checkingSession.current = false
    }
  }, [])

  useEffect(() => {
    let active = true
    const request = ++generation.current
    void fetchCurrentUser().then((currentUser) => {
      if (!active || request !== generation.current) return
      setUser(currentUser)
      setStatus('ready')
    }).catch((failure: unknown) => {
      if (!active || request !== generation.current) return
      setError(describeAuthError(failure))
      setStatus('error')
    })
    const checkSession = () => { void refresh(true) }
    window.addEventListener(SESSION_CHECK_EVENT, checkSession)
    return () => {
      active = false
      window.removeEventListener(SESSION_CHECK_EVENT, checkSession)
    }
  }, [refresh])

  async function login(username: string, password: string) {
    const request = ++generation.current
    const currentUser = await signIn(username, password)
    if (request !== generation.current) return
    setUser(currentUser)
    setError('')
    setStatus('ready')
  }

  async function logout() {
    const request = ++generation.current
    await signOut()
    if (request !== generation.current) return
    setUser(null)
    setError('')
    setStatus('ready')
  }

  return (
    <AuthContext.Provider value={{ user, status, error, refresh, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}
