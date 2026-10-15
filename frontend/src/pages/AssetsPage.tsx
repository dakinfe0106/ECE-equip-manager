import { useState, type FormEvent } from 'react'
import AssetPagination from '../features/assets/components/AssetPagination'
import AssetSearchToolbar from '../features/assets/components/AssetSearchToolbar'
import AssetTable from '../features/assets/components/AssetTable'
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
      className="mx-auto flex h-full min-h-0 w-full max-w-[1440px] flex-col px-[34px] pb-[42px] pt-[31px] max-[980px]:px-6 max-[700px]:px-[14px] max-[700px]:pb-[30px] max-[700px]:pt-6"
      aria-labelledby="page-title"
    >
      <div className="mb-6 flex items-end justify-between gap-5 max-[700px]:items-start">
        <div>
          <h1
            className="m-0 text-[25px] font-[690] leading-[1.25] tracking-[-0.55px] text-[#1f2b3e]"
            id="page-title"
          >
            Assets
          </h1>
        </div>
        <AddAssetAction />
      </div>

      <section
        className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-[9px] border border-[#e0e6ef] bg-white shadow-[0_3px_12px_rgb(29_49_77_/_4%)]"
        aria-label="Asset search results"
      >
        <AssetSearchToolbar
          assetIdentifier={assetIdentifier}
          isLoading={isLoading}
          onAssetIdentifierChange={setAssetIdentifier}
          onClear={clearSearch}
          onSearch={searchAssets}
        />

        {errorMessage && (
          <p
            className="mx-[18px] mb-[13px] rounded-[5px] border border-[#f3d0d2] bg-[#fff5f5] px-[11px] py-[9px] text-[11px] text-[#a5333b]"
            role="alert"
          >
            {errorMessage}
          </p>
        )}
        {isLoading && (
          <p
            className="mx-[18px] mb-[13px] rounded-[5px] border border-[#d5e4fb] bg-[#f3f8ff] px-[11px] py-[9px] text-[11px] text-[#315f9f]"
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
      </section>
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
