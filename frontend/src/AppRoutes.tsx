import { Link, Route, Routes } from 'react-router'
import App from './App'
import AddAssetForm from './features/assets/components/AddAssetForm'

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<App />} />
      <Route path="/assets/new" element={<AddAssetForm />} />
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
