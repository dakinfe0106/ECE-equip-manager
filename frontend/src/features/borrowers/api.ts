import { apiBaseUrl } from '../../api'
import { sessionFetch } from '../auth/sessionFetch'

export interface BorrowerRecord {
  borrower_id: number
  unb_id: string
  first_name: string
  last_name: string
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
