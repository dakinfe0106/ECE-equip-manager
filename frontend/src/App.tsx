// ==========================================
// FILE: App.tsx
// PURPOSE: The root component. Keeps the backend 
// health check, and adds our new Borrower UI.
// ==========================================

import { useState } from 'react'
import './App.css'

// 1. Import our new components
import BorrowerList from './components/BorrowerList'
import AddBorrowerForm from './components/AddBorrowerForm'

function App() {
  // 2. Keep the teammate's health check state and function
  const [message, setMessage] = useState('')

  const fetchHealthCheck = async () => {
    try {
      // The DevOps leader mentioned CORS is fixed, so this should work now!
      const response = await fetch('http://localhost:8000/api/health/')
      const data = await response.json()
      setMessage(JSON.stringify(data, null, 2)) // null, 2 makes it pretty-printed
    } catch (error) {
      setMessage('Error connecting to backend: ' + (error as Error).message)
    }
  }

  return (
    // Added some Tailwind classes to make the whole page look clean
    <div className="min-h-screen bg-gray-100 p-8">
      <header className="mb-8">
        <h1 className="text-4xl font-bold text-gray-900">ECE Equipment Management System</h1>
        <p className="text-gray-600 mt-2">Throw-away feature: Borrower Module (Frontend Spike)</p>
      </header>

      <main className="max-w-4xl mx-auto space-y-8">
        
        {/* 3. Keep the teammate's Backend Connection Test */}
        <section className="p-6 bg-blue-50 border border-blue-200 rounded-lg shadow-sm">
          <h2 className="text-xl font-semibold mb-4 text-blue-900">Backend Connection Test</h2>
          <button 
            onClick={fetchHealthCheck}
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
          >
            Test Backend Connection
          </button>
          {message && (
            <pre className="mt-4 p-3 bg-gray-800 text-green-400 rounded text-sm overflow-x-auto">
              {message}
            </pre>
          )}
        </section>

        {/* 4. Add our new Borrower Components */}
        <section>
          <AddBorrowerForm />
        </section>
        
        <section>
          <BorrowerList />
        </section>

      </main>
    </div>
  )
}

export default App