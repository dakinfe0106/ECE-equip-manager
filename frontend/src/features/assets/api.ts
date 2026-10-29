import { apiBaseUrl } from '../../api'
import { sessionFetch } from '../auth/sessionFetch'

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
    required_certifications?: {
      certification_id: number
      name: string
    }[]
    category: {
      category_id: number
      name: string
    }
  }
}

export type AssetStatus = AssetRecord['status']

// Display labels only; always send the API values back to the API.
export const assetStatusLabels: Record<AssetStatus, string> = {
  Available: 'Available',
  On_Loan: 'On Loan',
  Under_Maintenance: 'Under Maintenance',
  Retired: 'Retired',
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

export interface AssetFilters {
  categoryId?: number | null
  equipmentTypeId?: number | null
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
  const response = await sessionFetch(url, { credentials: 'include' })
  if (!response.ok) {
    throw await responseError(response, action)
  }
  return response.json()
}

export function fetchCategories(): Promise<CategoryOption[]> {
  return fetchJson(`${apiBaseUrl}/categories/`, 'Category lookup')
}

export function fetchEquipmentTypes(categoryId?: number): Promise<EquipmentTypeOption[]> {
  const params = new URLSearchParams()
  if (categoryId !== undefined) {
    params.set('category_id', categoryId.toString())
  }
  const queryString = params.toString()
  const query = queryString ? `?${queryString}` : ''
  return fetchJson(`${apiBaseUrl}/equipment-types/${query}`, 'Equipment type lookup')
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

  const response = await sessionFetch(`${apiBaseUrl}/assets/`, {
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

export async function fetchAssets(
  page = 1,
  search = '',
  filters: AssetFilters = {},
): Promise<PaginatedAssets> {
  const params = new URLSearchParams({ page: page.toString() })
  const trimmedSearch = search.trim()
  if (trimmedSearch) {
    params.set('search', trimmedSearch)
  }
  if (filters.categoryId) {
    params.set('category_id', filters.categoryId.toString())
  }
  if (filters.equipmentTypeId) {
    params.set('equipment_type_id', filters.equipmentTypeId.toString())
  }
  const response = await sessionFetch(`${apiBaseUrl}/assets/?${params}`, {
    credentials: 'include',
  })
  if (!response.ok) {
    throw await responseError(response, 'Asset lookup')
  }
  return response.json()
}

// Grouped views need every matching asset, but the list API returns one page at a time.
export async function fetchAllAssets(
  search = '',
  filters: AssetFilters = {},
): Promise<AssetRecord[]> {
  const firstPage = await fetchAssets(1, search, filters)
  const pageSize = firstPage.results.length
  const pageCount = pageSize ? Math.ceil(firstPage.count / pageSize) : 1
  const otherPages = await Promise.all(
    Array.from({ length: pageCount - 1 }, (_, index) => fetchAssets(index + 2, search, filters)),
  )
  return [firstPage, ...otherPages].flatMap((page) => page.results)
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

  const response = await sessionFetch(`${apiBaseUrl}/assets/${assetId}/`, {
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
