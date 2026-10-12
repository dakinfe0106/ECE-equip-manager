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
    <div className="panel-toolbar">
      <label className="record-filter">
        <span>Show:</span>
        <select
          className="filter-select"
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

      <form className="search-form" onSubmit={onSearch} noValidate>
        <label className="visually-hidden" htmlFor="category-search">
          Search categories
        </label>
        <span className="search-icon" aria-hidden="true">
          <svg viewBox="0 0 20 20" focusable="false">
            <circle cx="8.5" cy="8.5" r="5.5" />
            <path d="m13 13 4 4" />
          </svg>
        </span>
        <input
          id="category-search"
          name="search"
          type="search"
          value={searchText}
          maxLength={255}
          placeholder="Search categories..."
          onChange={(event) => onSearchTextChange(event.target.value)}
        />
        {searchText && (
          <button
            className="clear-search"
            type="button"
            aria-label="Clear search"
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
