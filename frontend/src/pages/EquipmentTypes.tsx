import { useEffect, useState } from 'react'
import './EquipmentTypes.css'

type Category = {
  id: number
  name: string
}

type EquipmentType = {
  id: number
  name: string
  description: string
  category: Category
}

function EquipmentTypes() {
  const [equipmentTypes, setEquipmentTypes] = useState<EquipmentType[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const fetchEquipmentTypes = async () => {
      try {
        const response = await fetch(
          'http://localhost:8000/api/equipment-types/',
          {
            credentials: 'include',
          }
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
            : 'Unable to load equipment types.'
        )
      } finally {
        setLoading(false)
      }
    }

    fetchEquipmentTypes()
  }, [])

  return (
    <section className="equipment-types-page">
      <div className="equipment-types-header">
        <h1>Equipment Types</h1>
        <p>View the equipment types used to classify individual assets.</p>
      </div>

      <div className="equipment-types-card">
        {loading && (
          <p className="equipment-types-message">
            Loading equipment types...
          </p>
        )}

        {error && (
          <p className="equipment-types-message equipment-types-error">
            {error}
          </p>
        )}

        {!loading && !error && equipmentTypes.length === 0 && (
          <p className="equipment-types-message">
            No equipment types found.
          </p>
        )}

        {!loading && !error && equipmentTypes.length > 0 && (
          <table className="equipment-types-table">
            <thead>
              <tr>
                <th>Type</th>
                <th>Category</th>
              </tr>
            </thead>

            <tbody>
              {equipmentTypes.map((equipmentType) => (
                <tr key={equipmentType.id}>
                  <td>{equipmentType.name}</td>
                  <td>
                    <span className="category-badge">
                      {equipmentType.category.name}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </section>
  )
}

export default EquipmentTypes