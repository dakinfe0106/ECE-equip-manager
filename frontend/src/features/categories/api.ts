import { apiBaseUrl, getCsrfToken } from '../../api'

export interface CategoryRecord {
  category_id: number
  name: string
}

export class CategoryRequestError extends Error {
  readonly status: number

  constructor(status: number, message: string) {
    super(message)
    this.name = 'CategoryRequestError'
    this.status = status
  }
}

export async function fetchCategories(): Promise<CategoryRecord[]> {
  const response = await fetch(`${apiBaseUrl}/categories/`, {
    credentials: 'include',
  })
  if (!response.ok) {
    throw new CategoryRequestError(
      response.status,
      `Could not load categories (${response.status})`,
    )
  }
  return response.json()
}

export async function createCategory(name: string): Promise<CategoryRecord> {
  const headers = new Headers({ 'Content-Type': 'application/json' })
  const csrfToken = getCsrfToken()
  if (csrfToken) {
    headers.set('X-CSRFToken', decodeURIComponent(csrfToken))
  }

  const response = await fetch(`${apiBaseUrl}/categories/`, {
    method: 'POST',
    headers,
    credentials: 'include',
    body: JSON.stringify({ name }),
  })
  if (!response.ok) {
    let message = `Could not save category (${response.status})`
    try {
      const body: unknown = await response.json()
      if (typeof body === 'object' && body !== null && 'name' in body) {
        message = String(body.name)
      } else if (typeof body === 'object' && body !== null && 'detail' in body) {
        message = String(body.detail)
      }
    } catch {
      // Keep the explicit HTTP failure message when the response has no JSON body.
    }
    throw new CategoryRequestError(response.status, message)
  }
  return response.json()
}

// Client-side hint only; the server makes the final duplicate check.
export function findDuplicateCategory(
  name: string,
  categories: CategoryRecord[],
): CategoryRecord | undefined {
  const normalizedName = name.trim().toLowerCase()
  if (!normalizedName) {
    return undefined
  }
  return categories.find(
    (category) => category.name.trim().toLowerCase() === normalizedName,
  )
}
