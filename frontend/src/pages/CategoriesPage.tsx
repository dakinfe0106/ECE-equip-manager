import { useCallback, useState, type FormEvent } from 'react'
import CategoryTable from '../features/categories/components/CategoryTable'
import CategoryToolbar from '../features/categories/components/CategoryToolbar'
import {
  describeCategoryError,
  fetchCategories,
  type DeletedFilter,
} from '../features/categories/api'
import { useApiData } from '../features/categories/hooks/useApiData'

function emptyMessage(search: string, show: DeletedFilter): string {
  if (search) return `No categories match "${search}".`
  if (show === 'true') return 'There are no deleted categories.'
  return 'There are no categories yet.'
}

export default function CategoriesPage() {
  const [show, setShow] = useState<DeletedFilter>('false')
  const [searchText, setSearchText] = useState('')
  const [appliedSearch, setAppliedSearch] = useState('')

  const load = useCallback(
    (signal: AbortSignal) => fetchCategories({ deleted: show, search: appliedSearch }, signal),
    [show, appliedSearch],
  )
  const { loading, data: categories, error } = useApiData(load)
  const errorMessage = error === undefined ? '' : describeCategoryError(error, 'categories')

  const searchCategories = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setAppliedSearch(searchText.trim())
  }

  const clearSearch = () => {
    setSearchText('')
    setAppliedSearch('')
  }

  return (
    <section className="page-content" aria-labelledby="page-title">
      <div className="page-heading">
        <div>
          <h1 id="page-title">Categories</h1>
        </div>
        {/* Shown as in the mockup but not connected: adding categories is another user story. */}
        <button
          className="add-asset-button cursor-not-allowed opacity-70"
          type="button"
          disabled
          title="Coming soon"
        >
          <svg viewBox="0 0 20 20" aria-hidden="true">
            <path d="M10 4v12M4 10h12" />
          </svg>
          Add Category
        </button>
      </div>

      <section className="asset-panel" aria-label="Category list">
        <CategoryToolbar
          show={show}
          searchText={searchText}
          isLoading={loading}
          onShowChange={setShow}
          onSearchTextChange={setSearchText}
          onSearch={searchCategories}
          onClear={clearSearch}
        />

        {errorMessage && (
          <p className="inline-message message-error" role="alert">
            {errorMessage}
          </p>
        )}
        {loading && (
          <p className="inline-message message-loading" role="status">
            Loading categories…
          </p>
        )}

        <CategoryTable
          categories={categories ?? []}
          emptyMessage={emptyMessage(appliedSearch, show)}
          errorMessage={errorMessage}
          isLoading={loading}
        />
      </section>
    </section>
  )
}
