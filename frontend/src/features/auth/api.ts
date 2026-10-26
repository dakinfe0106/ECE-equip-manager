import { apiBaseUrl } from '../../api'

export interface AuthenticatedUser {
  id: number
  username: string
  permissions: string[]
}

export class AuthenticationError extends Error {
  readonly status: number

  constructor(status: number, message = `Authentication failed (${status})`) {
    super(message)
    this.name = 'AuthenticationError'
    this.status = status
  }
}

function parseAuthenticatedUser(body: unknown): AuthenticatedUser {
  if (
    typeof body === 'object'
    && body !== null
    && 'id' in body
    && typeof body.id === 'number'
    && 'username' in body
    && typeof body.username === 'string'
    && 'permissions' in body
    && Array.isArray(body.permissions)
    && body.permissions.every((permission) => typeof permission === 'string')
  ) {
    return {
      id: body.id,
      username: body.username,
      permissions: body.permissions,
    }
  }
  throw new Error('The server returned an invalid user profile.')
}

async function readError(response: Response): Promise<AuthenticationError> {
  let message = `Authentication failed (${response.status})`
  try {
    const body: unknown = await response.json()
    if (typeof body === 'object' && body !== null) {
      const values = Object.values(body)
      const firstMessage = values
        .flatMap((value) => (Array.isArray(value) ? value : [value]))
        .find((value) => typeof value === 'string')
      if (typeof firstMessage === 'string') {
        message = firstMessage
      }
    }
  } catch {
    // Keep the HTTP failure message when the response has no JSON body.
  }
  return new AuthenticationError(response.status, message)
}

export async function fetchCsrfToken(): Promise<string> {
  const response = await fetch(`${apiBaseUrl}/auth/csrf/`, {
    credentials: 'include',
  })
  if (!response.ok) {
    throw await readError(response)
  }

  const body: unknown = await response.json()
  if (
    typeof body !== 'object'
    || body === null
    || !('csrfToken' in body)
    || typeof body.csrfToken !== 'string'
  ) {
    throw new Error('The server did not return a CSRF token.')
  }
  return body.csrfToken
}

export async function fetchCurrentUser(): Promise<AuthenticatedUser | null> {
  const response = await fetch(`${apiBaseUrl}/auth/me/`, {
    credentials: 'include',
  })
  if (response.status === 403) {
    return null
  }
  if (!response.ok) {
    throw await readError(response)
  }
  return parseAuthenticatedUser(await response.json())
}

export async function signIn(
  username: string,
  password: string,
): Promise<AuthenticatedUser> {
  const csrfToken = await fetchCsrfToken()
  const response = await fetch(`${apiBaseUrl}/auth/login/`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-CSRFToken': csrfToken,
    },
    credentials: 'include',
    body: JSON.stringify({ username, password }),
  })
  if (!response.ok) {
    throw await readError(response)
  }

  const user = parseAuthenticatedUser(await response.json())
  await fetchCsrfToken()
  return user
}

export async function signOut(): Promise<void> {
  const csrfToken = await fetchCsrfToken()
  const response = await fetch(`${apiBaseUrl}/auth/logout/`, {
    method: 'POST',
    headers: { 'X-CSRFToken': csrfToken },
    credentials: 'include',
  })
  if (!response.ok) {
    throw await readError(response)
  }
}
