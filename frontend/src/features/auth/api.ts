import { apiBaseUrl } from '../../api'

export interface CurrentUser {
  id: number
  username: string
  first_name: string
  last_name: string
  role: 'TECHNICIAN' | 'FACULTY' | 'ADMINISTRATOR'
  role_label: string
}

export class AuthError extends Error {
  readonly status: number

  constructor(status: number, message: string) {
    super(message)
    this.name = 'AuthError'
    this.status = status
  }
}

export async function fetchCsrfToken(): Promise<string> {
  const response = await fetch(`${apiBaseUrl}/auth/csrf/`, { credentials: 'include' })
  if (!response.ok) throw new AuthError(response.status, 'Could not prepare a secure request. Please try again.')
  const body: { csrfToken: string } = await response.json()
  return body.csrfToken
}

export async function fetchCurrentUser(): Promise<CurrentUser | null> {
  const response = await fetch(`${apiBaseUrl}/auth/me/`, { credentials: 'include' })
  if (response.status === 403) return null
  if (!response.ok) throw new AuthError(response.status, 'Could not check your session. Please try again.')
  return response.json()
}

async function postAuth(action: 'login' | 'logout', body?: { username: string; password: string }) {
  const csrfToken = await fetchCsrfToken()
  const response = await fetch(`${apiBaseUrl}/auth/${action}/`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', 'X-CSRFToken': csrfToken },
    body: JSON.stringify(body ?? {}),
  })
  if (!response.ok) {
    const message = response.status === 400 && action === 'login'
      ? 'Incorrect username or password.'
      : response.status === 403
        ? 'Your security token could not be verified. Please try again.'
        : `Could not ${action === 'login' ? 'sign in' : 'sign out'}. Please try again.`
    throw new AuthError(response.status, message)
  }
  return response
}

export async function signIn(username: string, password: string): Promise<CurrentUser> {
  const response = await postAuth('login', { username: username.trim(), password })
  const user: CurrentUser = await response.json()
  // Django rotates the token on login; do not retain the pre-login token.
  await fetchCsrfToken()
  return user
}

export async function signOut(): Promise<void> {
  await postAuth('logout')
}

export function describeAuthError(error: unknown): string {
  return error instanceof AuthError ? error.message : 'Could not reach the server. Please try again.'
}
