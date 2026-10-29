// @vitest-environment jsdom
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'
import { MemoryRouter } from 'react-router'
import { apiBaseUrl } from '../api'
import AssetsPage from '../pages/AssetsPage'
import { withAuth } from './authTestUtils'

type Category = { category_id: number; name: string }
type EquipmentType = { type_id: number; name: string; description: string; category_id: number; category: Category }

let categories: Category[] = []
let types: EquipmentType[] = []
let posts: { path: string; body: Record<string, unknown>; csrf: string | null }[] = []
let assetCreateFailures = 0
let categoryRequests = 0

const server = setupServer(
  http.get(`${apiBaseUrl}/assets/`, () =>
    HttpResponse.json({ count: 0, next: null, previous: null, results: [] }),
  ),
  http.get(`${apiBaseUrl}/categories/`, () => {
    categoryRequests += 1
    return HttpResponse.json(categories)
  }),
  http.get(`${apiBaseUrl}/equipment-types/`, ({ request }) => {
    const categoryId = new URL(request.url).searchParams.get('category_id')
    return HttpResponse.json(
      types.filter((type) => !categoryId || String(type.category_id) === categoryId),
    )
  }),
  http.post(`${apiBaseUrl}/categories/`, async ({ request }) => {
    const body = (await request.json()) as { name: string }
    posts.push({ path: 'categories', body, csrf: request.headers.get('X-CSRFToken') })
    const category = { category_id: categories.length + 10, name: body.name }
    categories.push(category)
    return HttpResponse.json(category, { status: 201 })
  }),
  http.post(`${apiBaseUrl}/equipment-types/`, async ({ request }) => {
    const body = (await request.json()) as { name: string; category_id: number }
    posts.push({ path: 'equipment-types', body, csrf: request.headers.get('X-CSRFToken') })
    const category = categories.find((item) => item.category_id === body.category_id)!
    const type = {
      type_id: types.length + 20,
      name: body.name,
      description: '',
      category_id: body.category_id,
      category,
    }
    types.push(type)
    return HttpResponse.json(type, { status: 201 })
  }),
  http.post(`${apiBaseUrl}/assets/`, async ({ request }) => {
    const body = (await request.json()) as {
      asset_identifier: string
      name: string
      equipment_type_id: number
    }
    posts.push({ path: 'assets', body, csrf: request.headers.get('X-CSRFToken') })
    if (assetCreateFailures > 0) {
      assetCreateFailures -= 1
      return HttpResponse.json(
        { asset_identifier: ['An asset with this Asset ID already exists.'] },
        { status: 400 },
      )
    }
    const type = types.find((item) => item.type_id === body.equipment_type_id)!
    return HttpResponse.json(
      {
        asset_id: 1,
        asset_identifier: body.asset_identifier,
        name: body.name,
        acquisition_date: null,
        status: 'Available',
        equipment_type: { type_id: type.type_id, name: type.name, description: '', category: type.category },
      },
      { status: 201 },
    )
  }),
)

function renderAssetsPage() {
  return render(<MemoryRouter>{withAuth(<AssetsPage />)}</MemoryRouter>)
}

async function openAddAsset(user: ReturnType<typeof userEvent.setup>) {
  await screen.findByText('No active assets are available.')
  await user.click(screen.getByRole('button', { name: 'Add Asset' }))
  await user.type(screen.getByLabelText(/Asset ID/), 'NEW-001')
  await user.type(screen.getByLabelText(/Asset name/i), 'Bench meter')
}

const categorySelect = () => screen.getByRole('combobox', { name: /^Category/ })
const typeSelect = () => screen.getByRole('combobox', { name: /^Equipment type/ })

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))
beforeEach(() => {
  const tools = { category_id: 1, name: 'Tools' }
  categories = [tools]
  types = [{ type_id: 1, name: 'Drills', description: '', category_id: 1, category: tools }]
  posts = []
  assetCreateFailures = 0
  categoryRequests = 0
  document.cookie = 'csrftoken=test-token'
})
afterEach(() => {
  cleanup()
  server.resetHandlers()
})
afterAll(() => server.close())

