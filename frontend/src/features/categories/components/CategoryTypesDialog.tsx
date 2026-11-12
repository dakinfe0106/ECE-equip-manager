import { useCallback, useEffect, useRef, type KeyboardEvent } from 'react'
import { describeCategoryError, fetchCategoryEquipmentTypes, type Category } from '../api'
import { useApiData } from '../hooks/useApiData'
import EquipmentTypeTable from './EquipmentTypeTable'
import StatusBadge from './StatusBadge'

const focusableSelector = 'button:not([disabled]), [href], input, select, textarea'

interface CategoryTypesDialogProps {
  category: Category
  onClose: () => void
}

// A popup on the Categories page that lists the equipment types of one category.
// It is styled like the "Add New Asset" dialog in the design mockup.
export default function CategoryTypesDialog({ category, onClose }: CategoryTypesDialogProps) {
  const dialogRef = useRef<HTMLDivElement>(null)

  const load = useCallback(
    (signal: AbortSignal) => fetchCategoryEquipmentTypes(String(category.category_id), signal),
    [category.category_id],
  )
  const { loading, data: equipmentTypes, error } = useApiData(load)

  // Move focus into the popup when it opens and back to the button that opened it on close.
  useEffect(() => {
    const opener = document.activeElement
    dialogRef.current?.focus()
    return () => {
      if (opener instanceof HTMLElement) opener.focus()
    }
  }, [])

  useEffect(() => {
    const closeOnEscape = (event: globalThis.KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', closeOnEscape)
    return () => document.removeEventListener('keydown', closeOnEscape)
  }, [onClose])

  // Keep Tab and Shift+Tab inside the popup while it is open.
  const keepFocusInside = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== 'Tab' || !dialogRef.current) return
    const items = dialogRef.current.querySelectorAll<HTMLElement>(focusableSelector)
    if (items.length === 0) return

    const first = items[0]
    const last = items[items.length - 1]
    const active = document.activeElement
    if (event.shiftKey && (active === first || active === dialogRef.current)) {
      event.preventDefault()
      last.focus()
    } else if (!event.shiftKey && active === last) {
      event.preventDefault()
      first.focus()
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#0f1b2d]/50 p-4"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="category-types-title"
        tabIndex={-1}
        onKeyDown={keepFocusInside}
        className="flex max-h-[min(560px,calc(100vh-32px))] w-full max-w-[520px] flex-col overflow-hidden rounded-[10px] border border-[#e0e6ef] bg-white shadow-[0_18px_48px_rgb(15_27_45_/_28%)] outline-none"
      >
        <div className="flex items-start justify-between gap-3 px-[18px] pb-3 pt-4">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2
                className="m-0 text-[15px] font-[690] leading-[1.3] text-[#1f2b3e]"
                id="category-types-title"
              >
                {category.name}
              </h2>
              <StatusBadge isDeleted={category.is_deleted} />
            </div>
            <p className="m-0 mt-1 text-[10px] text-[#8a96a7]">Equipment types in this category</p>
          </div>
          <button
            type="button"
            aria-label="Close"
            className="cursor-pointer rounded p-1 text-[#758196] hover:bg-[#f4f6fa] hover:text-[#39465a] focus-visible:outline-2 focus-visible:outline-[#347ee9]"
            onClick={onClose}
          >
            <svg
              className="h-4 w-4 fill-none stroke-current [stroke-linecap:round] stroke-2"
              viewBox="0 0 20 20"
              aria-hidden="true"
            >
              <path d="M5 5l10 10M15 5L5 15" />
            </svg>
          </button>
        </div>

        {loading && (
          <p
            className="mx-[18px] mb-3 rounded-[5px] border border-[#d5e4fb] bg-[#f3f8ff] px-[11px] py-[9px] text-[11px] text-[#315f9f]"
            role="status"
          >
            Loading equipment types…
          </p>
        )}
        {error !== undefined && (
          <p
            className="mx-[18px] mb-3 rounded-[5px] border border-[#f3d0d2] bg-[#fff5f5] px-[11px] py-[9px] text-[11px] text-[#a5333b]"
            role="alert"
          >
            {describeCategoryError(error, 'the equipment types')}
          </p>
        )}
        {equipmentTypes && <EquipmentTypeTable equipmentTypes={equipmentTypes} />}

        <div className="flex justify-end border-t border-[#e8edf3] px-[18px] py-3">
          <button
            type="button"
            className="inline-flex min-h-8 cursor-pointer items-center justify-center rounded-[6px] border border-[#cfd7e3] bg-white px-4 text-[11px] font-semibold text-[#4c596d] hover:bg-[#f4f6fa] focus-visible:outline-2 focus-visible:outline-[#347ee9]"
            onClick={onClose}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
