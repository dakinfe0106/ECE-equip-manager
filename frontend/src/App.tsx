import { useState } from 'react'
import './App.css'

type Equipment = {
  id: number
  assetId: string
  name: string
  type: string
  status: string
}

const initialEquipment: Equipment[] = [
  {
    id: 1,
    assetId: 'EQ-001',
    name: 'Dell Latitude 5420',
    type: 'Laptop',
    status: 'Available',
  },
  {
    id: 2,
    assetId: 'EQ-002',
    name: 'Fluke Digital Multimeter',
    type: 'Multimeter',
    status: 'On Loan',
  },
  {
    id: 3,
    assetId: 'EQ-003',
    name: 'Arduino Kit',
    type: 'Microcontroller Kit',
    status: 'Under Maintenance',
  },
]

function App() {
  const [equipment, setEquipment] = useState<Equipment[]>(initialEquipment)
  const [message, setMessage] = useState('')
  const [showForm, setShowForm] = useState(false)

  const [assetId, setAssetId] = useState('')
  const [name, setName] = useState('')
  const [type, setType] = useState('')
  const [status, setStatus] = useState('Available')

  const fetchHealthCheck = async () => {
    try {
      const response = await fetch('http://localhost:8000/api/health/')
      const data = await response.json()
      setMessage(JSON.stringify(data))
    } catch (error) {
      setMessage('Error connecting to backend: ' + error)
    }
  }

  const handleAddEquipment = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (!assetId.trim() || !name.trim() || !type.trim()) {
      alert('Please complete all fields.')
      return
    }

    const newEquipment: Equipment = {
      id: Date.now(),
      assetId: assetId.trim(),
      name: name.trim(),
      type: type.trim(),
      status,
    }

    setEquipment([...equipment, newEquipment])

    setAssetId('')
    setName('')
    setType('')
    setStatus('Available')
    setShowForm(false)
  }

  return (
    <div className="app-page">
      <header className="hero-header">
        <h1>ECE Equipment Management System</h1>
        <p>Equipment inventory and status overview</p>

        <div className="header-actions">
          <button
            className="secondary-button"
            onClick={fetchHealthCheck}
          >
            Test Backend Connection
          </button>

          <button
            className="primary-button"
            onClick={() => setShowForm(!showForm)}
          >
            {showForm ? 'Close Form' : '+ Add Equipment'}
          </button>
        </div>

        {message && (
          <div className="backend-response">
            Backend response: {message}
          </div>
        )}
      </header>

      <main className="main-content">
        {showForm && (
          <section className="form-card">
            <h2>Add Equipment</h2>

            <form onSubmit={handleAddEquipment}>
              <div className="form-grid">
                <div className="form-group">
                  <label htmlFor="assetId">Asset ID</label>
                  <input
                    id="assetId"
                    type="text"
                    value={assetId}
                    onChange={(event) => setAssetId(event.target.value)}
                    placeholder="e.g. EQ-004"
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="name">Equipment Name</label>
                  <input
                    id="name"
                    type="text"
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    placeholder="e.g. Epson Projector"
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="type">Type</label>
                  <input
                    id="type"
                    type="text"
                    value={type}
                    onChange={(event) => setType(event.target.value)}
                    placeholder="e.g. Projector"
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="status">Status</label>
                  <select
                    id="status"
                    value={status}
                    onChange={(event) => setStatus(event.target.value)}
                  >
                    <option value="Available">Available</option>
                    <option value="On Loan">On Loan</option>
                    <option value="Under Maintenance">
                      Under Maintenance
                    </option>
                    <option value="Retired">Retired</option>
                  </select>
                </div>
              </div>

              <button className="submit-button" type="submit">
                Add Equipment
              </button>
            </form>
          </section>
        )}

        <section className="equipment-section">
          <div className="section-heading">
            <div>
              <h2>Equipment List</h2>
              <p>Current equipment records using temporary frontend data.</p>
            </div>

            <span className="equipment-count">
              {equipment.length} items
            </span>
          </div>

          <div className="table-card">
            <table className="equipment-table">
              <thead>
                <tr>
                  <th>Asset ID</th>
                  <th>Name</th>
                  <th>Type</th>
                  <th>Status</th>
                </tr>
              </thead>

              <tbody>
                {equipment.map((item) => (
                  <tr key={item.id}>
                    <td>{item.assetId}</td>
                    <td>{item.name}</td>
                    <td>{item.type}</td>
                    <td>
                      <span
                        className={`status-badge ${item.status
                          .toLowerCase()
                          .replaceAll(' ', '-')}`}
                      >
                        {item.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </main>
    </div>
  )
}

export default App