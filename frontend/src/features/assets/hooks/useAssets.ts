import { useCallback, useEffect, useRef, useState } from 'react'
import {
  AssetLookupError,
  fetchAssets,
  type AssetFilters,
  type AssetRecord,
} from '../api'

const pageSize = 20

function getErrorMessage(error: unknown): string {
  if (error instanceof AssetLookupError && error.status === 403) {
    return 'Your account does not have permission to view assets.'
  }
  return 'Could not connect to equipment records. Please try again.'
}

export default function useAssets() {
  const [assets, setAssets] = useState<AssetRecord[]>([])
  const [totalCount, setTotalCount] = useState(0)
  const [currentPage, setCurrentPage] = useState(1)
  const [isLoading, setIsLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState('')
  const latestRequestId = useRef(0)

  const loadAssets = useCallback(async (
    page: number,
    search: string,
    filters: AssetFilters = {},
  ) => {
    const requestId = latestRequestId.current + 1
    latestRequestId.current = requestId
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

  const replaceAsset = useCallback((updatedAsset: AssetRecord) => {
    setAssets((currentAssets) =>
      currentAssets.map((asset) =>
        asset.asset_id === updatedAsset.asset_id ? updatedAsset : asset,
      ),
    )
  }, [])

  const addAsset = useCallback((asset: AssetRecord) => {
    setAssets((currentAssets) => [
      asset,
      ...currentAssets.filter((currentAsset) => currentAsset.asset_id !== asset.asset_id),
    ].slice(0, pageSize))
    setTotalCount((currentCount) => currentCount + 1)
    setCurrentPage(1)
    setErrorMessage('')
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
    assets,
    currentPage,
    addAsset,
    errorMessage,
    isLoading,
    loadAssets,
    pageCount: Math.max(1, Math.ceil(totalCount / pageSize)),
    pageSize,
    replaceAsset,
    totalCount,
  }
}
