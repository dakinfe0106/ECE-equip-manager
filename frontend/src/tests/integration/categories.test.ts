import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'
import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'
import { apiBaseUrl } from '../../api'
import {
  CategoryRequestError,
  describeCategoryError,
  fetchCategories,
  fetchCategoryEquipmentTypes,
  type Category,
} from '../../features/categories/api'

const tools: Category = { category_id: 1, name: 'Tools', is_deleted: false, equipment_type_count: 2 }

const server = setupServer()

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))
afterEach(() => server.resetHandlers())
afterAll(() => server.close())

describe('fetchCategories', () => {
  it('asks for active categories by default and returns the list', async () => {
    let requestUrl: URL | undefined
    server.use(
      http.get(`${apiBaseUrl}/categories/summary/`, ({ request }) => {
        requestUrl = new URL(request.url)
        return HttpResponse.json([tools])
      }),
    )

    const categories = await fetchCategories()

    expect(categories).toEqual([tools])
    expect(requestUrl?.searchParams.get('deleted')).toBe('false')
    expect(requestUrl?.searchParams.has('search')).toBe(false)
  })

  it('sends the Show filter and a trimmed search term', async () => {
    let requestUrl: URL | undefined
    server.use(
      http.get(`${apiBaseUrl}/categories/summary/`, ({ request }) => {
        requestUrl = new URL(request.url)
        return HttpResponse.json([])
      }),
    )

    await fetchCategories({ deleted: 'all', search: '  lab gear ' })

    expect(requestUrl?.searchParams.get('deleted')).toBe('all')
    expect(requestUrl?.searchParams.get('search')).toBe('lab gear')
  })

  it('rejects with the status code when the server refuses the request', async () => {
    server.use(
      http.get(`${apiBaseUrl}/categories/summary/`, () => new HttpResponse(null, { status: 403 })),
    )

    const failure = await fetchCategories().catch((error: unknown) => error)

    expect(failure).toBeInstanceOf(CategoryRequestError)
    expect((failure as CategoryRequestError).status).toBe(403)
  })
})

describe('fetchCategoryEquipmentTypes', () => {
  it('loads the equipment types of one category', async () => {
    const types = [
      { type_id: 7, name: 'Screwdriver Set', description: '', category: { category_id: 1, name: 'Tools' } },
    ]
    server.use(
      http.get(`${apiBaseUrl}/categories/1/equipment-types/`, () => HttpResponse.json(types)),
    )

    expect(await fetchCategoryEquipmentTypes('1')).toEqual(types)
  })

  it('sends the session cookie with the request', async () => {
    let credentials: RequestCredentials | undefined
    server.use(
      http.get(`${apiBaseUrl}/categories/1/equipment-types/`, ({ request }) => {
        credentials = request.credentials
        return HttpResponse.json([])
      }),
    )

    await fetchCategoryEquipmentTypes('1')

    expect(credentials).toBe('include')
  })
})

describe('describeCategoryError', () => {
  it('explains that a permission is required after a 403', () => {
    expect(describeCategoryError(new CategoryRequestError(403), 'categories')).toBe(
      'Your account does not have permission to view categories.',
    )
  })

  it('says the item could not be found after a 404', () => {
    expect(describeCategoryError(new CategoryRequestError(404), 'this category')).toBe(
      "We couldn't find this category.",
    )
  })

  it('includes the status for other server errors', () => {
    expect(describeCategoryError(new CategoryRequestError(500), 'categories')).toBe(
      'Could not load categories (error 500).',
    )
  })

  it('reports an unreachable server for network failures', () => {
    expect(describeCategoryError(new TypeError('Failed to fetch'), 'categories')).toBe(
      'Could not reach the server to load categories.',
    )
  })
})
