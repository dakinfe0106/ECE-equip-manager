import { Link } from 'react-router'
import type { Category } from '../api'
import { PencilIcon, TrashIcon } from './icons'
import StatusBadge from './StatusBadge'

interface CategoryTableProps {
  categories: Category[]
  emptyMessage: string
  isLoading: boolean
  errorMessage: string
}

function describeTypeCount(count: number): string {
  if (count === 0) return 'No types'
  return `${count} ${count === 1 ? 'type' : 'types'}`
}

// Edit and Delete are shown as in the design mockup but are not connected yet;
// other user stories cover them.
export default function CategoryTable({
  categories,
  emptyMessage,
  isLoading,
  errorMessage,
}: CategoryTableProps) {
  return (
    <div className="table-scroll">
      <table className="asset-table">
        <thead>
          <tr>
            <th scope="col">ID</th>
            <th scope="col">Category Name</th>
            <th scope="col">is_deleted</th>
            <th scope="col" className="text-center!">Actions</th>
          </tr>
        </thead>
        <tbody>
          {categories.map((category) => (
            <tr key={category.category_id}>
              <td className="record-id">{category.category_id.toString().padStart(2, '0')}</td>
              <td>
                <Link
                  className="asset-identifier-link"
                  to={`/categories/${category.category_id}`}
                >
                  {category.name}
                </Link>
                <span className="ml-2 text-[9px] text-slate-500">
                  {describeTypeCount(category.equipment_type_count)}
                </span>
              </td>
              <td>
                <StatusBadge isDeleted={category.is_deleted} />
              </td>
              <td>
                <div className="flex items-center justify-center gap-3">
                  <button
                    type="button"
                    disabled
                    title="Coming soon"
                    aria-label={`Edit ${category.name} (coming soon)`}
                    className="cursor-not-allowed rounded p-1 text-blue-600"
                  >
                    <PencilIcon />
                  </button>
                  <button
                    type="button"
                    disabled
                    title="Coming soon"
                    aria-label={`Delete ${category.name} (coming soon)`}
                    className="cursor-not-allowed rounded p-1 text-red-600"
                  >
                    <TrashIcon />
                  </button>
                </div>
              </td>
            </tr>
          ))}
          {!isLoading && categories.length === 0 && (
            <tr>
              <td className="table-empty" colSpan={4}>
                {errorMessage ? 'The category list could not be loaded.' : emptyMessage}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  )
}
