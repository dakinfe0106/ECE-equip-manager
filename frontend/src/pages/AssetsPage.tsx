import { useEffect, useState, type FormEvent } from 'react'
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
import AddAssetModal from '../features/assets/components/AddAssetModal'
import { fetchCategories, fetchEquipmentTypes, type AssetFilters, type AssetRecord, type CategoryOption, type EquipmentTypeOption } from '../features/assets/api'
import { groupAssets, type AssetView } from '../features/assets/groupAssets'
import useAllAssets from '../features/assets/hooks/useAllAssets'
import useAssets from '../features/assets/hooks/useAssets'

const groupNames = { category: ['category', 'categories'], type: ['equipment type', 'equipment types'] }

export default function AssetsPage() {
  const [assetIdentifier, setAssetIdentifier] = useState('')
  const [appliedSearch, setAppliedSearch] = useState('')
  const [filters, setFilters] = useState<AssetFilters>({})
  const [categories, setCategories] = useState<CategoryOption[]>([])
  const [equipmentTypes, setEquipmentTypes] = useState<EquipmentTypeOption[]>([])
  const [isLoadingOptions, setIsLoadingOptions] = useState(true)
  const [filterError, setFilterError] = useState('')
  // Bumped after a create, since the modal may have added a category or equipment type.
  const [optionsVersion, setOptionsVersion] = useState(0)
  const [isAddAssetOpen, setIsAddAssetOpen] = useState(false)
  const [createdAsset, setCreatedAsset] = useState<AssetRecord | null>(null)
  const [selectedAssetId, setSelectedAssetId] = useState<number | null>(null)
  const [view, setView] = useState<AssetView>('list')
  const list = useAssets()
  // The Category and Equipment Type views load every matching asset, not one page.
  const all = useAllAssets()
  const shown = view === 'list' ? list : all
  const groups = view === 'list' ? undefined : groupAssets(all.assets, view)
  const selectedAsset = shown.assets.find((asset) => asset.asset_id === selectedAssetId)

  useEffect(() => {
    let isCurrent = true
    Promise.all([fetchCategories(), fetchEquipmentTypes()])
      .then(([categoryOptions, typeOptions]) => {
        if (isCurrent) {
          setCategories(categoryOptions)
          setEquipmentTypes(typeOptions)
        }
      })
      .catch(() => {
        if (isCurrent) setFilterError('Could not load category and equipment type filters.')
      })
      .finally(() => {
        if (isCurrent) setIsLoadingOptions(false)
      })

    return () => {
      isCurrent = false
    }
  }, [optionsVersion])

  const load = (
    page: number,
    search = appliedSearch,
    selectedFilters = filters,
    nextView = view,
  ) => {
    setSelectedAssetId(null)
    setCreatedAsset(null)
    if (nextView === 'list') {
      void list.loadAssets(page, search, selectedFilters)
    } else {
      void all.loadAllAssets(search, selectedFilters)
    }
  }

  const changeView = (nextView: AssetView) => {
    // Category and Equipment Type group the same assets, so switching between them needs no request.
    if (nextView === view || (nextView !== 'list' && view !== 'list')) {
      setView(nextView)
      return
    }
    setView(nextView)
    load(1, appliedSearch, filters, nextView)
  }

  const searchAssets = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const trimmedSearch = assetIdentifier.trim()
    setAppliedSearch(trimmedSearch)
    load(1, trimmedSearch)
  }

  const clearSearch = () => {
    setAssetIdentifier('')
    setAppliedSearch('')
    load(1, '')
  }

  const applyFilters = (nextFilters: AssetFilters) => {
    setFilters(nextFilters)
    load(1, appliedSearch, nextFilters)
  }

  const resetFilters = () => {
    setFilters({})
    load(1, appliedSearch, {})
  }

  // Keeps the user's page, search, and filters, and keeps the new asset visible.
  const handleAssetCreated = (asset: AssetRecord) => {
    setIsAddAssetOpen(false)
    setSelectedAssetId(null)
    setCreatedAsset(asset)
    setOptionsVersion((version) => version + 1)
    list.addAsset(asset)
    if (view !== 'list') {
      void all.loadAllAssets(appliedSearch, filters)
    }
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
            <AddAssetAction onClick={() => setIsAddAssetOpen(true)} />
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
          categories={categories}
          equipmentTypes={equipmentTypes}
          filters={filters}
          isLoadingOptions={isLoadingOptions}
          filterError={filterError}
          onApplyFilters={applyFilters}
          onResetFilters={resetFilters}
        />

        {createdAsset && (
          <div
            className="mx-[17px] mt-[13px] flex items-center justify-between gap-3 rounded-lg border border-success/20 bg-success-soft px-[11px] py-[7px] text-[11px] text-success"
            role="status"
          >
            <span>Asset {createdAsset.asset_identifier} was added successfully.</span>
            <button
              className="shrink-0 rounded-md px-2 py-1 font-[650] hover:underline focus-visible:outline-2 focus-visible:outline-primary"
              type="button"
              onClick={() => setSelectedAssetId(createdAsset.asset_id)}
            >
              View asset
            </button>
          </div>
        )}

        {shown.errorMessage && (
          <AssetLoadError
            isLoading={shown.isLoading}
            message={shown.errorMessage}
            onRetry={() => {
              setSelectedAssetId(null)
              setCreatedAsset(null)
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
          hasActiveFilters={Boolean(filters.categoryId || filters.equipmentTypeId)}
          onSelectAsset={setSelectedAssetId}
          selectedAssetId={selectedAssetId}
        />
        {view === 'list' ? (
          <AssetPagination
            currentPage={list.currentPage}
            isLoading={list.isLoading}
            onPageChange={(page) => load(page)}
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
      {isAddAssetOpen && (
        <AddAssetModal
          onClose={() => setIsAddAssetOpen(false)}
          onCreated={handleAssetCreated}
        />
      )}
    </section>
  )
}
