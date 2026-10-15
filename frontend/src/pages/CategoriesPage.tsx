import { useCallback, useState, type FormEvent } from 'react'
import CategoryTable from '../features/categories/components/CategoryTable'
import CategoryToolbar from '../features/categories/components/CategoryToolbar'
import CategoryTypesDialog from '../features/categories/components/CategoryTypesDialog'
import {
  describeCategoryError,
  fetchCategories,
  type Category,
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
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null)

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
    <section
      className="mx-auto flex h-full min-h-0 w-full max-w-[1440px] flex-col px-[34px] pb-[42px] pt-[31px] max-[980px]:px-6 max-[700px]:px-[14px] max-[700px]:pb-[30px] max-[700px]:pt-6"
      aria-labelledby="page-title"
    >
      <div className="mb-6 flex items-end justify-between gap-5 max-[700px]:items-start">
        <div>
          <h1
            className="m-0 text-[25px] font-[690] leading-[1.25] tracking-[-0.55px] text-[#1f2b3e]"
            id="page-title"
          >
            Categories
          </h1>
        </div>
        {/* Shown as in the mockup but not connected: adding categories is another user story. */}
        <button
          className="inline-flex min-h-9 cursor-not-allowed items-center justify-center gap-[7px] rounded-[6px] border border-[#276fdd] bg-[#2875e4] px-3 text-[11px] font-semibold text-white opacity-70"
          type="button"
          disabled
          title="Coming soon"
        >
          <svg className="h-[14px] w-[14px] fill-none stroke-current [stroke-linecap:round] stroke-[1.8]" viewBox="0 0 20 20" aria-hidden="true">
            <path d="M10 4v12M4 10h12" />
          </svg>
          Add Category
        </button>
      </div>

      <section
        className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-[9px] border border-[#e0e6ef] bg-white shadow-[0_3px_12px_rgb(29_49_77_/_4%)]"
        aria-label="Category list"
      >
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
          <p
            className="mx-[18px] mb-[13px] rounded-[5px] border border-[#f3d0d2] bg-[#fff5f5] px-[11px] py-[9px] text-[11px] text-[#a5333b]"
            role="alert"
          >
            {errorMessage}
          </p>
        )}
        {loading && (
          <p
            className="mx-[18px] mb-[13px] rounded-[5px] border border-[#d5e4fb] bg-[#f3f8ff] px-[11px] py-[9px] text-[11px] text-[#315f9f]"
            role="status"
          >
            Loading categories…
          </p>
        )}

        <CategoryTable
          categories={categories ?? []}
          emptyMessage={emptyMessage(appliedSearch, show)}
          errorMessage={errorMessage}
          isLoading={loading}
          onSelectCategory={setSelectedCategory}
        />
      </section>

      {selectedCategory && (
        <CategoryTypesDialog
          category={selectedCategory}
          onClose={() => setSelectedCategory(null)}
        />
      )}
    </section>
  )
}
