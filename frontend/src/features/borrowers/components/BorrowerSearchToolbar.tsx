import type { FormEvent } from 'react'

interface BorrowerSearchToolbarProps {
  isLoading: boolean
  onSearch: (event: FormEvent<HTMLFormElement>) => void
  onSearchChange: (value: string) => void
  onClear: () => void
  search: string
}

export default function BorrowerSearchToolbar({
  isLoading,
  onSearch,
  onSearchChange,
  onClear,
  search,
}: BorrowerSearchToolbarProps) {
  return (
    <div className="flex min-h-[66px] items-center justify-between gap-[18px] border-b border-divider px-[17px] py-[14px] max-[520px]:flex-col max-[520px]:items-stretch max-[520px]:gap-[10px]">
      <form
        className="flex w-[min(360px,100%)] items-center gap-2 rounded-lg border border-line bg-page px-[11px] text-subtle focus-within:border-primary focus-within:shadow-[0_0_0_3px_var(--color-primary-soft)]"
        role="search"
        onSubmit={onSearch}
        noValidate
      >
        <label className="sr-only" htmlFor="borrower-search">
          Search borrowers by UNB ID or name
        </label>
        <svg className="h-4 w-4 shrink-0 fill-none stroke-current stroke-[1.8] [stroke-linecap:round]" viewBox="0 0 24 24" aria-hidden="true">
          <circle cx="11" cy="11" r="7" />
          <path d="m20 20-4-4" />
        </svg>
        <input
          id="borrower-search"
          name="search"
          type="search"
          className="w-full border-0 bg-transparent py-[9px] text-[11px] text-body outline-none placeholder:text-subtle [&::-webkit-search-cancel-button]:hidden"
          value={search}
          placeholder="Search name or UNB ID..."
          disabled={isLoading}
          onChange={(event) => onSearchChange(event.target.value)}
        />
        {search && (
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
    </div>
  )
}
