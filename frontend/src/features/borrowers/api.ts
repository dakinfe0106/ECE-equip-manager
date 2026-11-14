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
}

export interface PaginatedBorrowers {
  count: number
  next: string | null
  previous: string | null
  results: BorrowerRecord[]
}

export class BorrowerRequestError extends Error {
  readonly status: number

  constructor(status: number) {
    super(`Borrower request failed (${status})`)
    this.name = 'BorrowerRequestError'
    this.status = status
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
