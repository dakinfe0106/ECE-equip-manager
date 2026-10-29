import { useCallback, useEffect, useRef, useState } from 'react'
import { AssetLookupError, fetchAssets, type AssetRecord } from '../api'

const pageSize = 20

function getErrorMessage(error: unknown): string {
  if (error instanceof AssetLookupError) {
    return error.status === 403
      ? 'Your account does not have permission to view assets.'
      : error.message
  }
  return 'Could not connect to equipment records. Check that the server is running and try again.'
}

export default function useAssets() {
  const [assets, setAssets] = useState<AssetRecord[]>([])
  const [totalCount, setTotalCount] = useState(0)
  const [currentPage, setCurrentPage] = useState(1)
  const [isLoading, setIsLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState('')
  // The page and search of the latest request, so a failed load can be retried as-is.
  const lastRequest = useRef({ page: 1, search: '' })

  const loadAssets = useCallback(async (page: number, search: string) => {
    lastRequest.current = { page, search }
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

  const retry = useCallback(
    () => loadAssets(lastRequest.current.page, lastRequest.current.search),
    [loadAssets],
  )

  const replaceAsset = useCallback((updatedAsset: AssetRecord) => {
    setAssets((currentAssets) =>
      currentAssets.map((asset) =>
        asset.asset_id === updatedAsset.asset_id ? updatedAsset : asset,
      ),
    )
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
    replaceAsset,
    retry,
    totalCount,
  }
}
