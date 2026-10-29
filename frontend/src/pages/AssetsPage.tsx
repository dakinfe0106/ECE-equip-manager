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
import type { AssetRecord } from '../features/assets/api'
import { groupAssets, type AssetView } from '../features/assets/groupAssets'
import useAllAssets from '../features/assets/hooks/useAllAssets'
import useAssets from '../features/assets/hooks/useAssets'

const groupNames = { category: ['category', 'categories'], type: ['equipment type', 'equipment types'] }

export default function AssetsPage() {
  const [assetIdentifier, setAssetIdentifier] = useState('')
  const [appliedSearch, setAppliedSearch] = useState('')
  const [selectedAssetId, setSelectedAssetId] = useState<number | null>(null)
  const [view, setView] = useState<AssetView>('list')
  const list = useAssets()
  // The Category and Equipment Type views load every matching asset, not one page.
  const all = useAllAssets()
  const shown = view === 'list' ? list : all
  const groups = view === 'list' ? undefined : groupAssets(all.assets, view)
  const selectedAsset = shown.assets.find((asset) => asset.asset_id === selectedAssetId)

  const load = (page: number, search: string, nextView = view) => {
    setSelectedAssetId(null)
    if (nextView === 'list') {
      void list.loadAssets(page, search)
    } else {
      void all.loadAllAssets(search)
    }
  }

  const changeView = (nextView: AssetView) => {
    // Category and Equipment Type group the same assets, so switching between them needs no request.
    if (nextView === view || (nextView !== 'list' && view !== 'list')) {
      setView(nextView)
      return
    }
    setView(nextView)
    load(1, appliedSearch, nextView)
  }

  const searchAssets = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const trimmedIdentifier = assetIdentifier.trim()
    setAppliedSearch(trimmedIdentifier)
    load(1, trimmedIdentifier)
  }

  const clearSearch = () => {
    setAssetIdentifier('')
    setAppliedSearch('')
    load(1, '')
  }

  const replaceAsset = (updatedAsset: AssetRecord) => {
    list.replaceAsset(updatedAsset)
    all.replaceAsset(updatedAsset)
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
            <AssetViewBy value={view} onChange={changeView} />
            <AddAssetAction />
          </>
        }
      />

      <Panel className="flex min-h-0 flex-1 flex-col overflow-hidden" label="Asset search results">
        <AssetArchiveToggle />
        <AssetSearchToolbar
          assetIdentifier={assetIdentifier}
          isLoading={shown.isLoading}
          onAssetIdentifierChange={setAssetIdentifier}
          onClear={clearSearch}
          onSearch={searchAssets}
        />

        {shown.errorMessage && (
          <AssetLoadError
            isLoading={shown.isLoading}
            message={shown.errorMessage}
            onRetry={() => {
              setSelectedAssetId(null)
              void shown.retry()
            }}
          />
        )}
        {shown.isLoading && (
          <p
            className="mx-[17px] mt-[13px] mb-0 rounded-lg border border-primary/20 bg-primary-soft px-[11px] py-[9px] text-[11px] text-primary"
            role="status"
          >
            Loading equipment records…
          </p>
        )}

        <AssetTable
          appliedSearch={appliedSearch}
          assets={shown.assets}
          errorMessage={shown.errorMessage}
          groups={groups}
          isLoading={shown.isLoading}
          onSelectAsset={setSelectedAssetId}
          selectedAssetId={selectedAssetId}
        />
        {view === 'list' ? (
          <AssetPagination
            currentPage={list.currentPage}
            isLoading={list.isLoading}
            onPageChange={(page) => load(page, appliedSearch)}
            pageCount={list.pageCount}
            pageSize={list.pageSize}
            totalCount={list.totalCount}
          />
        ) : (
          <p className="m-0 flex min-h-[54px] items-center border-t border-divider px-[17px] text-[10px] text-muted">
            {all.assets.length === 0
              ? 'No assets'
              : `Showing ${all.assets.length} ${all.assets.length === 1 ? 'asset' : 'assets'} in ${groups?.length} ${
                  groupNames[view][groups?.length === 1 ? 0 : 1]
                }`}
          </p>
        )}
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
