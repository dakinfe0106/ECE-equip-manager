import { Outlet } from 'react-router'
import Sidebar from './components/layout/Sidebar'
import './App.css'

function App() {
  return (
    <div className="ems-shell">
      <Sidebar />
      <main className="main-content">
        <Outlet />
      </main>
    </div>
  )
}

export default App
