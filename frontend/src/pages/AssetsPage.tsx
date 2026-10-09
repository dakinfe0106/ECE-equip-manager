import { useState, type FormEvent } from 'react'
import AssetPagination from '../features/assets/components/AssetPagination'
import AssetSearchToolbar from '../features/assets/components/AssetSearchToolbar'
import AssetTable from '../features/assets/components/AssetTable'
import AddAssetAction from '../features/assets/components/AddAssetAction'
import useAssets from '../features/assets/hooks/useAssets'

export default function AssetsPage() {
  const [assetIdentifier, setAssetIdentifier] = useState('')
  const [appliedSearch, setAppliedSearch] = useState('')
  const [selectedAssetId, setSelectedAssetId] = useState<number | null>(null)
  const {
    assets,
    currentPage,
    errorMessage,
    isLoading,
    loadAssets,
    pageCount,
    pageSize,
    totalCount,
  } = useAssets()

  const loadPage = (page: number, search = appliedSearch) => {
    setSelectedAssetId(null)
    void loadAssets(page, search)
  }

  const searchAssets = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const trimmedIdentifier = assetIdentifier.trim()
    setAppliedSearch(trimmedIdentifier)
    loadPage(1, trimmedIdentifier)
  }

  const clearSearch = () => {
    setAssetIdentifier('')
    setAppliedSearch('')
    loadPage(1, '')
  }

  return (
    <section className="page-content" aria-labelledby="page-title">
      <div className="page-heading">
        <div>
          <h1 id="page-title">Assets</h1>
        </div>
        <AddAssetAction />
      </div>

      <section className="asset-panel" aria-label="Asset search results">
        <AssetSearchToolbar
          assetIdentifier={assetIdentifier}
          isLoading={isLoading}
          onAssetIdentifierChange={setAssetIdentifier}
          onClear={clearSearch}
          onSearch={searchAssets}
        />

        {errorMessage && (
          <p className="inline-message message-error" role="alert">
            {errorMessage}
          </p>
        )}
        {isLoading && (
          <p className="inline-message message-loading" role="status">
            Loading equipment records…
          </p>
        )}

        <AssetTable
          appliedSearch={appliedSearch}
          assets={assets}
          errorMessage={errorMessage}
          isLoading={isLoading}
          onSelectAsset={setSelectedAssetId}
          selectedAssetId={selectedAssetId}
        />
        <AssetPagination
          currentPage={currentPage}
          isLoading={isLoading}
          onPageChange={(page) => loadPage(page)}
          pageCount={pageCount}
          pageSize={pageSize}
          totalCount={totalCount}
        />
      </section>
    </section>
  )
}
