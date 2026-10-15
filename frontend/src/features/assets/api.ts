import { apiBaseUrl, getCsrfToken } from '../../api'

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

export class AssetLookupError extends Error {
  readonly status: number

  constructor(status: number, message = `Asset lookup failed (${status})`) {
    super(message)
    this.name = 'AssetLookupError'
    this.status = status
  }
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
    let message = `Asset update failed (${response.status})`
    try {
      const body: unknown = await response.json()
      if (typeof body === 'object' && body !== null && 'detail' in body) {
        message = String(body.detail)
      } else if (
        typeof body === 'object' &&
        body !== null &&
        'asset_identifier' in body
      ) {
        message = String(body.asset_identifier)
      }
    } catch {
      // Keep the explicit HTTP failure message when the response has no JSON body.
    }
    throw new AssetLookupError(response.status, message)
  }
  return response.json()
}
