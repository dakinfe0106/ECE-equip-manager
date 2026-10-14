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
    <div className="flex min-h-[73px] items-center justify-between gap-[18px] px-[18px] py-[15px] max-[700px]:flex-col max-[700px]:items-start">
      <div
        className="flex h-9 flex-[0_0_auto] items-center gap-[9px] text-[11px] leading-none text-[#707d90] max-[390px]:w-full max-[390px]:justify-between"
        aria-label="Showing active records"
      >
        <span>Show</span>
        <span
          className="flex h-9 min-w-[148px] items-center justify-between gap-[14px] rounded-[5px] border border-[#dce3ed] bg-white px-[15px] pr-[10px] text-[11px] leading-none text-[#455267]"
          aria-label="Active Records"
        >
          <span className="whitespace-nowrap">Active Records</span>
          <svg className="h-4 w-4 shrink-0 fill-none stroke-[#748198] stroke-[1.7] [stroke-linecap:round] [stroke-linejoin:round]" viewBox="0 0 16 16" aria-hidden="true">
            <path d="m4 6 4 4 4-4" />
          </svg>
        </span>
      </div>

      <form
        className="relative flex w-full min-w-[230px] max-w-[365px] items-center max-[700px]:min-w-0 max-[700px]:max-w-full"
        onSubmit={onSearch}
        noValidate
      >
        <label className="sr-only" htmlFor="asset-identifier">
          Asset ID
        </label>
        <span
          className="pointer-events-none absolute left-[10px] z-[2] grid h-[15px] w-[15px] place-items-center text-[#8491a3]"
          aria-hidden="true"
        >
          <svg className="w-[15px] fill-none stroke-current [stroke-linecap:round] stroke-[1.6]" viewBox="0 0 20 20" focusable="false">
            <circle cx="8.5" cy="8.5" r="5.5" />
            <path d="m13 13 4 4" />
          </svg>
        </span>
        <input
          id="asset-identifier"
          name="asset_identifier"
          type="search"
          className="h-9 w-full rounded-l-[6px] border border-r-0 border-[#dce3ed] bg-white py-0 pl-[34px] pr-[35px] text-[11px] text-[#354257] outline-none placeholder:text-[#9aa5b4] focus:z-[1] focus:border-[#4a88ec] focus:shadow-[0_0_0_3px_rgb(49_118_225_/_11%)] aria-invalid:border-[#d84d58]"
          value={assetIdentifier}
          maxLength={100}
          placeholder="Search Asset IDs..."
          disabled={isLoading}
          onChange={(event) => onAssetIdentifierChange(event.target.value)}
        />
        {assetIdentifier && (
          <button
            className="absolute right-[79px] z-[2] grid h-[25px] w-[25px] place-items-center border-0 bg-transparent text-[17px] text-[#8793a4] focus-visible:outline-2 focus-visible:outline-[#347ee9] focus-visible:outline-offset-[3px] disabled:cursor-wait disabled:opacity-[0.72]"
            type="button"
            aria-label="Clear Asset ID"
            disabled={isLoading}
            onClick={onClear}
          >
            ×
          </button>
        )}
        <button
          className="h-9 shrink-0 rounded-r-[6px] border border-[#276fdd] bg-[#2875e4] px-[14px] text-[11px] font-semibold text-white transition-colors hover:enabled:bg-[#1c64cc] focus-visible:outline-2 focus-visible:outline-[#347ee9] focus-visible:outline-offset-[3px] disabled:cursor-wait disabled:opacity-[0.72]"
          type="submit"
          disabled={isLoading}
        >
          {isLoading ? 'Loading…' : 'Search'}
        </button>
      </form>
    </div>
  )
}
