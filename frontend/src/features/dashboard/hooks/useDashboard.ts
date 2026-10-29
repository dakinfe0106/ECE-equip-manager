import { useEffect, useState } from 'react'
import {
  DashboardLookupError,
  fetchDashboardSummary,
  type DashboardSummary,
} from '../api'

function getErrorMessage(error: unknown): string {
  if (error instanceof DashboardLookupError && error.status === 403) {
    return 'You are not authorized to view the dashboard. Sign in with your EMS account and try again.'
  }

  return 'Could not load dashboard information. Please try again.'
}

export default function useDashboard() {
  const [summary, setSummary] = useState<DashboardSummary | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState('')

  useEffect(() => {
    let isCurrent = true

    fetchDashboardSummary()
      .then((response) => {
        if (isCurrent) {
          setSummary(response)
        }
      })
      .catch((error: unknown) => {
        if (isCurrent) {
          setSummary(null)
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
  }, [])

  return {
    summary,
    isLoading,
    errorMessage,
  }
}