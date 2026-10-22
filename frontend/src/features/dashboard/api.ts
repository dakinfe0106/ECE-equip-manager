import { apiBaseUrl } from '../../api'

export interface DashboardSummary {
  total_assets: number
  available_assets: number
  on_loan_assets: number
  under_maintenance_assets: number
}

export class DashboardLookupError extends Error {
  readonly status: number

  constructor(status: number, message = `Dashboard lookup failed (${status})`) {
    super(message)
    this.name = 'DashboardLookupError'
    this.status = status
  }
}

export async function fetchDashboardSummary(): Promise<DashboardSummary> {
  const response = await fetch(`${apiBaseUrl}/dashboard/`, {
    credentials: 'include',
  })

  if (!response.ok) {
    throw new DashboardLookupError(response.status)
  }

  return response.json()
}