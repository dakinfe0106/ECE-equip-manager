import { apiBaseUrl } from '../../api'
import { sessionFetch } from '../auth/sessionFetch'
import type { DamageWarningLevel } from './types'

export interface BorrowerRecord {
  borrower_id: number
  unb_id: string
  first_name: string
  last_name: string
}

export interface BorrowerDetailsRecord extends BorrowerRecord {
  negligent_damage_flag: boolean
  unresolved_damage_flag_count: number
  damage_warning_level: DamageWarningLevel
  damage_eligible: boolean
  is_manual_enrollment: boolean
}

export interface BorrowerCreateInput {
  unb_id: string
  first_name: string
  last_name?: string
}

export interface BorrowerUpdateInput {
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
  readonly fieldErrors?: Record<string, string | string[]>

  constructor(status: number, fieldErrors?: Record<string, string | string[]>) {
    super(`Borrower request failed (${status})`)
    this.name = 'BorrowerRequestError'
    this.status = status
    this.fieldErrors = fieldErrors
  }
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

export async function createBorrower(
  data: BorrowerCreateInput,
): Promise<BorrowerRecord> {
  const csrftoken =
    typeof document !== 'undefined'
      ? document.cookie
          .split('; ')
          .find((row) => row.startsWith('csrftoken='))
          ?.split('=')[1]
      : null

  const response = await sessionFetch(`${apiBaseUrl}/borrowers/`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(csrftoken ? { 'X-CSRFToken': csrftoken } : {}),
    },
    credentials: 'include',
    body: JSON.stringify(data),
  })

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    throw new BorrowerRequestError(response.status, errorData)
  }

  return response.json() as Promise<BorrowerRecord>
}

export async function updateBorrower(
  borrowerId: number,
  data: BorrowerUpdateInput,
): Promise<BorrowerDetailsRecord> {
  const csrftoken =
    typeof document !== 'undefined'
      ? document.cookie
          .split('; ')
          .find((row) => row.startsWith('csrftoken='))
          ?.split('=')[1]
      : null

  const response = await sessionFetch(`${apiBaseUrl}/borrowers/${borrowerId}/`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      ...(csrftoken ? { 'X-CSRFToken': csrftoken } : {}),
    },
    credentials: 'include',
    body: JSON.stringify(data),
  })

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    throw new BorrowerRequestError(response.status, errorData)
  }

  return response.json() as Promise<BorrowerDetailsRecord>
}
