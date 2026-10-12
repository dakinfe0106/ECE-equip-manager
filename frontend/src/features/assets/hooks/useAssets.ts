import { useCallback, useEffect, useState } from 'react'
import { AssetLookupError, fetchAssets, type AssetRecord } from '../api'

const pageSize = 20

function getErrorMessage(error: unknown): string {
  if (error instanceof AssetLookupError && error.status === 403) {
    return 'You are not authorized to view assets. Sign in with your EMS account and try again.'
  }
  return 'Could not connect to equipment records. Please try again.'
}

export default function useAssets() {
  const [assets, setAssets] = useState<AssetRecord[]>([])
  const [totalCount, setTotalCount] = useState(0)
  const [currentPage, setCurrentPage] = useState(1)
  const [isLoading, setIsLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState('')

  const loadAssets = useCallback(async (page: number, search: string) => {
    setIsLoading(true)
    setErrorMessage('')

    try {
      const response = await fetchAssets(page, search)
      setAssets(response.results)
      setTotalCount(response.count)
      setCurrentPage(page)
    } catch (error) {
      setAssets([])
      setTotalCount(0)
      setErrorMessage(getErrorMessage(error))
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    let isCurrent = true
    fetchAssets()
      .then((response) => {
        if (isCurrent) {
          setAssets(response.results)
          setTotalCount(response.count)
        }
      })
      .catch((error: unknown) => {
        if (isCurrent) {
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
    assets,
    currentPage,
    errorMessage,
    isLoading,
    loadAssets,
    pageCount: Math.max(1, Math.ceil(totalCount / pageSize)),
    pageSize,
    totalCount,
  }
}
