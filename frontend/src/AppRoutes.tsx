import { Link, Route, Routes } from 'react-router'
import App from './App'
import LoginPage from './features/auth/LoginPage'
import ProtectedRoute from './features/auth/ProtectedRoute'
import EquipmentTypes from './pages/EquipmentTypes'
import AddAssetForm from './features/assets/components/AddAssetForm'
import AssetsPage from './pages/AssetsPage'
import CategoriesPage from './pages/CategoriesPage'

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route element={<ProtectedRoute />}>
        <Route element={<App />}>
          <Route element={<ProtectedRoute permission="inventory.view_asset" />}>
            <Route path="/" element={<AssetsPage />} />
            <Route path="/assets" element={<AssetsPage />} />
          </Route>
          <Route element={<ProtectedRoute permission="inventory.add_asset" />}>
            <Route path="/assets/new" element={<AddAssetForm />} />
          </Route>
          <Route element={<ProtectedRoute permission="inventory.view_equipmenttype" />}>
            <Route path="/equipment-types" element={<EquipmentTypes />} />
          </Route>
          <Route element={<ProtectedRoute permission="inventory.view_category" />}>
            <Route path="/categories" element={<CategoriesPage />} />
          </Route>
        </Route>
      </Route>
      <Route
        path="*"
        element={
          <main className="p-6">
            <h1>Page not found</h1>
            <Link className="underline" to="/">Return home</Link>
          </main>
        }
      />
    </Routes>
  )
}
