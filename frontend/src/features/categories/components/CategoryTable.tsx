import type { Category } from '../api'
import { PencilIcon, TrashIcon } from './icons'
import StatusBadge from './StatusBadge'

const headerBaseClassName =
  'h-10 bg-[#f7f9fc] px-[14px] text-[9px] font-[650] tracking-[0.15px] text-[#758196]'
const headerClassName = `${headerBaseClassName} text-left`
const cellClassName = 'h-12 border-t border-[#edf0f4] px-[14px] text-[10px]'

interface CategoryTableProps {
  categories: Category[]
  canChange: boolean
  canDelete: boolean
  emptyMessage: string
  isLoading: boolean
  errorMessage: string
  onSelectCategory: (category: Category) => void
}

function describeTypeCount(count: number): string {
  if (count === 0) return 'No types'
  return `${count} ${count === 1 ? 'type' : 'types'}`
}

export default function CategoryTable({
  categories,
  canChange,
  canDelete,
  emptyMessage,
  isLoading,
  errorMessage,
  onSelectCategory,
}: CategoryTableProps) {
  return (
    <div className="min-h-0 flex-1 overflow-auto border-t border-[#e8edf3]">
      <table className="w-full border-collapse text-left text-[#4c596d] whitespace-nowrap">
        <thead>
          <tr>
            <th className={`${headerClassName} pl-[19px]`} scope="col">ID</th>
            <th className={headerClassName} scope="col">Category Name</th>
            <th className={headerClassName} scope="col">is_deleted</th>
            {(canChange || canDelete) && (
              <th className={`${headerBaseClassName} text-center`} scope="col">Actions</th>
            )}
          </tr>
        </thead>
        <tbody>
          {categories.map((category) => (
            <tr key={category.category_id} className="hover:bg-[#f8faff]">
              <td className={`${cellClassName} pl-[19px] tabular-nums text-[#8a96a7]`}>
                {category.category_id.toString().padStart(2, '0')}
              </td>
              <td className={cellClassName}>
                <button
                  type="button"
                  aria-haspopup="dialog"
                  className="cursor-pointer py-[3px] text-[10px] font-[650] text-[#2871da] hover:text-[#174fa1] hover:underline focus-visible:outline-2 focus-visible:outline-[#347ee9] focus-visible:outline-offset-[3px]"
                  onClick={() => onSelectCategory(category)}
                >
                  {category.name}
                </button>
                <span className="ml-2 text-[9px] text-[#8a96a7]">
                  {describeTypeCount(category.equipment_type_count)}
                </span>
              </td>
              <td className={cellClassName}>
                <StatusBadge isDeleted={category.is_deleted} />
              </td>
              {(canChange || canDelete) && (
                <td className={cellClassName}>
                  <div className="flex items-center justify-center gap-3">
                    {canChange && (
                      <button
                        type="button"
                        disabled
                        title="Coming soon"
                        aria-label={`Edit ${category.name} (coming soon)`}
                        className="cursor-not-allowed rounded p-1 text-[#2875e4]"
                      >
                        <PencilIcon />
                      </button>
                    )}
                    {canDelete && (
                      <button
                        type="button"
                        disabled
                        title="Coming soon"
                        aria-label={`Delete ${category.name} (coming soon)`}
                        className="cursor-not-allowed rounded p-1 text-[#d84d58]"
                      >
                        <TrashIcon />
                      </button>
                    )}
                  </div>
                </td>
              )}
            </tr>
          ))}
          {!isLoading && categories.length === 0 && (
            <tr>
              <td
                className="h-[116px] border-t border-[#edf0f4] px-[14px] text-center text-[10px] text-[#8792a2] whitespace-normal"
                colSpan={canChange || canDelete ? 4 : 3}
              >
                {errorMessage ? 'The category list could not be loaded.' : emptyMessage}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  )
}
