import { Link, Route, Routes } from 'react-router'
import App from './App'
import AddAssetForm from './features/assets/components/AddAssetForm'
import AssetsPage from './pages/AssetsPage'
import DashboardPage from './pages/DashboardPage'
import LoginPage from './pages/LoginPage'
import RequireAuth from './features/auth/RequireAuth'
import InProgressPage from './pages/InProgressPage'
import { navigationItems } from './components/layout/navigation'

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />

      <Route element={<RequireAuth />}>
        <Route element={<App />}>
          <Route element={<RequireAuth permission="inventory.view_asset" />}>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/assets" element={<AssetsPage />} />
          </Route>
          <Route element={<RequireAuth permission="inventory.add_asset" />}>
            <Route path="/assets/new" element={<AddAssetForm />} />
          </Route>
          {navigationItems.filter((item) => item.inProgress).map((item) => (
            <Route key={item.path} element={<RequireAuth roles={item.roles} />}>
              <Route path={item.path} element={<InProgressPage title={item.label} />} />
            </Route>
          ))}
        </Route>
      </Route>

      <Route
        path="*"
        element={
          <main className="p-6">
            <h1>Page not found</h1>
            <Link className="underline" to="/">
              Return home
            </Link>
          </main>
        }
      />
    </Routes>
  )
}