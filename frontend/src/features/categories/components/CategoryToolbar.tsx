import type { FormEvent } from 'react'
import { showOptions, type DeletedFilter } from '../api'

interface CategoryToolbarProps {
  show: DeletedFilter
  searchText: string
  isLoading: boolean
  onShowChange: (value: DeletedFilter) => void
  onSearchTextChange: (value: string) => void
  onSearch: (event: FormEvent<HTMLFormElement>) => void
  onClear: () => void
}

export default function CategoryToolbar({
  show,
  searchText,
  isLoading,
  onShowChange,
  onSearchTextChange,
  onSearch,
  onClear,
}: CategoryToolbarProps) {
  return (
    <div className="flex min-h-[73px] items-center justify-between gap-[18px] px-[18px] py-[15px] max-[700px]:flex-col max-[700px]:items-start">
      <label className="flex h-9 flex-[0_0_auto] items-center gap-[9px] text-[11px] leading-none text-[#707d90] max-[390px]:w-full max-[390px]:justify-between">
        <span>Show:</span>
        <select
          className="h-9 min-w-[148px] rounded-[5px] border border-[#dce3ed] bg-white px-[10px] text-[11px]! leading-none text-[#455267] outline-none focus:border-[#4a88ec] focus:shadow-[0_0_0_3px_rgb(49_118_225_/_11%)]"
          value={show}
          onChange={(event) => onShowChange(event.target.value as DeletedFilter)}
        >
          {showOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>

      <form
        className="relative flex w-full min-w-[230px] max-w-[365px] items-center max-[700px]:min-w-0 max-[700px]:max-w-full"
        onSubmit={onSearch}
        noValidate
      >
        <label className="sr-only" htmlFor="category-search">
          Search categories
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
          id="category-search"
          name="search"
          type="search"
          className="h-9 w-full rounded-l-[6px] border border-r-0 border-[#dce3ed] bg-white py-0 pl-[34px] pr-[35px] text-[11px]! text-[#354257] outline-none placeholder:text-[#9aa5b4] focus:z-[1] focus:border-[#4a88ec] focus:shadow-[0_0_0_3px_rgb(49_118_225_/_11%)]"
          value={searchText}
          maxLength={255}
          placeholder="Search categories..."
          onChange={(event) => onSearchTextChange(event.target.value)}
        />
        {searchText && (
          <button
            className="absolute right-[79px] z-[2] grid h-[25px] w-[25px] place-items-center border-0 bg-transparent text-[17px]! text-[#8793a4] focus-visible:outline-2 focus-visible:outline-[#347ee9] focus-visible:outline-offset-[3px]"
            type="button"
            aria-label="Clear search"
            onClick={onClear}
          >
            ×
          </button>
        )}
        <button
          className="h-9 shrink-0 rounded-r-[6px] border border-[#276fdd] bg-[#2875e4] px-[14px] text-[11px]! font-semibold! text-white transition-colors hover:enabled:bg-[#1c64cc] focus-visible:outline-2 focus-visible:outline-[#347ee9] focus-visible:outline-offset-[3px] disabled:cursor-wait disabled:opacity-[0.72]"
          type="submit"
          disabled={isLoading}
        >
          {isLoading ? 'Loading…' : 'Search'}
        </button>
      </form>
    </div>
  )
}
