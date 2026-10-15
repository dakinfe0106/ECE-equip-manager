import { apiBaseUrl } from '../../api'

export interface AssetRecord {
  asset_id: number
  asset_identifier: string
  name: string
  acquisition_date: string | null
  status: 'Available' | 'On_Loan' | 'Under_Maintenance' | 'Retired'
  equipment_type: {
    type_id: number
    name: string
    description: string
    category: {
      category_id: number
      name: string
    }
  }
}

export interface PaginatedAssets {
  count: number
  next: string | null
  previous: string | null
  results: AssetRecord[]
}

export interface CategoryOption {
  category_id: number
  name: string
}

export interface EquipmentTypeOption {
  type_id: number
  name: string
  description: string
  category_id: number
  category: CategoryOption
}

export interface AssetCreation {
  asset_identifier: string
  name: string
  equipment_type_id: number
  acquisition_date: string | null
}

export class AssetLookupError extends Error {
  readonly status: number

  constructor(status: number, message = `Asset lookup failed (${status})`) {
    super(message)
    this.name = 'AssetLookupError'
    this.status = status
  }
}

async function responseError(response: Response, action: string): Promise<AssetLookupError> {
  let message = `${action} failed (${response.status})`
  try {
    const body: unknown = await response.json()
    if (typeof body === 'object' && body !== null) {
      const values = Object.values(body)
      const firstMessage = values.flatMap((value) =>
        Array.isArray(value) ? value : [value],
      ).find((value) => typeof value === 'string')
      if (typeof firstMessage === 'string') {
        message = firstMessage
      }
    }
  } catch {
    // Keep the HTTP failure message if the response has no JSON body.
  }
  return new AssetLookupError(response.status, message)
}

async function fetchJson<T>(url: string, action: string): Promise<T> {
  const response = await fetch(url, { credentials: 'include' })
  if (!response.ok) {
    throw await responseError(response, action)
  }
  return response.json()
}

export function fetchCategories(): Promise<CategoryOption[]> {
  return fetchJson(`${apiBaseUrl}/categories/`, 'Category lookup')
}

export function fetchEquipmentTypes(categoryId: number): Promise<EquipmentTypeOption[]> {
  const params = new URLSearchParams({ category_id: categoryId.toString() })
  return fetchJson(`${apiBaseUrl}/equipment-types/?${params}`, 'Equipment type lookup')
}

function getCsrfToken(): string | undefined {
  if (typeof document === 'undefined') {
    return undefined
  }
  return document.cookie
    .split('; ')
    .find((cookie) => cookie.startsWith('csrftoken='))
    ?.slice('csrftoken='.length)
}

export async function createAsset(asset: AssetCreation): Promise<AssetRecord> {
  const headers = new Headers({ 'Content-Type': 'application/json' })
  const csrfToken = getCsrfToken()
  if (csrfToken) {
    headers.set('X-CSRFToken', decodeURIComponent(csrfToken))
  }

  const response = await fetch(`${apiBaseUrl}/assets/`, {
    method: 'POST',
    headers,
    credentials: 'include',
    body: JSON.stringify(asset),
  })
  if (!response.ok) {
    throw await responseError(response, 'Asset creation')
  }
  return response.json()
}

export async function fetchAssets(page = 1, assetIdentifier = ''): Promise<PaginatedAssets> {
  const params = new URLSearchParams({ page: page.toString() })
  const trimmedIdentifier = assetIdentifier.trim()
  if (trimmedIdentifier) {
    params.set('asset_identifier', trimmedIdentifier)
  }
  const response = await fetch(`${apiBaseUrl}/assets/?${params}`, {
    credentials: 'include',
  })
  if (!response.ok) {
    throw new AssetLookupError(response.status)
  }
  return response.json()
}

export type AssetUpdate = Pick<AssetRecord, 'name' | 'acquisition_date'>

export async function updateAsset(
  assetId: number,
  changes: AssetUpdate,
): Promise<AssetRecord> {
  const headers = new Headers({ 'Content-Type': 'application/json' })
  const csrfToken = getCsrfToken()
  if (csrfToken) {
    headers.set('X-CSRFToken', decodeURIComponent(csrfToken))
  }

  const response = await fetch(`${apiBaseUrl}/assets/${assetId}/`, {
    method: 'PATCH',
    headers,
    credentials: 'include',
    body: JSON.stringify(changes),
  })
  if (!response.ok) {
    throw await responseError(response, 'Asset update')
  }
  return response.json()
}
