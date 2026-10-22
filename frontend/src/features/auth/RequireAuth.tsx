import { Navigate, Outlet, useLocation } from 'react-router'
import { useAuth } from './useAuth'

export function SessionStatus() {
  const { status, error, refresh } = useAuth()
  return (
    <main className="grid min-h-dvh place-items-center p-6">
      {status === 'error' ? (
        <div className="text-center">
          <p role="alert">{error}</p>
          <button type="button" onClick={() => { void refresh() }} className="mt-4 rounded-lg bg-blue-600 px-5 py-3 text-white">Try again</button>
        </div>
      ) : <p role="status">Checking your session…</p>}
    </main>
  )
}

export default function RequireAuth() {
  const { user, status } = useAuth()
  const location = useLocation()
  if (status !== 'ready') return <SessionStatus />
  if (!user) {
    return <Navigate to="/login" replace state={{ from: location.pathname + location.search + location.hash }} />
  }
  return <Outlet />
}
