export const apiBaseUrl = (
  import.meta.env.VITE_API_URL || 'http://localhost:8000/api'
).replace(/\/+$/, '')

export function getCsrfToken(): string | undefined {
  if (typeof document === 'undefined') {
    return undefined
  }
  return document.cookie
    .split('; ')
    .find((cookie) => cookie.startsWith('csrftoken='))
    ?.slice('csrftoken='.length)
}

export async function fetchHealthCheck(): Promise<{ status: string }> {
  const response = await fetch(`${apiBaseUrl}/health/`)
  if (!response.ok) {
    throw new Error(`Health check failed (${response.status})`)
  }
  return response.json()
}
