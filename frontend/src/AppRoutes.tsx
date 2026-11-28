import { Link, Route, Routes } from 'react-router'
import App from './App'
import AddAssetForm from './features/assets/components/AddAssetForm'
import AssetsPage from './pages/AssetsPage'
import MaintenancePage from './pages/MaintenancePage'
import BorrowersPage from './pages/BorrowersPage'
import DashboardPage from './pages/DashboardPage'
import LendingPage from './pages/LendingPage'
import LoginPage from './pages/LoginPage'
import RequireAuth from './features/auth/RequireAuth'
import InProgressPage from './pages/InProgressPage'
import AnalyticsPage from './pages/AnalyticsPage'
import ImportExportPage from './pages/ImportExportPage'
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
          <Route element={<RequireAuth permission="maintenance.view_maintenancerecord" />}>
            <Route path="/maintenance" element={<MaintenancePage />} />
          </Route>

          <Route element={<RequireAuth permission="lending.view_borrower" />}>
            <Route path="/borrowers" element={<BorrowersPage />} />
          </Route>

          <Route
            element={
              <RequireAuth roles={['ADMINISTRATOR', 'TECHNICIAN']} />
            }
          >
            <Route path="/loans" element={<LendingPage />} />
            <Route path="/import-export" element={<ImportExportPage />} />
          </Route>

          <Route element={<RequireAuth roles={['ADMINISTRATOR', 'TECHNICIAN', 'FACULTY']} />}>
            <Route path="/analytics" element={<AnalyticsPage />} />
          </Route>

          {navigationItems
            .filter(
              (item) =>
                item.inProgress
                && item.path !== '/maintenance'
                && item.path !== '/borrowers'
                && item.path !== '/loans',
            )
            .map((item) => (
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
