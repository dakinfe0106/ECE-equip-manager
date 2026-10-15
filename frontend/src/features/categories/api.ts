import { apiBaseUrl } from '../../api'

export interface Category {
  category_id: number
  name: string
  is_deleted: boolean
  equipment_type_count: number
}

export interface EquipmentType {
  type_id: number
  name: string
  description: string
  category: { category_id: number; name: string }
}

// 'false' = active records, 'true' = soft-deleted records, 'all' = both.
export type DeletedFilter = 'false' | 'true' | 'all'

// Choices for the "Show:" dropdown.
export const showOptions: { value: DeletedFilter; label: string }[] = [
  { value: 'false', label: 'Active Records' },
  { value: 'true', label: 'Deleted Records' },
  { value: 'all', label: 'All Records' },
]

export interface CategoryQuery {
  deleted?: DeletedFilter
  search?: string
}

export class CategoryRequestError extends Error {
  readonly status: number

  constructor(status: number) {
    super(`Category request failed (${status})`)
    this.name = 'CategoryRequestError'
    this.status = status
  }
}

// Business endpoints need the Django session cookie, so requests include credentials.
async function getJson<T>(path: string, signal?: AbortSignal): Promise<T> {
  const response = await fetch(`${apiBaseUrl}${path}`, {
    credentials: 'include',
    signal,
  })
  if (!response.ok) {
    throw new CategoryRequestError(response.status)
  }
  return response.json() as Promise<T>
}

// Turns a failed request into a short message for the person using the page.
export function describeCategoryError(error: unknown, what: string): string {
  if (error instanceof CategoryRequestError) {
    if (error.status === 403) {
      return `You need to be signed in to view ${what}.`
    }
    if (error.status === 404) {
      return `We couldn't find ${what}.`
    }
    return `Could not load ${what} (error ${error.status}).`
  }
  return `Could not reach the server to load ${what}.`
}

export function fetchCategories(
  { deleted = 'false', search = '' }: CategoryQuery = {},
  signal?: AbortSignal,
): Promise<Category[]> {
  const params = new URLSearchParams({ deleted })
  if (search.trim()) {
    params.set('search', search.trim())
  }
  return getJson<Category[]>(`/categories/summary/?${params}`, signal)
}

export function fetchCategoryEquipmentTypes(
  id: string,
  signal?: AbortSignal,
): Promise<EquipmentType[]> {
  return getJson<EquipmentType[]>(
    `/categories/${encodeURIComponent(id)}/equipment-types/`,
    signal,
  )
}
