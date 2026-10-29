import { Outlet } from 'react-router'
import Sidebar from './components/layout/Sidebar'
import Header from './components/layout/Header'
import './App.css'

function App() {
  return (
    <div className="ems-shell">
      <Sidebar />
      <div className="main-content flex flex-col">
        <Header />
        <main className="min-h-0 flex-1 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  )
}

export default App