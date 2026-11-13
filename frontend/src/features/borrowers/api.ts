import { apiBaseUrl } from '../../api'
import { sessionFetch } from '../auth/sessionFetch'

export interface BorrowerRecord {
  borrower_id: number
  unb_id: string
  first_name: string
  last_name: string
}

export type BorrowerDetails = BorrowerRecord

export interface PaginatedBorrowers {
  count: number
  next: string | null
  previous: string | null
  results: BorrowerRecord[]
}

export class BorrowerRequestError extends Error {
  readonly status: number
  readonly body: unknown

  constructor(status: number, body?: unknown) {
    super(`Borrower request failed (${status})`)
    this.name = 'BorrowerRequestError'
    this.status = status
    this.body = body
  }
}

async function responseError(response: Response): Promise<BorrowerRequestError> {
  let body: unknown
  try {
    body = await response.json()
  } catch {
    body = undefined
  }
  return new BorrowerRequestError(response.status, body)
}

function csrfToken(): string | undefined {
  if (typeof document === 'undefined') return undefined
  const token = document.cookie
    .split('; ')
    .find((cookie) => cookie.startsWith('csrftoken='))
    ?.slice('csrftoken='.length)
  return token ? decodeURIComponent(token) : undefined
}

export function describeBorrowerError(error: unknown): string {
  if (error instanceof BorrowerRequestError) {
    if (error.status === 403) {
      return 'Your account does not have permission to view borrowers, or your session has expired.'
    }
    if (error.status === 404) {
      return 'The selected borrower could not be found. Refresh the list and try again.'
    }
    return `Could not load borrowers (error ${error.status}).`
  }
  return 'Could not reach the server to load borrowers.'
}

export function describeBorrowerDetailError(error: unknown, action: string): string {
  if (error instanceof BorrowerRequestError) {
    if (error.status === 403) {
      return 'Your account does not have permission to edit borrowers, or your session has expired.'
    }
    if (error.status === 404) {
      return 'This borrower could not be found. Refresh the list and try again.'
    }
    return `Could not ${action} (error ${error.status}).`
  }
  return `Could not reach the server to ${action}.`
}

export function firstNameError(error: unknown): string | undefined {
  if (!(error instanceof BorrowerRequestError) || typeof error.body !== 'object' || error.body === null) {
    return undefined
  }
  const messages = (error.body as Record<string, unknown>).first_name
  return Array.isArray(messages)
    ? messages.find((message): message is string => typeof message === 'string')
    : undefined
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
    throw await responseError(response)
  }
  return response.json() as Promise<PaginatedBorrowers>
}

export async function fetchBorrower(
  borrowerId: number,
  signal?: AbortSignal,
): Promise<BorrowerDetails> {
  const response = await sessionFetch(`${apiBaseUrl}/borrowers/${borrowerId}/`, {
    credentials: 'include',
    signal,
  })
  if (!response.ok) throw await responseError(response)
  return response.json() as Promise<BorrowerDetails>
}

export async function updateBorrower(
  borrowerId: number,
  firstName: string,
): Promise<BorrowerDetails> {
  const headers = new Headers({ 'Content-Type': 'application/json' })
  const token = csrfToken()
  if (token) headers.set('X-CSRFToken', token)

  const response = await sessionFetch(`${apiBaseUrl}/borrowers/${borrowerId}/`, {
    method: 'PATCH',
    credentials: 'include',
    headers,
    body: JSON.stringify({ first_name: firstName.trim() }),
  })
  if (!response.ok) throw await responseError(response)
  return response.json() as Promise<BorrowerDetails>
}
