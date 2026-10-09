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

export class AssetLookupError extends Error {
  readonly status: number

  constructor(status: number) {
    super(`Asset lookup failed (${status})`)
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
