import { useState } from 'react'
import { Link } from 'react-router'
import { fetchHealthCheck } from './api'
import './App.css'

function App() {
  const [message, setMessage] = useState('')

  const checkConnection = async () => {
    try {
      const data = await fetchHealthCheck()
      setMessage(JSON.stringify(data))
    } catch (error) {
      setMessage('Error connecting to backend: ' + error)
    }
  }

  return (
    <main className="flex flex-col items-center gap-4 p-6">
      <h1>Frontend is Running!</h1>

      <Link
        className="rounded bg-blue-700 px-4 py-2 text-white hover:bg-blue-800"
        to="/assets/new"
      >
        Add New Asset
      </Link>

      <button
        className="cursor-pointer rounded border px-4 py-2 focus-visible:outline-2 focus-visible:outline-offset-2"
        onClick={checkConnection}
      >
        Test Backend Connection
      </button>

      <p role="status">Response: {message}</p>
    </main>
  )
}

export default App
