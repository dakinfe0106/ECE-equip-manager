import { useState } from 'react'
import './App.css'
import AddEquipmentForm from './AddEquipmentForm'

function App() {
  const [message, setMessage] = useState('')

  const fetchHealthCheck = async () => {
    try {
      // Coordinate with your backend lead on the exact URL they are building
      const response = await fetch('http://localhost:8000/api/health/')
      const data = await response.json()
      setMessage(JSON.stringify(data))
    } catch (error) {
      setMessage('Error connecting to backend: ' + error)
    }
  }

   return (
    <div>
      <h1>Frontend is Running!</h1>

      <button onClick={fetchHealthCheck}>
        Test Backend Connection
      </button>

      <p>Response: {message}</p>
      <h2>Add Equipment</h2>
      <AddEquipmentForm />
    </div>
  )
}

export default App