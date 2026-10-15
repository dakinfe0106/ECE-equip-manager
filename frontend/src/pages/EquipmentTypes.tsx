import { useEffect, useMemo, useState } from 'react'
import { apiBaseUrl } from '../api'

type Category = {
  category_id: number
  name: string
}

type EquipmentType = {
  type_id: number
  name: string
  description: string
  category: Category
  is_deleted?: boolean
}

function EquipmentTypes() {
  const [equipmentTypes, setEquipmentTypes] = useState<EquipmentType[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [appliedSearch, setAppliedSearch] = useState('')
  const [show, setShow] = useState('active')

  useEffect(() => {
    const fetchEquipmentTypes = async () => {
      try {
        const response = await fetch(
  `${apiBaseUrl}/equipment-types/`,
  {
    credentials: 'include',
  },
)

        if (!response.ok) {
          throw new Error(`Request failed with status ${response.status}`)
        }

        const data: EquipmentType[] = await response.json()
        setEquipmentTypes(data)
      } catch (error) {
        setError(
          error instanceof Error
            ? error.message
            : 'Unable to load equipment types.',
        )
      } finally {
        setLoading(false)
      }
    }

    fetchEquipmentTypes()
  }, [])

  const visibleEquipmentTypes = useMemo(() => {
    return equipmentTypes.filter((equipmentType) => {
      const searchText = appliedSearch.toLowerCase()

      const matchesSearch =
        equipmentType.name.toLowerCase().includes(searchText) ||
        equipmentType.category.name.toLowerCase().includes(searchText)

      const matchesStatus =
        show === 'all' ||
        (show === 'active' && !equipmentType.is_deleted) ||
        (show === 'deleted' && equipmentType.is_deleted)

      return matchesSearch && matchesStatus
    })
  }, [equipmentTypes, appliedSearch, show])

  const handleSearch = () => {
    setAppliedSearch(search.trim())
  }

  return (
    <main className="flex-1 p-8">
      {/* Page heading */}
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-3xl font-semibold text-slate-900">
          Equipment Types
        </h1>

        <button
          type="button"
          className="rounded-md bg-blue-600 px-5 py-2.5 font-medium text-white hover:bg-blue-700"
        >
          + Add Equipment Type
        </button>
      </div>

      {/* Main card */}
      <div className="overflow-hidden rounded-xl border border-slate-300 bg-white shadow-sm">
        {/* Toolbar */}
        <div className="flex items-center justify-between border-b border-slate-300 p-4">
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-slate-700">Show:</span>

            <select
              value={show}
              onChange={(event) => setShow(event.target.value)}
              className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm text-slate-700"
            >
              <option value="active">Active Records</option>
              <option value="deleted">Deleted Records</option>
              <option value="all">All Records</option>
            </select>
          </div>

          <div className="flex">
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  handleSearch()
                }
              }}
              placeholder="Search equipment types..."
              className="w-72 rounded-l-md border border-r-0 border-slate-300 px-4 py-2 text-sm outline-none focus:border-blue-500"
            />

            <button
              type="button"
              onClick={handleSearch}
              className="rounded-r-md bg-blue-600 px-5 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              Search
            </button>
          </div>
        </div>

        {/* Loading/error */}
        {loading && (
          <p className="p-6 text-sm text-slate-600">
            Loading equipment types...
          </p>
        )}

        {error && <p className="p-6 text-sm text-red-600">{error}</p>}

        {/* Table */}
        {!loading && !error && (
          <div className="p-4">
            <div className="overflow-hidden rounded-xl border border-slate-300">
              <table className="w-full border-collapse text-left">
                <thead>
                  <tr className="bg-slate-100 text-sm text-slate-700">
                    <th className="border-r border-slate-300 px-4 py-3 font-semibold">
                      ID
                    </th>

                    <th className="border-r border-slate-300 px-4 py-3 font-semibold">
                      Equipment Type
                    </th>

                    <th className="border-r border-slate-300 px-4 py-3 font-semibold">
                      Category
                    </th>

                    <th className="border-r border-slate-300 px-4 py-3 font-semibold">
                      Is_deleted
                    </th>

                    <th className="px-4 py-3 text-center font-semibold">
                      Actions
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {visibleEquipmentTypes.map((equipmentType) => (
                    <tr
                      key={equipmentType.type_id}
                      className="border-t border-slate-300 hover:bg-slate-50"
                    >
                      {/* ID */}
                      <td className="border-r border-slate-300 px-4 py-4 text-sm text-slate-700">
                        {String(equipmentType.type_id).padStart(2, '0')}
                      </td>

                      {/* Equipment type */}
                      <td className="border-r border-slate-300 px-4 py-4 text-sm font-medium text-slate-800">
                        {equipmentType.name}
                      </td>

                      {/* Category */}
                      <td className="border-r border-slate-300 px-4 py-4">
                        <span className="inline-flex rounded-full bg-sky-100 px-3 py-1 text-sm text-sky-700">
                          {equipmentType.category.name}
                        </span>
                      </td>

                      {/* Is_deleted */}
                      <td className="border-r border-slate-300 px-4 py-4">
                        <span
                          className={`inline-flex min-w-16 justify-center rounded-full px-3 py-1 text-sm ${
                            equipmentType.is_deleted
                              ? 'bg-red-100 text-red-700'
                              : 'bg-green-100 text-green-700'
                          }`}
                        >
                          {equipmentType.is_deleted ? 'Yes' : 'No'}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-4">
                        <div className="flex items-center justify-center gap-6">
                          {/* Edit */}
                          <button
                            type="button"
                            aria-label={`Edit ${equipmentType.name}`}
                            className="text-blue-600 hover:text-blue-800"
                          >
                            <svg
                              className="h-5 w-5"
                              viewBox="0 0 20 20"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="1.7"
                              aria-hidden="true"
                            >
                              <path d="M13.5 3.5l3 3L7 16H4v-3L13.5 3.5z" />
                            </svg>
                          </button>

                          {/* Delete */}
                          <button
                            type="button"
                            aria-label={`Delete ${equipmentType.name}`}
                            className="text-red-600 hover:text-red-800"
                          >
                            <svg
                              className="h-5 w-5"
                              viewBox="0 0 20 20"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="1.7"
                              aria-hidden="true"
                            >
                              <path d="M6 6h8M8 6V4h4v2m-5 0 1 10h4l1-10" />
                            </svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}

                  {visibleEquipmentTypes.length === 0 && (
                    <tr>
                      <td
                        colSpan={5}
                        className="px-4 py-10 text-center text-sm text-slate-500"
                      >
                        No equipment types found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </main>
  )
}

export default EquipmentTypes