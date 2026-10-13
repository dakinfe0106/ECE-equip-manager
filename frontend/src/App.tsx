import { useState } from 'react'
import { fetchHealthCheck } from './api'
import './App.css'
import EquipmentTypes from './pages/EquipmentTypes'

function App() {
<<<<<<< HEAD
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/equipment-types" replace />} />
      const data = await fetchHealthCheck()
      setMessage(JSON.stringify(data))
    } catch (error) {
      setMessage('Error connecting to backend: ' + error)
    }
  }

  return (
    <main className="flex flex-col items-center gap-4 p-6">
      <h1>Frontend is Running!</h1>

      <button className="cursor-pointer rounded border px-4 py-2 focus-visible:outline-2 focus-visible:outline-offset-2" onClick={checkConnection}>
        Test Backend Connection
      </button>

      <p role="status">Response: {message}</p>
    </main>
>>>>>>> 57a568fee2153e610b4cb775d9a01cb3f0a6dbef
  )
}

