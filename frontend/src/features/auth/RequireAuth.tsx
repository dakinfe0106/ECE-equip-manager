import { Navigate, Outlet } from 'react-router'
import { hasPermission } from './api'
import type { CurrentUser } from './api'
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

export default function RequireAuth({ permission, roles }: { permission?: string; roles?: readonly CurrentUser['role'][] }) {
  const { user, status } = useAuth()
  if (status !== 'ready') return <SessionStatus />
  if (!user) {
    return <Navigate to="/login" replace />
  }
  if ((permission && !hasPermission(user, permission)) || (roles && !roles.includes(user.role))) {
    return (
      <main className="p-6" role="alert">
        <h1>Access denied</h1>
        <p>Your role does not allow access to this page.</p>
      </main>
    )
  }
  return <Outlet />
}
