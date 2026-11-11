import { apiBaseUrl } from '../../api'
import { sessionFetch } from '../auth/sessionFetch'
import { fetchCsrfToken } from '../auth/api'
import { fetchAssets, type AssetRecord } from '../assets/api'

export const maintenanceTypes = [
  'Inspection',
  'Preventative-care',
  'Repair',
  'Calibration',
  'Cleaning',
  'Software Service',
] as const

export type MaintenanceType = (typeof maintenanceTypes)[number]
export type MaintenancePriority = 'Low' | 'Medium' | 'High' | 'Urgent'
export type MaintenanceStatus = 'In Progress' | 'Completed'

export const maintenanceTypeLabels: Record<MaintenanceType, string> = {
  Inspection: 'Inspection',
  'Preventative-care': 'Preventative Care',
  Repair: 'Repair',
  Calibration: 'Calibration',
  Cleaning: 'Cleaning',
  'Software Service': 'Software Service',
}

export interface MaintenanceTechnician {
  id: number
  username: string
  first_name: string
  last_name: string
}

export interface MaintenanceRecord {
  maintenance_id: number
  asset: Pick<AssetRecord, 'asset_id' | 'asset_identifier' | 'name' | 'status'> & {
    equipment_type: string
  }
  technician: MaintenanceTechnician
  maintenance_type: MaintenanceType
  priority: MaintenancePriority
  start_date: string
  end_date: string | null
  status: MaintenanceStatus
}

export interface MaintenanceCreation {
  asset_id: number
  technician_id: number
  maintenance_type: MaintenanceType
  priority: MaintenancePriority
  start_date: string
}

export class MaintenanceRequestError extends Error {
  readonly status: number

  constructor(status: number, message: string) {
    super(message)
    this.name = 'MaintenanceRequestError'
    this.status = status
  }
}

async function responseError(response: Response, action: string) {
  let message = `${action} failed (${response.status})`
  try {
    const body: unknown = await response.json()
    if (typeof body === 'object' && body !== null) {
      const values = Object.values(body)
      const firstMessage = values
        .flatMap((value) => (Array.isArray(value) ? value : [value]))
        .find((value) => typeof value === 'string')
      if (typeof firstMessage === 'string') {
        message = firstMessage
      }
    }
  } catch {
    // Keep the HTTP failure message when the response has no JSON body.
  }
  return new MaintenanceRequestError(response.status, message)
}

async function fetchJson<T>(url: string, action: string): Promise<T> {
  const response = await sessionFetch(url, { credentials: 'include' })
  if (!response.ok) {
    throw await responseError(response, action)
  }
  return response.json()
}

export function fetchMaintenanceTechnicians(): Promise<MaintenanceTechnician[]> {
  return fetchJson(
    `${apiBaseUrl}/maintenance-records/technicians/`,
    'Technician lookup',
  )
}

export async function fetchAvailableMaintenanceAssets(
  assetIdentifier = '',
): Promise<AssetRecord[]> {
  const response = await fetchAssets(1, assetIdentifier, 'Available')
  return response.results
}

async function sendMaintenanceRequest<T>(
  url: string,
  action: string,
  body: object,
): Promise<T> {
  const csrfToken = await fetchCsrfToken()
  const response = await sessionFetch(url, {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      'X-CSRFToken': csrfToken,
    },
    body: JSON.stringify(body),
  })
  if (!response.ok) {
    throw await responseError(response, action)
  }
  return response.json()
}

export function createMaintenanceRecord(
  record: MaintenanceCreation,
): Promise<MaintenanceRecord> {
  return sendMaintenanceRequest(
    `${apiBaseUrl}/maintenance-records/`,
    'Maintenance creation',
    record,
  )
}

export function describeMaintenanceError(error: unknown, action: string): string {
  if (error instanceof MaintenanceRequestError && error.status === 403) {
    return 'Your account does not have permission to access maintenance records.'
  }
  return error instanceof Error ? error.message : `Could not ${action}.`
}
