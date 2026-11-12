import { useCallback, useEffect, useRef, useState } from 'react'
import {
  AssetLookupError,
  fetchAssets,
  type AssetFilters,
  type AssetRecord,
} from '../api'

const pageSize = 20

export function getErrorMessage(error: unknown): string {
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
  const latestRequestId = useRef(0)
  // The page, search, and filters of the latest request, so a failed load can be retried as-is.
  const lastRequest = useRef<{ page: number; search: string; filters: AssetFilters }>({
    page: 1,
    search: '',
    filters: {},
  })

  const loadAssets = useCallback(async (
    page: number,
    search: string,
    filters: AssetFilters = {},
  ) => {
    const requestId = latestRequestId.current + 1
    latestRequestId.current = requestId
    lastRequest.current = { page, search, filters }
    setIsLoading(true)
    setErrorMessage('')

    try {
      const response = await fetchAssets(page, search, filters)
      if (requestId !== latestRequestId.current) return
      setAssets(response.results)
      setTotalCount(response.count)
      setCurrentPage(page)
    } catch (error) {
      if (requestId !== latestRequestId.current) return
      setAssets([])
      setTotalCount(0)
      setErrorMessage(getErrorMessage(error))
    } finally {
      if (requestId === latestRequestId.current) setIsLoading(false)
    }
  }, [])

  const retry = useCallback(
    () => loadAssets(lastRequest.current.page, lastRequest.current.search, lastRequest.current.filters),
    [loadAssets],
  )

  const replaceAsset = useCallback((updatedAsset: AssetRecord) => {
    setAssets((currentAssets) =>
      currentAssets.map((asset) =>
        asset.asset_id === updatedAsset.asset_id ? updatedAsset : asset,
      ),
    )
  }, [])

  // Shows a just-created asset at the top of the current page, so it stays visible even though
  // the API (ordered by asset_id) would list it on the last page. The next load restores API order.
  const addAsset = useCallback((createdAsset: AssetRecord) => {
    latestRequestId.current += 1
    setAssets((currentAssets) => [
      createdAsset,
      ...currentAssets.filter((asset) => asset.asset_id !== createdAsset.asset_id),
    ].slice(0, pageSize))
    setTotalCount((count) => count + 1)
    setErrorMessage('')
    setIsLoading(false)
  }, [])

  useEffect(() => {
    const requestId = latestRequestId.current + 1
    latestRequestId.current = requestId
    fetchAssets()
      .then((response) => {
        if (requestId === latestRequestId.current) {
          setAssets(response.results)
          setTotalCount(response.count)
        }
      })
      .catch((error: unknown) => {
        if (requestId === latestRequestId.current) {
          setErrorMessage(getErrorMessage(error))
        }
      })
      .finally(() => {
        if (requestId === latestRequestId.current) setIsLoading(false)
      })

    return () => {
      if (requestId === latestRequestId.current) latestRequestId.current += 1
    }
  }, [])

  return {
    addAsset,
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
