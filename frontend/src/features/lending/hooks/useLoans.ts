import { useEffect, useState } from 'react'
import { fetchLoans, LoanLookupError } from '../api'
import {
  defaultLoanFilters,
  type LoanFilters,
  type LoanRecord,
} from '../types'

function getErrorMessage(error: unknown): string {
  if (error instanceof LoanLookupError && error.status === 403) {
    return 'You are not authorized to view lending records.'
  }

  return 'Could not load lending records. Please try again.'
}

interface LoanState {
  loans: LoanRecord[]
  errorMessage: string
  resolvedRequest: string | null
}

export default function useLoans(
  filters: LoanFilters = defaultLoanFilters,
  search = '',
) {
  const requestKey = [
    filters.loanState,
    filters.expectedReturnDateFrom,
    filters.expectedReturnDateTo,
    filters.assetStatus,
    search,
  ].join('|')

  const [state, setState] = useState<LoanState>({
    loans: [],
    errorMessage: '',
    resolvedRequest: null,
  })

  useEffect(() => {
    let isCurrent = true

    fetchLoans(filters, search)
      .then((response) => {
        if (!isCurrent) return

        setState({
          loans: response,
          errorMessage: '',
          resolvedRequest: requestKey,
        })
      })
      .catch((error: unknown) => {
        if (!isCurrent) return

        setState({
          loans: [],
          errorMessage: getErrorMessage(error),
          resolvedRequest: requestKey,
        })
      })

    return () => {
      isCurrent = false
    }
  }, [filters, search, requestKey])

  return {
    loans: state.loans,
    errorMessage: state.errorMessage,
    isLoading: state.resolvedRequest !== requestKey,
  }
}