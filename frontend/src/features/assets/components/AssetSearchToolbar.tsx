import { useEffect, useRef, useState, type FormEvent } from 'react'
import type { AssetFilters, CategoryOption, EquipmentTypeOption } from '../api'

interface AssetSearchToolbarProps {
  assetIdentifier: string
  isLoading: boolean
  onAssetIdentifierChange: (value: string) => void
  onClear: () => void
  onSearch: (event: FormEvent<HTMLFormElement>) => void
  categories: CategoryOption[]
  equipmentTypes: EquipmentTypeOption[]
  filters: AssetFilters
  isLoadingOptions: boolean
  filterError: string
  onApplyFilters: (filters: AssetFilters) => void
  onResetFilters: () => void
}

export default function AssetSearchToolbar({
  assetIdentifier,
  isLoading,
  onAssetIdentifierChange,
  onClear,
  onSearch,
  categories,
  equipmentTypes,
  filters,
  isLoadingOptions,
  filterError,
  onApplyFilters,
  onResetFilters,
}: AssetSearchToolbarProps) {
  const [isFilterOpen, setIsFilterOpen] = useState(false)
  const filterMenuRef = useRef<HTMLDivElement>(null)
  const filterTriggerRef = useRef<HTMLButtonElement>(null)
  const [categoryId, setCategoryId] = useState('')
  const [equipmentTypeId, setEquipmentTypeId] = useState('')
  const selectedCategoryId = categoryId ? Number(categoryId) : null
  const availableTypes = selectedCategoryId
    ? equipmentTypes.filter((type) => type.category_id === selectedCategoryId)
    : equipmentTypes
  const activeFilterCount = Number(Boolean(filters.categoryId)) + Number(Boolean(filters.equipmentTypeId))

  function openFilters() {
    setCategoryId(filters.categoryId?.toString() ?? '')
    setEquipmentTypeId(filters.equipmentTypeId?.toString() ?? '')
    setIsFilterOpen(true)
  }

  // While the panel is open: focus its first control, and close it on Escape or an outside click.
  useEffect(() => {
    if (!isFilterOpen) return
    filterMenuRef.current?.querySelector<HTMLElement>('[role="dialog"] select')?.focus()

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsFilterOpen(false)
        filterTriggerRef.current?.focus()
      }
    }
    function handlePointerDown(event: MouseEvent) {
      if (!filterMenuRef.current?.contains(event.target as Node)) setIsFilterOpen(false)
    }

    document.addEventListener('keydown', handleKeyDown)
    document.addEventListener('mousedown', handlePointerDown)
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.removeEventListener('mousedown', handlePointerDown)
    }
  }, [isFilterOpen])

  function resetFilters() {
    setCategoryId('')
    setEquipmentTypeId('')
    onResetFilters()
    setIsFilterOpen(false)
  }

  return (
    <div className="flex min-h-[66px] items-center justify-between gap-[18px] border-b border-divider px-[17px] py-[14px] max-[520px]:flex-col max-[520px]:items-stretch max-[520px]:gap-[10px]">
      <form
        className="flex w-[min(300px,48%)] items-center gap-2 rounded-lg border border-line bg-page px-[11px] text-subtle focus-within:border-primary focus-within:shadow-[0_0_0_3px_var(--color-primary-soft)] max-[520px]:w-full"
        role="search"
        onSubmit={onSearch}
        noValidate
      >
        <label className="sr-only" htmlFor="asset-identifier">
          Search assets
        </label>
        <svg className="h-4 w-4 shrink-0 fill-none stroke-current stroke-[1.8] [stroke-linecap:round]" viewBox="0 0 24 24" aria-hidden="true">
          <circle cx="11" cy="11" r="7" />
          <path d="m20 20-4-4" />
        </svg>
        <input
          id="asset-identifier"
          name="asset_identifier"
          type="search"
          className="w-full border-0 bg-transparent py-[9px] text-[11px] text-body outline-none placeholder:text-subtle [&::-webkit-search-cancel-button]:hidden"
          value={assetIdentifier}
          maxLength={100}
          placeholder="Search asset ID or name..."
          disabled={isLoading}
          onChange={(event) => onAssetIdentifierChange(event.target.value)}
        />
        {assetIdentifier && (
          <button
            className="grid h-5 w-5 shrink-0 place-items-center text-[16px] leading-none text-subtle hover:text-body focus-visible:outline-2 focus-visible:outline-primary disabled:cursor-wait"
            type="button"
            aria-label="Clear search"
            disabled={isLoading}
            onClick={onClear}
          >
            ×
          </button>
        )}
        <button className="sr-only" type="submit" disabled={isLoading}>
          Search
        </button>
      </form>

      <div className="relative" ref={filterMenuRef}>
        <button
          ref={filterTriggerRef}
          className="flex min-h-9 items-center gap-[7px] rounded-lg border border-input bg-white px-[10px] text-[10px] font-[650] text-body disabled:cursor-not-allowed disabled:opacity-60"
          type="button"
          disabled={isLoadingOptions}
          aria-expanded={isFilterOpen}
          aria-haspopup="dialog"
          onClick={isFilterOpen ? () => setIsFilterOpen(false) : openFilters}
        >
          <svg className="h-[15px] w-[15px] fill-none stroke-current stroke-[1.8] [stroke-linecap:round] [stroke-linejoin:round]" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M4 5h16l-6 7v5l-4 2v-7z" />
          </svg>
          Filters
          <span className="rounded-full bg-neutral-soft px-[5px] py-[2px] text-[8px] text-muted">{activeFilterCount || 'All'}</span>
        </button>
        {isFilterOpen && (
          <section
            className="absolute right-0 z-20 mt-2 w-[min(320px,calc(100vw-32px))] rounded-lg border border-line bg-white p-4 shadow-lg"
            role="dialog"
            aria-label="Filter assets"
          >
            <div className="mb-3 flex items-center justify-between">
              <h2 className="m-0 text-sm font-semibold text-body">Filter assets</h2>
              <button
                className="rounded px-2 py-1 text-subtle hover:bg-page focus-visible:outline-2 focus-visible:outline-primary"
                type="button"
                aria-label="Close filters"
                onClick={() => setIsFilterOpen(false)}
              >×</button>
            </div>
            <label className="mb-3 flex flex-col gap-1 text-xs font-medium text-body">
              Category
              <select
                className="min-h-9 rounded-md border border-input bg-white px-2 text-xs"
                value={categoryId}
                onChange={(event) => {
                  setCategoryId(event.target.value)
                  setEquipmentTypeId('')
                }}
              >
                <option value="">All categories</option>
                {categories.map((category) => (
                  <option key={category.category_id} value={category.category_id}>{category.name}</option>
                ))}
              </select>
            </label>
            <label className="mb-4 flex flex-col gap-1 text-xs font-medium text-body">
              Equipment type
              <select
                className="min-h-9 rounded-md border border-input bg-white px-2 text-xs"
                value={equipmentTypeId}
                onChange={(event) => setEquipmentTypeId(event.target.value)}
              >
                <option value="">All equipment types</option>
                {availableTypes.map((type) => (
                  <option key={type.type_id} value={type.type_id}>{type.name}</option>
                ))}
              </select>
            </label>
            {filterError && <p className="mb-3 text-xs text-danger" role="alert">{filterError}</p>}
            <div className="flex justify-between gap-2">
              <button className="rounded-md px-2 py-2 text-xs font-medium text-primary hover:bg-primary-soft" type="button" onClick={resetFilters}>
                Reset
              </button>
              <button
                className="rounded-md bg-primary px-3 py-2 text-xs font-semibold text-white hover:bg-primary-hover"
                type="button"
                onClick={() => {
                  onApplyFilters({
                    categoryId: categoryId ? Number(categoryId) : null,
                    equipmentTypeId: equipmentTypeId ? Number(equipmentTypeId) : null,
                  })
                  setIsFilterOpen(false)
                }}
              >
                Apply filters
              </button>
            </div>
          </section>
        )}
      </div>
    </div>
  )
}
