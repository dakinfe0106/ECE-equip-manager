export const apiBaseUrl = (
  import.meta.env.VITE_API_URL || 'http://localhost:8000/api'
).replace(/\/+$/, '')

export async function fetchHealthCheck(): Promise<{ status: string }> {
  const response = await fetch(`${apiBaseUrl}/health/`)
  if (!response.ok) {
    throw new Error(`Health check failed (${response.status})`)
  }
  return response.json()
}
