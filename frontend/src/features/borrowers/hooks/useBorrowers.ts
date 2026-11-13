import { useEffect, useState } from 'react'
import {
  describeBorrowerError,
  fetchBorrowers,
  type BorrowerRecord,
} from '../api'

const pageSize = 20

export default function useBorrowers(page: number, search: string) {
  const [refreshVersion, setRefreshVersion] = useState(0)
  const [result, setResult] = useState<{
    borrowers: BorrowerRecord[]
    errorMessage: string
    page: number
    search: string
    totalCount: number
  } | null>(null)

  useEffect(() => {
    const controller = new AbortController()

    fetchBorrowers(page, search, controller.signal).then(
      (response) => {
        if (!controller.signal.aborted) {
          setResult({
            borrowers: response.results,
            errorMessage: '',
            page,
            search,
            totalCount: response.count,
          })
        }
      },
      (error: unknown) => {
        if (!controller.signal.aborted) {
          setResult({
            borrowers: [],
            errorMessage: describeBorrowerError(error),
            page,
            search,
            totalCount: 0,
          })
        }
      },
    )

    return () => controller.abort()
  }, [page, search, refreshVersion])

  const current = result?.page === page && result.search === search ? result : null
  const borrowers = current?.borrowers ?? []
  const totalCount = current?.totalCount ?? 0

  return {
    borrowers,
    errorMessage: current?.errorMessage ?? '',
    isLoading: current === null,
    pageCount: Math.max(1, Math.ceil(totalCount / pageSize)),
    pageSize,
    totalCount,
    refresh: () => setRefreshVersion((version) => version + 1),
  }
}
