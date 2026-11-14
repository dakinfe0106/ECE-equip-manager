import { apiBaseUrl } from '../../api'
import { sessionFetch } from '../auth/sessionFetch'

export interface BorrowerRecord {
  borrower_id: number
  unb_id: string
  first_name: string
  last_name: string
}

export interface BorrowerCreation {
  unb_id: string
  first_name: string
  last_name?: string
}

export interface PaginatedBorrowers {
  count: number
  next: string | null
  previous: string | null
  results: BorrowerRecord[]
}

export class BorrowerRequestError extends Error {
  readonly status: number

  constructor(status: number, message = `Borrower request failed (${status})`) {
    super(message)
    this.name = 'BorrowerRequestError'
    this.status = status
  }
}

async function responseError(response: Response, action: string): Promise<BorrowerRequestError> {
  let message = `${action} failed (${response.status})`
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
    // Keep default status message when body is not JSON.
  }
  return new BorrowerRequestError(response.status, message)
}

function getCsrfToken(): string | undefined {
  if (typeof document === 'undefined') {
    return undefined
  }
  return document.cookie
    .split('; ')
    .find((cookie) => cookie.startsWith('csrftoken='))
    ?.slice('csrftoken='.length)
}

export function describeBorrowerError(error: unknown): string {
  if (error instanceof BorrowerRequestError) {
    if (error.status === 403) {
      return 'Your account does not have permission to view borrowers, or your session has expired.'
    }
    return `Could not load borrowers (error ${error.status}).`
  }
  return 'Could not reach the server to load borrowers.'
}

export async function fetchBorrowers(
  page = 1,
  search = '',
  signal?: AbortSignal,
): Promise<PaginatedBorrowers> {
  const params = new URLSearchParams({ page: page.toString() })
  if (search.trim()) {
    params.set('search', search.trim())
  }

  const response = await sessionFetch(`${apiBaseUrl}/borrowers/?${params}`, {
    credentials: 'include',
    signal,
  })
  if (!response.ok) {
    throw new BorrowerRequestError(response.status)
  }
  return response.json() as Promise<PaginatedBorrowers>
}

export async function createBorrower(borrower: BorrowerCreation): Promise<BorrowerRecord> {
  const headers = new Headers({ 'Content-Type': 'application/json' })
  const csrfToken = getCsrfToken()
  if (csrfToken) {
    headers.set('X-CSRFToken', decodeURIComponent(csrfToken))
  }

  const response = await sessionFetch(`${apiBaseUrl}/borrowers/`, {
    method: 'POST',
    headers,
    credentials: 'include',
    body: JSON.stringify(borrower),
  })
  if (!response.ok) {
    throw await responseError(response, 'Borrower creation')
  }
  return response.json() as Promise<BorrowerRecord>
}