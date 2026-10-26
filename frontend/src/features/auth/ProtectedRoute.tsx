import { Link, Navigate, Outlet, useLocation } from 'react-router'
import { useAuth } from './context'

export default function ProtectedRoute({
  permission,
}: {
  permission?: string
}) {
  const { user, status, error, retry } = useAuth()
  const location = useLocation()

  if (status === 'checking') {
    return <p className="p-6 text-sm text-slate-600" role="status">Checking your EMS session…</p>
  }

  if (status === 'error') {
    return (
      <main className="m-8 max-w-xl rounded-lg border border-red-200 bg-white p-6">
        <h1 className="text-xl font-semibold text-slate-900">Unable to verify your session</h1>
        <p className="mt-2 text-sm text-red-700" role="alert">{error}</p>
        <button
          className="mt-4 rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white"
          type="button"
          onClick={retry}
        >
          Try again
        </button>
      </main>
    )
  }

  if (status === 'anonymous' || !user) {
    return <Navigate to="/login" replace state={{ from: location }} />
  }

  if (permission && !user.permissions.includes(permission)) {
    return (
      <main className="m-8 max-w-xl rounded-lg border border-amber-200 bg-white p-6">
        <h1 className="text-xl font-semibold text-slate-900">Access denied</h1>
        <p className="mt-2 text-sm text-slate-700">
          Your account does not have permission to view this page.
        </p>
        <Link className="mt-4 inline-block text-sm text-blue-700 underline" to="/">
          Return to assets
        </Link>
      </main>
    )
  }

  return <Outlet />
}
