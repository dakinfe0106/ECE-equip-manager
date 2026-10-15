import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'
import { setupServer } from 'msw/node'
import { http, HttpResponse } from 'msw'
import { apiBaseUrl } from '../api'
import {
  createCategory,
  fetchCategories,
  findDuplicateCategory,
} from '../features/categories/api'

const server = setupServer(
  http.get(`${apiBaseUrl}/categories/`, () => {
    return HttpResponse.json([{ category_id: 1, name: 'Tools' }])
  }),
  http.post(`${apiBaseUrl}/categories/`, async ({ request }) => {
    const { name } = await request.json() as { name: string }
    if (name.toLowerCase() === 'tools') {
      return HttpResponse.json(
        { name: ['A category with this name already exists.'] },
        { status: 400 },
      )
    }
    return HttpResponse.json({ category_id: 2, name }, { status: 201 })
  }),
)

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))
afterEach(() => server.resetHandlers())
afterAll(() => server.close())

describe('Category API', () => {
  it('fetches the category list', async () => {
    await expect(fetchCategories()).resolves.toEqual([{ category_id: 1, name: 'Tools' }])
  })

  it('creates a category', async () => {
    await expect(createCategory('Meters')).resolves.toEqual({ category_id: 2, name: 'Meters' })
  })

  it('reports the server duplicate-name error', async () => {
    await expect(createCategory('TOOLS')).rejects.toThrow(
      'A category with this name already exists.',
    )
  })
})

describe('findDuplicateCategory', () => {
  const categories = [{ category_id: 1, name: 'Tools' }]

  it('matches names ignoring case and surrounding spaces', () => {
    expect(findDuplicateCategory('  tOOLS ', categories)).toEqual(categories[0])
  })

  it('returns nothing for new or blank names', () => {
    expect(findDuplicateCategory('Meters', categories)).toBeUndefined()
    expect(findDuplicateCategory('   ', categories)).toBeUndefined()
  })
})
