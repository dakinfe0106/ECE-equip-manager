import { apiBaseUrl } from '../../api'
import { sessionFetch } from '../auth/sessionFetch'
import type { LoanFilters, LoanRecord } from './types'

export class LoanLookupError extends Error {
  readonly status: number

  constructor(status: number, message = `Loan lookup failed (${status})`) {
    super(message)
    this.name = 'LoanLookupError'
    this.status = status
  }
}

export async function fetchLoans(
  filters: LoanFilters,
  search = '',
): Promise<LoanRecord[]> {
  const params = new URLSearchParams()

  if (filters.loanState !== 'all') {
    params.set('status', filters.loanState)
  }

  if (filters.expectedReturnDateFrom) {
    params.set('expected_return_from', filters.expectedReturnDateFrom)
  }

  if (filters.expectedReturnDateTo) {
    params.set('expected_return_to', filters.expectedReturnDateTo)
  }

  if (filters.assetStatus !== 'all') {
    params.set('asset_status', filters.assetStatus)
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