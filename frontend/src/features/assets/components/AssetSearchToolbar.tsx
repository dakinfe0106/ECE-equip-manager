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
    <div className="flex min-h-[66px] items-center justify-between gap-[18px] border-b border-divider px-[17px] py-[14px] max-[520px]:flex-col max-[520px]:items-stretch max-[520px]:gap-[10px]">
      <form
        className="flex w-[min(300px,48%)] items-center gap-2 rounded-lg border border-line bg-page px-[11px] text-subtle focus-within:border-primary focus-within:shadow-[0_0_0_3px_var(--color-primary-soft)] max-[520px]:w-full"
        role="search"
        onSubmit={onSearch}
        noValidate
      >
        <label className="sr-only" htmlFor="asset-identifier">
          Asset ID
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
          placeholder="Search Asset IDs..."
          disabled={isLoading}
          onChange={(event) => onAssetIdentifierChange(event.target.value)}
        />
        {assetIdentifier && (
          <button
            className="grid h-5 w-5 shrink-0 place-items-center text-[16px] leading-none text-subtle hover:text-body focus-visible:outline-2 focus-visible:outline-primary disabled:cursor-wait"
            type="button"
            aria-label="Clear Asset ID"
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

      <button
        className="flex min-h-9 items-center gap-[7px] rounded-lg border border-input bg-white px-[10px] text-[10px] font-[650] text-body disabled:cursor-not-allowed disabled:opacity-60"
        type="button"
        disabled
        title="Filtering is not available yet"
      >
        <svg className="h-[15px] w-[15px] fill-none stroke-current stroke-[1.8] [stroke-linecap:round] [stroke-linejoin:round]" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M4 5h16l-6 7v5l-4 2v-7z" />
        </svg>
        Filters
        <span className="rounded-full bg-neutral-soft px-[5px] py-[2px] text-[8px] text-muted">All</span>
      </button>
    </div>
  )
}
