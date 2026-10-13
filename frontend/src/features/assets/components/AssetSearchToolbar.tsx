import type { FormEvent } from 'react'

interface AssetSearchToolbarProps {
  assetIdentifier: string
  isLoading: boolean
  onAssetIdentifierChange: (value: string) => void
  onClear: () => void
  onSearch: (event: FormEvent<HTMLFormElement>) => void
}

export default function AssetSearchToolbar({
  assetIdentifier,
  isLoading,
  onAssetIdentifierChange,
  onClear,
  onSearch,
}: AssetSearchToolbarProps) {
  return (
    <div className="panel-toolbar">
      <div className="record-filter" aria-label="Showing active records">
        <span>Show</span>
        <span className="filter-select" aria-label="Active Records">
          <span className="filter-label">Active Records</span>
          <svg className="filter-chevron" viewBox="0 0 16 16" aria-hidden="true">
            <path d="m4 6 4 4 4-4" />
          </svg>
        </span>
      </div>

      <form className="search-form" onSubmit={onSearch} noValidate>
        <label className="visually-hidden" htmlFor="asset-identifier">
          Asset ID
        </label>
        <span className="search-icon" aria-hidden="true">
          <svg viewBox="0 0 20 20" focusable="false">
            <circle cx="8.5" cy="8.5" r="5.5" />
            <path d="m13 13 4 4" />
          </svg>
        </span>
        <input
          id="asset-identifier"
          name="asset_identifier"
          type="search"
          value={assetIdentifier}
          maxLength={100}
          placeholder="Search Asset IDs..."
          disabled={isLoading}
          onChange={(event) => onAssetIdentifierChange(event.target.value)}
        />
        {assetIdentifier && (
          <button
            className="clear-search"
            type="button"
            aria-label="Clear Asset ID"
            disabled={isLoading}
            onClick={onClear}
          >
            ×
          </button>
        )}
        <button className="search-button" type="submit" disabled={isLoading}>
          {isLoading ? 'Loading…' : 'Search'}
        </button>
      </form>
    </div>
  )
}
