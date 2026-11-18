import { apiBaseUrl } from '../../api'
import { sessionFetch } from '../auth/sessionFetch'
import type { DamageWarningLevel } from './types'

export interface BorrowerRecord {
  borrower_id: number
  unb_id: string
  first_name: string
  last_name: string
  is_manual_enrollment?: boolean
}

export interface BorrowerDetails extends BorrowerRecord {
  negligent_damage_flag?: boolean
  unresolved_damage_flag_count?: number
  damage_warning_level?: DamageWarningLevel
  damage_eligible?: boolean
}

export interface BorrowerDetailsRecord extends BorrowerRecord {
  negligent_damage_flag: boolean
  unresolved_damage_flag_count: number
  damage_warning_level: DamageWarningLevel
  damage_eligible: boolean
}

export interface BorrowerCreation {
  unb_id: string
  first_name: string
  last_name?: string
}

export interface BorrowerUpdate {
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
  readonly fieldErrors?: Record<string, string[]>

  constructor(
    status: number,
    message = `Borrower request failed (${status})`,
    fieldErrors?: Record<string, string[]>,
  ) {
    super(message)
    this.name = 'BorrowerRequestError'
    this.status = status
    this.fieldErrors = fieldErrors
  }
}

async function responseError(response: Response, action: string): Promise<BorrowerRequestError> {
  let message = `${action} failed (${response.status})`
  let fieldErrors: Record<string, string[]> | undefined
  try {
    const body: unknown = await response.json()
    if (typeof body === 'object' && body !== null) {
      fieldErrors = Object.fromEntries(
        Object.entries(body)
          .filter(([, value]) => Array.isArray(value))
          .map(([key, value]) => [key, (value as unknown[]).filter((item): item is string => typeof item === 'string')]),
      )
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
  return new BorrowerRequestError(response.status, message, fieldErrors)
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

export function firstNameError(error: unknown): string | undefined {
  if (error instanceof BorrowerRequestError) {
    return error.fieldErrors?.first_name?.[0]
  }
  return undefined
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

export function describeBorrowerDetailsError(error: unknown): string {
  if (error instanceof BorrowerRequestError) {
    if (error.status === 403) {
      return 'Your account does not have permission to view borrower details, or your session has expired.'
    }
    if (error.status === 404) {
      return 'This borrower is no longer available.'
    }
    return `Could not load borrower details (error ${error.status}).`
  }
  return 'Could not reach the server to load borrower details.'
}

export function describeBorrowerDetailError(error: unknown, action: string): string {
  if (error instanceof BorrowerRequestError) {
    if (error.status === 403) {
      return `Your account does not have permission to ${action}, or your session has expired.`
    }
    if (error.status === 404) {
      return 'This borrower is no longer available.'
    }
    return `Could not ${action} (error ${error.status}).`
  }
  return `Could not reach the server to ${action}.`
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

export async function fetchBorrower(
  borrowerId: number,
  signal?: AbortSignal,
): Promise<BorrowerDetails> {
  const response = await sessionFetch(`${apiBaseUrl}/borrowers/${borrowerId}/`, {
    credentials: 'include',
    signal,
  })
  if (!response.ok) {
    throw new BorrowerRequestError(response.status)
  }
  return response.json() as Promise<BorrowerDetails>
}

export async function fetchBorrowerDetails(
  borrowerId: number,
  signal?: AbortSignal,
): Promise<BorrowerDetailsRecord> {
  const response = await sessionFetch(`${apiBaseUrl}/borrowers/${borrowerId}/`, {
    credentials: 'include',
    signal,
  })
  if (!response.ok) {
    throw new BorrowerRequestError(response.status)
  }
  return response.json() as Promise<BorrowerDetailsRecord>
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

export async function updateBorrower(
  borrowerId: number,
  changes: BorrowerUpdate,
): Promise<BorrowerDetailsRecord> {
  const headers = new Headers({ 'Content-Type': 'application/json' })
  const csrfToken = getCsrfToken()
  if (csrfToken) {
    headers.set('X-CSRFToken', decodeURIComponent(csrfToken))
  }

  const response = await sessionFetch(`${apiBaseUrl}/borrowers/${borrowerId}/`, {
    method: 'PATCH',
    headers,
    credentials: 'include',
    body: JSON.stringify(changes),
  })
  if (!response.ok) {
    throw await responseError(response, 'Borrower update')
  }
  return response.json() as Promise<BorrowerDetailsRecord>
}