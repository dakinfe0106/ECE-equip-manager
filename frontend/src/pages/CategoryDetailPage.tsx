import { useCallback } from 'react'
import { Link, useParams } from 'react-router'
import StatusBadge from '../features/categories/components/StatusBadge'
import {
  describeCategoryError,
  fetchCategory,
  fetchCategoryEquipmentTypes,
} from '../features/categories/api'
import { useApiData } from '../features/categories/hooks/useApiData'

export default function CategoryDetailPage() {
  const { id = '' } = useParams()

  const load = useCallback(
    async (signal: AbortSignal) => {
      const [category, equipmentTypes] = await Promise.all([
        fetchCategory(id, signal),
        fetchCategoryEquipmentTypes(id, signal),
      ])
      return { category, equipmentTypes }
    },
    [id],
  )
  const { loading, data, error } = useApiData(load)

  return (
    <section className="page-content" aria-labelledby="page-title">
      <Link to="/categories" className="mb-4 text-xs font-semibold text-blue-700 hover:underline">
        ← Back to Categories
      </Link>

      {loading && (
        <p className="inline-message message-loading" role="status">
          Loading category…
        </p>
      )}
      {!loading && error !== undefined && (
        <p className="inline-message message-error" role="alert">
          {describeCategoryError(error, 'this category')}
        </p>
      )}

      {data && (
        <>
          <div className="page-heading">
            <div className="flex flex-wrap items-center gap-3">
              <h1 id="page-title">{data.category.name}</h1>
              <StatusBadge isDeleted={data.category.is_deleted} />
            </div>
          </div>

          <section className="asset-panel" aria-label="Equipment types in this category">
            <h2 className="px-5 py-4 text-sm font-semibold text-slate-700">Equipment types</h2>
            <div className="table-scroll">
              <table className="asset-table">
                <thead>
                  <tr>
                    <th scope="col">ID</th>
                    <th scope="col">Name</th>
                    <th scope="col">Description</th>
                  </tr>
                </thead>
                <tbody>
                  {data.equipmentTypes.map((equipmentType) => (
                    <tr key={equipmentType.type_id}>
                      <td className="record-id">
                        {equipmentType.type_id.toString().padStart(2, '0')}
                      </td>
                      <td className="asset-name">{equipmentType.name}</td>
                      <td>{equipmentType.description || '—'}</td>
                    </tr>
                  ))}
                  {data.equipmentTypes.length === 0 && (
                    <tr>
                      <td className="table-empty" colSpan={3}>
                        This category has no equipment types yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}
    </section>
  )
}
