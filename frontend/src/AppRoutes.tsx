import { Link, Route, Routes } from 'react-router'
import App from './App'

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<App />} />
      <Route path="*" element={
        <main className="p-6">
          <h1>Page not found</h1>
          <Link className="underline" to="/">Return home</Link>
        </main>
      } />
    </Routes>
  )
}