describe('Add Asset with a new category or equipment type', () => {
  it('creates a new category, a new type in it, then the asset', async () => {
    const user = userEvent.setup()
    renderAssetsPage()
    await openAddAsset(user)

    await screen.findByRole('option', { name: 'Tools' })
    await user.selectOptions(categorySelect(), '__new__')
    expect(screen.queryByRole('combobox', { name: /^Equipment type/ })).toBeNull()
    await user.type(screen.getByLabelText(/Category name/), '  Test Equipment ')
    await user.type(screen.getByLabelText(/Equipment type name/), 'Multimeters')
    await user.click(screen.getByRole('button', { name: 'Save Asset' }))

    expect(await screen.findByText('Asset NEW-001 was added successfully.')).toBeTruthy()
    expect(posts.map((post) => post.path)).toEqual(['categories', 'equipment-types', 'assets'])
    expect(posts[0].body).toEqual({ name: 'Test Equipment' })
    expect(posts[1].body).toEqual({ name: 'Multimeters', category_id: 11 })
    expect(posts[2].body.equipment_type_id).toBe(21)
    expect(posts.every((post) => post.csrf === 'test-token')).toBe(true)
  })

  it('creates a new type in an existing category', async () => {
    const user = userEvent.setup()
    renderAssetsPage()
    await openAddAsset(user)

    await screen.findByRole('option', { name: 'Tools' })
    await user.selectOptions(categorySelect(), '1')
    await screen.findByRole('option', { name: 'Drills' })
    await user.selectOptions(typeSelect(), '__new__')
    await user.type(screen.getByLabelText(/Equipment type name/), 'Saws')
    await user.click(screen.getByRole('button', { name: 'Save Asset' }))

    await screen.findByText('Asset NEW-001 was added successfully.')
    expect(posts.map((post) => post.path)).toEqual(['equipment-types', 'assets'])
    expect(posts[0].body).toEqual({ name: 'Saws', category_id: 1 })
  })

  it('does not create the category twice when the asset fails and the user tries again', async () => {
    const user = userEvent.setup()
    assetCreateFailures = 1
    renderAssetsPage()
    await openAddAsset(user)
    await screen.findByRole('option', { name: 'Tools' })
    await user.selectOptions(categorySelect(), '__new__')
    await user.type(screen.getByLabelText(/Category name/), 'Optics')
    await user.type(screen.getByLabelText(/Equipment type name/), 'Lenses')

    await user.click(screen.getByRole('button', { name: 'Save Asset' }))
    expect(await screen.findByText('An asset with this Asset ID already exists.')).toBeTruthy()
    expect((categorySelect() as HTMLSelectElement).selectedOptions[0].textContent).toBe('Optics')
    expect((typeSelect() as HTMLSelectElement).selectedOptions[0].textContent).toBe('Lenses')

    await user.click(screen.getByRole('button', { name: 'Save Asset' }))
    await screen.findByText('Asset NEW-001 was added successfully.')
    expect(posts.map((post) => post.path)).toEqual([
      'categories',
      'equipment-types',
      'assets',
      'assets',
    ])
  })

  it('lets the first category be created when none exist yet', async () => {
    const user = userEvent.setup()
    categories = []
    types = []
    renderAssetsPage()
    await openAddAsset(user)

    expect(await screen.findByText(/No categories yet/)).toBeTruthy()
    expect((categorySelect() as HTMLSelectElement).disabled).toBe(false)
    await user.selectOptions(categorySelect(), '__new__')
    await user.type(screen.getByLabelText(/Category name/), 'First Category')
    await user.type(screen.getByLabelText(/Equipment type name/), 'First Type')
    await user.click(screen.getByRole('button', { name: 'Save Asset' }))

    await screen.findByText('Asset NEW-001 was added successfully.')
  })

  it('requires the new names before saving', async () => {
    const user = userEvent.setup()
    renderAssetsPage()
    await openAddAsset(user)
    await screen.findByRole('option', { name: 'Tools' })
    await user.selectOptions(categorySelect(), '__new__')

    await user.click(screen.getByRole('button', { name: 'Save Asset' }))

    expect(await screen.findByText('Please complete all required fields.')).toBeTruthy()
    expect(posts).toEqual([])
  })

  it('shows the new category in the Filters panel afterwards', async () => {
    const user = userEvent.setup()
    renderAssetsPage()
    await openAddAsset(user)
    await screen.findByRole('option', { name: 'Tools' })
    await user.selectOptions(categorySelect(), '__new__')
    await user.type(screen.getByLabelText(/Category name/), 'Optics')
    await user.type(screen.getByLabelText(/Equipment type name/), 'Lenses')
    await user.click(screen.getByRole('button', { name: 'Save Asset' }))
    await screen.findByText('Asset NEW-001 was added successfully.')
    // Page load, modal load, and the page's reload after the create.
    await waitFor(() => expect(categoryRequests).toBe(3))

    await user.click(screen.getByRole('button', { name: /Filters/ }))
    expect(screen.getByRole('option', { name: 'Optics' })).toBeTruthy()
  })
})
