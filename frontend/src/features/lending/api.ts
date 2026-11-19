
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

export interface LoanCheckoutInput {
  asset_id: number
  borrower_id: number
  expected_return_date: string
}

export class LoanCheckoutError extends Error {
  readonly status: number
  readonly fieldErrors: Record<string, string[]>

  constructor(
    status: number,
    message: string,
    fieldErrors: Record<string, string[]> = {},
  ) {
    super(message)
    this.name = 'LoanCheckoutError'
    this.status = status
    this.fieldErrors = fieldErrors
  }
}

export async function createLoan(
  input: LoanCheckoutInput,
): Promise<LoanRecord> {
  const headers = new Headers({
    'Content-Type': 'application/json',
  })

  const csrfCookie = typeof document === 'undefined'
    ? undefined
    : document.cookie
        .split('; ')
        .find((cookie) => cookie.startsWith('csrftoken='))

  if (csrfCookie) {
    headers.set(
      'X-CSRFToken',
      decodeURIComponent(csrfCookie.slice('csrftoken='.length)),
    )
  }

  const response = await sessionFetch(`${apiBaseUrl}/loans/`, {
    method: 'POST',
    headers,
    credentials: 'include',
    body: JSON.stringify(input),
  })

  if (!response.ok) {
    let message = `Checkout failed (${response.status})`
    const fieldErrors: Record<string, string[]> = {}

    try {
      const body: unknown = await response.json()

      if (typeof body === 'object' && body !== null) {
        for (const [field, value] of Object.entries(body)) {
          if (Array.isArray(value)) {
            fieldErrors[field] = value.map(String)
          } else if (typeof value === 'string') {
            if (field === 'detail') {
              message = value
            } else {
              fieldErrors[field] = [value]
            }
          }
        }
      }
    } catch {
      // Keep the default HTTP error message.
    }

    throw new LoanCheckoutError(
      response.status,
      message,
      fieldErrors,
    )
  }

  return response.json() as Promise<LoanRecord>
}

export interface LoanExtensionInput {
  expected_return_date: string
}

export class LoanExtensionError extends Error {
  readonly status: number
  readonly fieldErrors: Record<string, string[]>

  constructor(
    status: number,
    message: string,
    fieldErrors: Record<string, string[]> = {},
  ) {
    super(message)
    this.name = 'LoanExtensionError'
    this.status = status
    this.fieldErrors = fieldErrors
  }
}

export async function extendLoan(
  loanId: number,
  input: LoanExtensionInput,
): Promise<LoanRecord> {
  const headers = new Headers({
    'Content-Type': 'application/json',
  })

  const csrfCookie = typeof document === 'undefined'
    ? undefined
    : document.cookie
        .split('; ')
        .find((cookie) => cookie.startsWith('csrftoken='))

  if (csrfCookie) {
    headers.set(
      'X-CSRFToken',
      decodeURIComponent(csrfCookie.slice('csrftoken='.length)),
    )
  }

  const response = await sessionFetch(
    `${apiBaseUrl}/loans/${loanId}/`,
    {
      method: 'PATCH',
      headers,
      credentials: 'include',
      body: JSON.stringify(input),
    },
  )

  if (!response.ok) {
    let message = `Loan extension failed (${response.status})`
    const fieldErrors: Record<string, string[]> = {}

    try {
      const body: unknown = await response.json()

      if (typeof body === 'object' && body !== null) {
        for (const [field, value] of Object.entries(body)) {
          if (Array.isArray(value)) {
            fieldErrors[field] = value.map(String)
          } else if (typeof value === 'string') {
            if (field === 'detail') {
              message = value
            } else {
              fieldErrors[field] = [value]
            }
          }
        }
      }
    } catch {
      // Keep the default HTTP error message.
    }

    throw new LoanExtensionError(
      response.status,
      message,
      fieldErrors,
    )
  }

  return response.json() as Promise<LoanRecord>
}


export interface LoanReturnInput {
  actual_return_date: string
  return_condition: 'Intact' | 'Damaged'
}

export interface LoanReturnResponse {
  loan: LoanRecord
  maintenance_required: boolean
}

export class LoanReturnError extends Error {
  readonly status: number
  readonly fieldErrors: Record<string, string[]>

  constructor(
    status: number,
    message: string,
    fieldErrors: Record<string, string[]> = {},
  ) {
    super(message)
    this.name = 'LoanReturnError'
    this.status = status
    this.fieldErrors = fieldErrors
  }
}

export async function returnLoan(
  loanId: number,
  input: LoanReturnInput,
): Promise<LoanReturnResponse> {
  const headers = new Headers({
    'Content-Type': 'application/json',
  })

  const csrfCookie = typeof document === 'undefined'
    ? undefined
    : document.cookie
        .split('; ')
        .find((cookie) => cookie.startsWith('csrftoken='))

  if (csrfCookie) {
    headers.set(
      'X-CSRFToken',
      decodeURIComponent(csrfCookie.slice('csrftoken='.length)),
    )
  }

  const response = await sessionFetch(
    `${apiBaseUrl}/loans/${loanId}/return/`,
    {
      method: 'POST',
      headers,
      credentials: 'include',
      body: JSON.stringify(input),
    },
  )

  if (!response.ok) {
    let message = `Loan return failed (${response.status})`
    const fieldErrors: Record<string, string[]> = {}

    try {
      const body: unknown = await response.json()

      if (typeof body === 'object' && body !== null) {
        for (const [field, value] of Object.entries(body)) {
          if (Array.isArray(value)) {
            fieldErrors[field] = value.map(String)
          } else if (typeof value === 'string') {
            if (field === 'detail') {
              message = value
            } else {
              fieldErrors[field] = [value]
            }
          }
        }
      }
    } catch {
      // Keep the default HTTP error message.
    }

    throw new LoanReturnError(
      response.status,
      message,
      fieldErrors,
    )
  }

  return response.json() as Promise<LoanReturnResponse>
}