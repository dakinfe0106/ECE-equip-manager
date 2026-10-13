import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router'

type Category = {
  id: number
  name: string
}

type EquipmentType = {
  id: number
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
  const [show, setShow] = useState('active')

  useEffect(() => {
    const fetchEquipmentTypes = async () => {
      try {
        const response = await fetch(
          'http://localhost:8000/api/equipment-types/',
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
      const matchesSearch =
        equipmentType.name.toLowerCase().includes(search.toLowerCase()) ||
        equipmentType.category.name
          .toLowerCase()
          .includes(search.toLowerCase())

      const matchesStatus =
        show === 'all' ||
        (show === 'active' && !equipmentType.is_deleted) ||
        (show === 'deleted' && equipmentType.is_deleted)

      return matchesSearch && matchesStatus
    })
  }, [equipmentTypes, search, show])

  return (
    <div className="flex min-h-screen bg-slate-100">
      {/* Sidebar */}
      <aside className="flex w-56 flex-col bg-slate-900 text-white">
        <div className="px-5 py-5 text-lg font-bold leading-tight">
          ECE Equipment
          <br />
          Manager
        </div>

        <nav className="mt-8 flex flex-col gap-2 px-3 text-sm">
          <Link className="rounded px-4 py-3 hover:bg-slate-800" to="/">
            ▦ Dashboard
          </Link>

          <button className="rounded px-4 py-3 text-left hover:bg-slate-800">
            ▣ Categories
          </button>

          <Link
            className="rounded bg-blue-600 px-4 py-3 font-medium"
            to="/equipment-types"
          >
            🔧 Equipment Types
          </Link>

          <button className="rounded px-4 py-3 text-left hover:bg-slate-800">
            ◈ Assets
          </button>

          <button className="rounded px-4 py-3 text-left hover:bg-slate-800">
            ↔ Loans
          </button>
        </nav>

        <div className="mt-auto border-t border-slate-700 px-5 py-5 text-sm">
          👤 Shop Tech User
        </div>
      </aside>

      {/* Main page */}
      <main className="flex-1 p-8">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-3xl font-semibold text-slate-900">
            Equipment Types
          </h1>

          <button
            type="button"
            className="rounded-md bg-blue-600 px-5 py-2.5 font-medium text-white"
          >
            + Add Equipment Type
          </button>
        </div>

        <div className="overflow-hidden rounded-xl border border-slate-300 bg-white shadow-sm">
          {/* Toolbar */}
          <div className="flex items-center justify-between border-b border-slate-200 p-4">
            <div className="flex items-center gap-3">
              <span className="text-sm text-slate-600">Show:</span>

              <select
                value={show}
                onChange={(event) => setShow(event.target.value)}
                className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm"
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
                placeholder="Search equipment types..."
                className="w-72 rounded-l-md border border-slate-300 px-4 py-2 text-sm outline-none"
              />

              <button
                type="button"
                className="rounded-r-md bg-blue-600 px-5 py-2 text-sm font-medium text-white"
              >
                Search
              </button>
            </div>
          </div>

          {loading && (
            <p className="p-6 text-slate-600">Loading equipment types...</p>
          )}

          {error && <p className="p-6 text-red-600">{error}</p>}

          {!loading && !error && (
            <div className="p-3">
              <table className="w-full border-collapse text-left">
                <thead>
                  <tr className="bg-slate-100 text-sm text-slate-700">
                    <th className="border border-slate-300 px-4 py-3">ID</th>
                    <th className="border border-slate-300 px-4 py-3">
                      Equipment Type
                    </th>
                    <th className="border border-slate-300 px-4 py-3">
                      Category
                    </th>
                    <th className="border border-slate-300 px-4 py-3">
                      Is deleted
                    </th>
                    <th className="border border-slate-300 px-4 py-3">
                      Actions
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {visibleEquipmentTypes.map((equipmentType) => (
                    <tr key={equipmentType.id}>
                      <td className="border border-slate-300 px-4 py-4">
                        {String(equipmentType.id).padStart(2, '0')}
                      </td>

                      <td className="border border-slate-300 px-4 py-4 font-medium">
                        {equipmentType.name}
                      </td>

                      <td className="border border-slate-300 px-4 py-4">
                        <span className="rounded-full bg-sky-100 px-3 py-1 text-sky-800">
                          {equipmentType.category.name}
                        </span>
                      </td>

                      <td className="border border-slate-300 px-4 py-4">
                        <span
                          className={`rounded-full px-3 py-1 ${
                            equipmentType.is_deleted
                              ? 'bg-red-100 text-red-700'
                              : 'bg-green-100 text-green-700'
                          }`}
                        >
                          {equipmentType.is_deleted ? 'Yes' : 'No'}
                        </span>
                      </td>

                      <td className="border border-slate-300 px-4 py-4">
                        <div className="flex gap-4">
                          <button
                            type="button"
                            aria-label={`Edit ${equipmentType.name}`}
                            className="text-xl text-blue-600"
                          >
                            ✎
                          </button>

                          <button
                            type="button"
                            aria-label={`Delete ${equipmentType.name}`}
                            className="text-xl text-red-600"
                          >
                            ♲
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {visibleEquipmentTypes.length === 0 && (
                <p className="p-6 text-center text-slate-500">
                  No equipment types found.
                </p>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}

export default EquipmentTypes