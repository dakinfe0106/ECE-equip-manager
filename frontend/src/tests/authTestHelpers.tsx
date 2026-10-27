import AppRoutes from '../AppRoutes'
import { AuthContext } from '../features/auth/AuthContext'
import type { AuthState } from '../features/auth/AuthContext'

// Existing page rendering tests explicitly model an authenticated session.
const authenticatedState: AuthState = {
  user: { id: 1, username: 'testtech', first_name: 'Test', last_name: 'Technician', role: 'TECHNICIAN', role_label: 'Technician' },
  status: 'ready',
  error: '',
  refresh: async () => {},
  login: async () => {},
  logout: async () => {},
}

export default function AuthenticatedAppRoutes() {
  return <AuthContext.Provider value={authenticatedState}><AppRoutes /></AuthContext.Provider>
}
