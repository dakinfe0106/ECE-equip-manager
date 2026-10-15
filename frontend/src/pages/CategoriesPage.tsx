import { useEffect, useState, type FormEvent } from 'react'
import {
  CategoryRequestError,
  createCategory,
  fetchCategories,
  findDuplicateCategory,
  type CategoryRecord,
} from '../features/categories/api'

function getErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof CategoryRequestError && error.status === 403) {
    return 'You are not authorized to manage categories. Sign in with your EMS account and try again.'
  }
  return error instanceof Error ? error.message : fallback
}

export default function CategoriesPage() {
  const [categories, setCategories] = useState<CategoryRecord[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [isAdding, setIsAdding] = useState(false)
  const [name, setName] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [statusMessage, setStatusMessage] = useState('')

  useEffect(() => {
    fetchCategories()
      .then(setCategories)
      .catch((error: unknown) => {
        setLoadError(getErrorMessage(error, 'Could not load categories.'))
      })
      .finally(() => setIsLoading(false))
  }, [])

  const duplicate = findDuplicateCategory(name, categories)

  const startAdding = () => {
    setName('')
    setSaveError('')
    setStatusMessage('')
    setIsAdding(true)
  }

  const handleSave = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setIsSaving(true)
    setSaveError('')

    try {
      const saved = await createCategory(name.trim())
      setCategories((current) =>
        [...current, saved].sort((a, b) => a.name.localeCompare(b.name)),
      )
      setIsAdding(false)
      setStatusMessage(`Category "${saved.name}" added.`)
    } catch (error) {
      setSaveError(getErrorMessage(error, 'Could not save category.'))
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <section
      className="mx-auto flex h-full min-h-0 w-full max-w-[1440px] flex-col px-[34px] pb-[42px] pt-[31px] max-[980px]:px-6 max-[700px]:px-[14px] max-[700px]:pb-[30px] max-[700px]:pt-6"
      aria-labelledby="page-title"
    >
      <div className="mb-6 flex items-end justify-between gap-5 max-[700px]:items-start">
        <h1
          className="m-0 text-[25px] font-[690] leading-[1.25] tracking-[-0.55px] text-[#1f2b3e]"
          id="page-title"
        >
          Categories
        </h1>
        {!isAdding && (
          <button
            className="inline-flex min-h-9 items-center justify-center rounded-[6px] border border-[#276fdd] bg-[#2875e4] px-3 text-[11px] font-semibold text-white transition-colors hover:bg-[#1c64cc] focus-visible:outline-2 focus-visible:outline-[#347ee9] focus-visible:outline-offset-[3px]"
            type="button"
            onClick={startAdding}
          >
            Add Category
          </button>
        )}
      </div>

      <section
        className="flex min-h-0 flex-1 flex-col overflow-auto rounded-[9px] border border-[#e0e6ef] bg-white p-[18px] shadow-[0_3px_12px_rgb(29_49_77_/_4%)]"
        aria-label="Equipment categories"
      >
        {isAdding && (
          <form
            className="mb-[18px] rounded-lg border border-[#e1e8f1] bg-[#fbfcfe] p-[15px]"
            onSubmit={handleSave}
            aria-busy={isSaving}
          >
            <label className="flex flex-col gap-[6px] text-[9px] font-[650] tracking-[0.25px] text-[#8792a2] uppercase">
              <span>Category name</span>
              <input
                className="w-full max-w-[360px] rounded-[5px] border border-[#dce3ed] bg-white px-[9px] py-2 text-[11px] text-[#39465a] normal-case focus-visible:outline-2 focus-visible:outline-[#347ee9]"
                required
                maxLength={255}
                value={name}
                onChange={(event) => setName(event.target.value)}
                aria-describedby="category-name-hint"
              />
            </label>
            <p className="mt-[6px] min-h-[15px] text-[10px] text-[#b42332]" id="category-name-hint">
              {duplicate && `A category named "${duplicate.name}" already exists.`}
            </p>
            <div className="mt-[10px] flex items-center justify-end gap-2">
              {saveError && (
                <p className="mr-auto text-[10px] text-[#b42332]" role="alert">
                  {saveError}
                </p>
              )}
              <button
                className="rounded-[5px] border border-[#dce3ed] bg-white px-[10px] py-[6px] text-[10px] text-[#59677a] disabled:cursor-wait disabled:opacity-70"
                type="button"
                disabled={isSaving}
                onClick={() => setIsAdding(false)}
              >
                Cancel
              </button>
              <button
                className="rounded-[5px] border border-[#2672e8] bg-[#2672e8] px-[10px] py-[6px] text-[10px] text-white disabled:cursor-not-allowed disabled:opacity-70"
                type="submit"
                disabled={isSaving || !name.trim() || duplicate !== undefined}
              >
                {isSaving ? 'Saving…' : 'Save category'}
              </button>
            </div>
          </form>
        )}

        {statusMessage && (
          <p className="mb-[13px] text-[11px] text-[#087443]" role="status">
            {statusMessage}
          </p>
        )}
        {loadError && (
          <p
            className="mb-[13px] rounded-[5px] border border-[#f3d0d2] bg-[#fff5f5] px-[11px] py-[9px] text-[11px] text-[#a5333b]"
            role="alert"
          >
            {loadError}
          </p>
        )}
        {isLoading && (
          <p className="text-[11px] text-[#315f9f]" role="status">
            Loading categories…
          </p>
        )}
        {!isLoading && !loadError && categories.length === 0 && (
          <p className="text-[11px] text-[#68768a]">No categories yet.</p>
        )}
        {categories.length > 0 && (
          <ul className="m-0 list-none divide-y divide-[#edf1f6] p-0">
            {categories.map((category) => (
              <li className="py-[10px] text-[12px] text-[#39465a]" key={category.category_id}>
                {category.name}
              </li>
            ))}
          </ul>
        )}
      </section>
    </section>
  )
}
