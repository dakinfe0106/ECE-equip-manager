import { Link, Route, Routes } from 'react-router'
import App from './App'
import EquipmentTypes from './pages/EquipmentTypes'
import AddAssetForm from './features/assets/components/AddAssetForm'
import AssetsPage from './pages/AssetsPage'
import CategoriesPage from './pages/CategoriesPage'
import LoginPage from './pages/LoginPage'
import RequireAuth from './features/auth/RequireAuth'

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route element={<RequireAuth />}>
        <Route element={<App />}>
          <Route element={<RequireAuth permission="inventory.view_asset" />}>
            <Route path="/" element={<AssetsPage />} />
            <Route path="/assets" element={<AssetsPage />} />
          </Route>
          <Route element={<RequireAuth permission="inventory.add_asset" />}>
            <Route path="/assets/new" element={<AddAssetForm />} />
          </Route>
          <Route element={<RequireAuth permission="inventory.view_equipmenttype" />}>
            <Route path="/equipment-types" element={<EquipmentTypes />} />
          </Route>
          <Route element={<RequireAuth permission="inventory.view_category" />}>
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
