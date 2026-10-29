import { useState, type FormEvent } from 'react'
import PageIntro from '../components/ui/PageIntro'
import Panel from '../components/ui/Panel'
import AssetArchiveToggle from '../features/assets/components/AssetArchiveToggle'
import AssetLoadError from '../features/assets/components/AssetLoadError'
import AssetPagination from '../features/assets/components/AssetPagination'
import AssetSearchToolbar from '../features/assets/components/AssetSearchToolbar'
import AssetTable from '../features/assets/components/AssetTable'
import AssetViewBy from '../features/assets/components/AssetViewBy'
import AddAssetAction from '../features/assets/components/AddAssetAction'
import AssetDetails from '../features/assets/components/AssetDetails'
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
    replaceAsset,
    retry,
    totalCount,
  } = useAssets()
  const selectedAsset = assets.find((asset) => asset.asset_id === selectedAssetId)

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
    <section
      className="mx-auto flex h-full min-h-0 w-full max-w-[1500px] flex-col px-[34px] pt-[34px] pb-[50px] max-[760px]:px-4 max-[760px]:pt-6 max-[760px]:pb-10"
      aria-labelledby="page-title"
    >
      <PageIntro
        title="Assets"
        description="Manage inventory and view equipment by category or equipment type."
        actions={
          <>
            <AssetViewBy />
            <AddAssetAction />
          </>
        }
      />

      <Panel className="flex min-h-0 flex-1 flex-col overflow-hidden" label="Asset search results">
        <AssetArchiveToggle />
        <AssetSearchToolbar
          assetIdentifier={assetIdentifier}
          isLoading={isLoading}
          onAssetIdentifierChange={setAssetIdentifier}
          onClear={clearSearch}
          onSearch={searchAssets}
        />

        {errorMessage && (
          <AssetLoadError
            isLoading={isLoading}
            message={errorMessage}
            onRetry={() => {
              setSelectedAssetId(null)
              void retry()
            }}
          />
        )}
        {isLoading && (
          <p
            className="mx-[17px] mt-[13px] mb-0 rounded-lg border border-primary/20 bg-primary-soft px-[11px] py-[9px] text-[11px] text-primary"
            role="status"
          >
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
      </Panel>
      {selectedAsset && (
        <AssetDetails
          key={selectedAsset.asset_id}
          asset={selectedAsset}
          onAssetUpdated={replaceAsset}
          onClose={() => setSelectedAssetId(null)}
        />
      )}
    </section>
  )
}
