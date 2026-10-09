import { Navigate, Route, Routes } from 'react-router-dom'
import './App.css'
import EquipmentTypes from './pages/EquipmentTypes'

function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/equipment-types" replace />} />
      <Route path="/equipment-types" element={<EquipmentTypes />} />
    </Routes>
  )
}

export default App