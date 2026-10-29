import { useEffect, useState, type FormEvent } from 'react'
import PageIntro from '../components/ui/PageIntro'
import Panel from '../components/ui/Panel'
import AssetArchiveToggle from '../features/assets/components/AssetArchiveToggle'
import AssetPagination from '../features/assets/components/AssetPagination'
import AssetSearchToolbar from '../features/assets/components/AssetSearchToolbar'
import AssetTable from '../features/assets/components/AssetTable'
import AssetViewBy from '../features/assets/components/AssetViewBy'
import AddAssetAction from '../features/assets/components/AddAssetAction'
import AssetDetails from '../features/assets/components/AssetDetails'
import AddAssetModal from '../features/assets/components/AddAssetModal'
import { fetchCategories, fetchEquipmentTypes, type AssetFilters, type AssetRecord, type CategoryOption, type EquipmentTypeOption } from '../features/assets/api'
import useAssets from '../features/assets/hooks/useAssets'

export default function AssetsPage() {
  const [assetIdentifier, setAssetIdentifier] = useState('')
  const [appliedSearch, setAppliedSearch] = useState('')
  const [filters, setFilters] = useState<AssetFilters>({})
  const [categories, setCategories] = useState<CategoryOption[]>([])
  const [equipmentTypes, setEquipmentTypes] = useState<EquipmentTypeOption[]>([])
  const [isLoadingOptions, setIsLoadingOptions] = useState(true)
  const [filterError, setFilterError] = useState('')
  const [isAddAssetOpen, setIsAddAssetOpen] = useState(false)
  const [successMessage, setSuccessMessage] = useState('')
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
  }, [])

  const loadPage = (page: number, search = appliedSearch, selectedFilters = filters) => {
    setSelectedAssetId(null)
    setSuccessMessage('')
    void loadAssets(page, search, selectedFilters)
  }

  const searchAssets = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const trimmedIdentifier = assetIdentifier.trim()
    setAppliedSearch(trimmedIdentifier)
    loadPage(1, trimmedIdentifier, filters)
  }

  const clearSearch = () => {
    setAssetIdentifier('')
    setAppliedSearch('')
    loadPage(1, '', filters)
  }

  const applyFilters = (nextFilters: AssetFilters) => {
    setFilters(nextFilters)
    loadPage(1, appliedSearch, nextFilters)
  }

  const resetFilters = () => {
    setFilters({})
    loadPage(1, appliedSearch, {})
  }

  const handleAssetCreated = (asset: AssetRecord) => {
    setIsAddAssetOpen(false)
    setAssetIdentifier('')
    setAppliedSearch('')
    setFilters({})
    setSelectedAssetId(null)
    setSuccessMessage(`Asset ${asset.asset_identifier} was added successfully.`)
    void loadAssets(currentPage, '', {})
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
            <AddAssetAction onClick={() => setIsAddAssetOpen(true)} />
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
          categories={categories}
          equipmentTypes={equipmentTypes}
          filters={filters}
          isLoadingOptions={isLoadingOptions}
          filterError={filterError}
          onApplyFilters={applyFilters}
          onResetFilters={resetFilters}
        />

        {successMessage && (
          <p className="mx-[17px] mt-[13px] mb-0 rounded-lg border border-success/20 bg-success-soft px-[11px] py-[9px] text-[11px] text-success" role="status">
            {successMessage}
          </p>
        )}

        {errorMessage && (
          <p
            className="mx-[17px] mt-[13px] mb-0 rounded-lg border border-danger/20 bg-danger-soft px-[11px] py-[9px] text-[11px] text-danger"
            role="alert"
          >
            {errorMessage}
          </p>
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
          hasActiveFilters={Boolean(filters.categoryId || filters.equipmentTypeId)}
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
      {isAddAssetOpen && (
        <AddAssetModal
          onClose={() => setIsAddAssetOpen(false)}
          onCreated={handleAssetCreated}
        />
      )}
    </section>
  )
}
