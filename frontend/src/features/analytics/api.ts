import { apiBaseUrl } from '../../api'
import { sessionFetch } from '../auth/sessionFetch'

export type Report = 'availability' | 'utilization' | 'borrowing' | 'borrowers'
export interface Filters { category_id: string; equipment_type_id: string; year: string }
export interface Options {
  categories: { category_id: number; name: string; is_deleted: boolean }[]
  equipment_types: { type_id: number; category_id: number; name: string; is_deleted: boolean }[]
  years: number[]
}
export interface AvailabilityRow {
  label: string
  available: number
  on_loan: number
  under_maintenance: number
  retired: number
  total: number
}
export interface LendingReport {
  year: number
  as_of: string
  rows: { label: string; value: number }[]
  summary: {
    transactions: number
    total_loan_days: number
    average_duration: number
    overdue_rate: number
  }
}
export class AnalyticsRequestError extends Error {
  readonly status: number

  constructor(status: number, message?: string) {
    super(message ?? (status === 403 ? 'Sign in or ask for access to analytics.'
      : status === 400 ? 'Check the selected analytics filters and try again.'
        : 'Could not load analytics. Please try again.'))
    this.name = 'AnalyticsRequestError'
    this.status = status
  }
}
async function request<T>(path: string, signal?: AbortSignal): Promise<T> {
  const response = await sessionFetch(`${apiBaseUrl}/analytics/${path}`, {
    credentials: 'include', signal,
  })
  if (!response.ok) throw new AnalyticsRequestError(response.status)
  return response.json()
}
export function fetchOptions(signal?: AbortSignal) {
  return request<Options>('options/', signal)
}
export async function fetchReport(report: Report, filters: Filters, signal?: AbortSignal) {
  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(filters)) {
    if (value) params.set(key, value)
  }
  params.set('report', report === 'availability' ? 'borrowing' : report)
  const lending = await request<LendingReport>(`lending/?${params}`, signal)
  let availability: AvailabilityRow[] = []
  if (report === 'availability') {
    params.delete('year')
    params.delete('report')
    availability = (await request<{ rows: AvailabilityRow[] }>(`availability-summary/?${params}`, signal)).rows
  }
  return { lending, availability }
}

export type ExportScope = 'current' | 'all'

export async function fetchAnalyticsExport(
  reports: Report[], scope: ExportScope, filters: Filters, signal?: AbortSignal,
): Promise<Blob> {
  const params = new URLSearchParams({ scope })
  reports.forEach(report => params.append('reports', report))
  if (scope === 'current') {
    for (const [key, value] of Object.entries(filters)) {
      if (value) params.set(key, value)
    }
  }
  const response = await sessionFetch(`${apiBaseUrl}/analytics/exports/?${params}`, {
    credentials: 'include', signal,
  })
  if (!response.ok) {
    throw new AnalyticsRequestError(response.status,
      response.status === 403 ? 'Sign in or ask for access to analytics.'
        : response.status === 400 ? 'Check the selected export reports and filters.'
          : 'Could not export reports. Please try again.')
  }
  return response.blob()
}
