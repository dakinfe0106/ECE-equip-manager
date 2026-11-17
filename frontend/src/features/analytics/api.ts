import { apiBaseUrl } from '../../api'
import { sessionFetch } from '../auth/sessionFetch'

export type AnalyticsView = 'availability' | 'utilization' | 'borrowing' | 'borrowers'

export interface AnalyticsFilters {
  year?: number | null
  categoryId?: number | null
  equipmentTypeId?: number | null
  search?: string
}

export interface AvailabilityRow {
  category_id: number
  category_name: string
  equipment_type_id: number
  equipment_type_name: string
  total_assets: number
  available_assets: number
  on_loan_assets: number
  under_maintenance_assets: number
  retired_assets: number
}

export interface UtilizationRow {
  asset_id: number
  asset_identifier: string
  asset_name: string
  category_id: number
  category_name: string
  equipment_type_id: number
  equipment_type_name: string
  loan_count: number
  total_loan_days: number
  average_loan_days: number | null
}

export interface BorrowingSummary {
  year: number | null
  total_loans: number
  completed_loans: number
  active_loans: number
  overdue_loans: number
  intact_returns: number
  damaged_returns: number
}

export interface BorrowerActivityRow {
  borrower_id: number
  unb_id: string
  first_name: string
  last_name: string
  total_loans: number
  completed_loans: number
  active_loans: number
  overdue_loans: number
  damaged_returns: number
}

export type AnalyticsReport =
  | { results: AvailabilityRow[] }
  | { year: number | null; results: UtilizationRow[] }
  | BorrowingSummary
  | { year: number | null; results: BorrowerActivityRow[] }

export class AnalyticsRequestError extends Error {
  readonly status: number

  constructor(status: number, message = `Analytics request failed (${status})`) {
    super(message)
    this.name = 'AnalyticsRequestError'
    this.status = status
  }
}

const reportPaths: Record<AnalyticsView, string> = {
  availability: 'availability/',
  utilization: 'utilization/',
  borrowing: 'borrowing/',
  borrowers: 'borrowers/',
}

function reportUrl(view: AnalyticsView, filters: AnalyticsFilters, exportXlsx = false) {
  const params = new URLSearchParams()
  if (filters.year) params.set('year', String(filters.year))
  if (filters.categoryId) params.set('category_id', String(filters.categoryId))
  if (filters.equipmentTypeId) params.set('equipment_type_id', String(filters.equipmentTypeId))
  if (view === 'borrowers' && filters.search?.trim()) {
    params.set('search', filters.search.trim())
  }
  if (exportXlsx) params.set('export', 'xlsx')
  const query = params.size ? `?${params.toString()}` : ''
  return `${apiBaseUrl}/analytics/${reportPaths[view]}${query}`
}

async function throwResponseError(response: Response): Promise<AnalyticsRequestError> {
  let message = `Analytics request failed (${response.status})`
  try {
    const body: unknown = await response.json()
    if (typeof body === 'object' && body !== null) {
      const firstValue = Object.values(body).flatMap((value) =>
        Array.isArray(value) ? value : [value],
      ).find((value) => typeof value === 'string')
      if (typeof firstValue === 'string') message = firstValue
    }
  } catch {
    // Keep the HTTP status message when the error has no JSON body.
  }
  return new AnalyticsRequestError(response.status, message)
}

export async function fetchAnalyticsYears(): Promise<number[]> {
  const response = await sessionFetch(`${apiBaseUrl}/analytics/years/`, {
    credentials: 'include',
  })
  if (!response.ok) throw await throwResponseError(response)
  const body: { years: number[] } = await response.json()
  return body.years
}

export async function fetchAnalyticsReport(
  view: AnalyticsView,
  filters: AnalyticsFilters,
): Promise<AnalyticsReport> {
  const response = await sessionFetch(reportUrl(view, filters), {
    credentials: 'include',
  })
  if (!response.ok) throw await throwResponseError(response)
  return response.json()
}

export async function downloadAnalyticsReport(
  view: AnalyticsView,
  filters: AnalyticsFilters,
): Promise<void> {
  const response = await sessionFetch(reportUrl(view, filters, true), {
    credentials: 'include',
  })
  if (!response.ok) throw await throwResponseError(response)

  const filename = `ems-${view}-analytics.xlsx`
  const objectUrl = URL.createObjectURL(await response.blob())
  const link = document.createElement('a')
  link.href = objectUrl
  link.download = filename
  document.body.append(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(objectUrl)
}
