import { useCallback, useEffect, useState } from 'react'
import {
  describeBorrowerError,
  fetchBorrowers,
  type BorrowerRecord,
} from '../api'

const pageSize = 20

export default function useBorrowers(page: number, search: string) {
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
  }, [page, search])

  const addBorrower = useCallback(
    (createdBorrower: BorrowerRecord) => {
      setResult((current) => {
        const base =
          current && current.page === page && current.search === search
            ? current
            : { borrowers: [], errorMessage: '', page, search, totalCount: 0 }
        return {
          ...base,
          borrowers: [
            createdBorrower,
            ...base.borrowers.filter(
              (item) => item.borrower_id !== createdBorrower.borrower_id,
            ),
          ].slice(0, pageSize),
          totalCount: base.totalCount + 1,
          errorMessage: '',
        }
      })
    },
    [page, search],
  )

  const current = result?.page === page && result.search === search ? result : null
  const borrowers = current?.borrowers ?? []
  const totalCount = current?.totalCount ?? 0

  return {
    addBorrower,
    borrowers,
    errorMessage: current?.errorMessage ?? '',
    isLoading: current === null,
    pageCount: Math.max(1, Math.ceil(totalCount / pageSize)),
    pageSize,
    totalCount,
  }
}
