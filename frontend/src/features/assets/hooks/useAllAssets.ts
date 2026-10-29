import { useCallback, useRef, useState } from 'react'
import { fetchAllAssets, type AssetRecord } from '../api'
import { getErrorMessage } from './useAssets'

// Every asset matching a search, for the Category and Equipment Type views.
export default function useAllAssets() {
  const [assets, setAssets] = useState<AssetRecord[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  // Only the latest request may update state, so switching views or searching quickly shows the newest result.
  const latestRequest = useRef({ id: 0, search: '' })

  const loadAllAssets = useCallback(async (search: string) => {
    const id = latestRequest.current.id + 1
    latestRequest.current = { id, search }
    setIsLoading(true)
    setErrorMessage('')

    try {
      const results = await fetchAllAssets(search)
      if (latestRequest.current.id === id) {
        setAssets(results)
      }
    } catch (error) {
      if (latestRequest.current.id === id) {
        setAssets([])
        setErrorMessage(getErrorMessage(error))
      }
    } finally {
      if (latestRequest.current.id === id) {
        setIsLoading(false)
      }
    }
  }, [])

  const retry = useCallback(
    () => loadAllAssets(latestRequest.current.search),
    [loadAllAssets],
  )

  const replaceAsset = useCallback((updatedAsset: AssetRecord) => {
    setAssets((currentAssets) =>
      currentAssets.map((asset) =>
        asset.asset_id === updatedAsset.asset_id ? updatedAsset : asset,
      ),
    )
  }, [])

  return { assets, errorMessage, isLoading, loadAllAssets, replaceAsset, retry }
}
