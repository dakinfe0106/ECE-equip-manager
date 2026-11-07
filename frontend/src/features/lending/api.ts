import { apiBaseUrl } from '../../api'
import { sessionFetch } from '../auth/sessionFetch'

export type LoanStatus = 'on_loan' | 'overdue' | 'returned'

export interface LoanRecord {
  loan_id: number
  asset_id: string
  equipment_name: string
  borrower_id: string
  borrower_name: string
  checkout_date: string
  expected_return_date: string
  actual_return_date: string | null
  return_condition: 'Intact' | 'Damaged' | null
  status: LoanStatus
}

export interface PaginatedLoans {
  count: number
  next: string | null
  previous: string | null
  results: LoanRecord[]
}

export class LoanLookupError extends Error {
  readonly status: number

  constructor(status: number, message = `Loan lookup failed (${status})`) {
    super(message)
    this.name = 'LoanLookupError'
    this.status = status
  }
}

export async function fetchLoans(
  status?: LoanStatus,
  search = '',
): Promise<PaginatedLoans> {
  const params = new URLSearchParams()

  if (status) {
    params.set('status', status)
  }

  const trimmedSearch = search.trim()
  if (trimmedSearch) {
    params.set('search', trimmedSearch)
  }

  const query = params.toString()
  const url = `${apiBaseUrl}/loans/${query ? `?${query}` : ''}`

  const response = await sessionFetch(url, {
    credentials: 'include',
  })

  if (!response.ok) {
    throw new LoanLookupError(response.status)
  }

  return response.json()
}