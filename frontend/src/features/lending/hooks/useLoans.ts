import { useEffect, useState } from 'react'
import {
  fetchLoans,
  LoanLookupError,
  type LoanRecord,
  type LoanStatus,
} from '../api'

function getErrorMessage(error: unknown): string {
  if (error instanceof LoanLookupError && error.status === 403) {
    return 'You are not authorized to view lending records.'
  }

  return 'Could not load lending records. Please try again.'
}

export default function useLoans(
  status?: LoanStatus,
  search = '',
) {
  const [loans, setLoans] = useState<LoanRecord[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState('')

  useEffect(() => {
    let isCurrent = true

    setIsLoading(true)
    setErrorMessage('')

    fetchLoans(status, search)
      .then((response) => {
        if (isCurrent) {
          setLoans(response.results)
        }
      })
      .catch((error: unknown) => {
        if (isCurrent) {
          setLoans([])
          setErrorMessage(getErrorMessage(error))
        }
      })
      .finally(() => {
        if (isCurrent) {
          setIsLoading(false)
        }
      })

    return () => {
      isCurrent = false
    }
  }, [status, search])

  return {
    loans,
    isLoading,
    errorMessage,
  }
}