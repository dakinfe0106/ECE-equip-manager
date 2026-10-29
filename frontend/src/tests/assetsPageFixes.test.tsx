// @vitest-environment jsdom
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'
import { MemoryRouter } from 'react-router'
import { apiBaseUrl } from '../api'
import type { AssetRecord } from '../features/assets/api'
import AssetsPage from '../pages/AssetsPage'
import { withAuth } from './authTestUtils'

const tools = { category_id: 1, name: 'Tools' }
const drills = { type_id: 1, name: 'Drills', description: '', category: tools }

let db: AssetRecord[] = []
let requested: URLSearchParams[] = []

const makeAsset = (id: number): AssetRecord => ({
  asset_id: id,
  asset_identifier: `A-${String(id).padStart(3, '0')}`,
  name: `Asset ${id}`,
  acquisition_date: null,
  status: 'Available',
  equipment_type: drills,
})

// Behaves like the backend: ordered by asset_id, 20 per page, search matches ID or name.
const server = setupServer(
  http.get(`${apiBaseUrl}/assets/`, ({ request }) => {
    const params = new URL(request.url).searchParams
    requested.push(params)
    const page = Number(params.get('page') ?? '1')
    const search = params.get('search')?.toLowerCase() ?? ''
    const categoryId = params.get('category_id')
    const matches = db
      .filter((asset) =>
        `${asset.asset_identifier} ${asset.name}`.toLowerCase().includes(search),
      )
      .filter((asset) => !categoryId || String(asset.equipment_type.category.category_id) === categoryId)
      .sort((a, b) => a.asset_id - b.asset_id)
    return HttpResponse.json({
      count: matches.length,
      next: null,
      previous: null,
      results: matches.slice((page - 1) * 20, page * 20),
    })
  }),
  http.post(`${apiBaseUrl}/assets/`, async ({ request }) => {
    const body = (await request.json()) as { asset_identifier: string; name: string }
    const created = { ...makeAsset(db.length + 1), ...body }
    db.push(created)
    return HttpResponse.json(created, { status: 201 })
  }),
  http.get(`${apiBaseUrl}/categories/`, () => HttpResponse.json([tools])),
  http.get(`${apiBaseUrl}/equipment-types/`, () =>
    HttpResponse.json([{ ...drills, category_id: 1 }]),
  ),
)

function renderAssetsPage() {
  return render(<MemoryRouter>{withAuth(<AssetsPage />)}</MemoryRouter>)
}

async function addAsset(user: ReturnType<typeof userEvent.setup>, identifier: string, name: string) {
  await user.click(screen.getByRole('button', { name: 'Add Asset' }))
  await user.type(screen.getByLabelText(/Asset ID/), identifier)
  await user.type(screen.getByLabelText(/Asset name/i), name)
  await user.selectOptions(await screen.findByLabelText(/Category/), '1')
  await user.selectOptions(await screen.findByLabelText(/Equipment type/), '1')
  await user.click(screen.getByRole('button', { name: 'Save Asset' }))
  await screen.findByText(`Asset ${identifier} was added successfully.`)
}

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))
beforeEach(() => {
  db = Array.from({ length: 25 }, (_, index) => makeAsset(index + 1))
  requested = []
})
afterEach(() => {
  cleanup()
  server.resetHandlers()
})
afterAll(() => server.close())

describe('Assets page after creating an asset', () => {
  it('keeps the new asset visible on page 1, even though the API lists it last', async () => {
    const user = userEvent.setup()
    renderAssetsPage()
    await screen.findByText('Page 1 of 2')

    await addAsset(user, 'NEW-001', 'Brand new asset')

    expect(screen.getByText('Brand new asset')).toBeTruthy()
    expect(screen.getByText('Showing 1–20 of 26 assets')).toBeTruthy()
    expect(screen.getByText('Page 1 of 2')).toBeTruthy()
  })

  it('keeps the new asset visible from page 2 without jumping to page 1', async () => {
    const user = userEvent.setup()
    renderAssetsPage()
    await screen.findByText('Page 1 of 2')
    await user.click(screen.getByRole('button', { name: 'Next' }))
    await screen.findByText('Page 2 of 2')

    await addAsset(user, 'NEW-002', 'Second new asset')

    expect(screen.getByText('Second new asset')).toBeTruthy()
    expect(screen.getByText('Page 2 of 2')).toBeTruthy()
  })

  it('keeps the search and filters the user had applied', async () => {
    const user = userEvent.setup()
    renderAssetsPage()
    await screen.findByText('Page 1 of 2')
    await user.type(screen.getByRole('searchbox'), 'Asset 1{Enter}')
    await screen.findByText('Showing 1–11 of 11 assets')
    await user.click(screen.getByRole('button', { name: /Filters/ }))
    await user.selectOptions(screen.getByLabelText('Category'), '1')
    await user.click(screen.getByRole('button', { name: 'Apply filters' }))
    await waitFor(() => expect(requested.at(-1)?.get('category_id')).toBe('1'))

    await addAsset(user, 'NEW-003', 'Asset 100')

    expect((screen.getByRole('searchbox') as HTMLInputElement).value).toBe('Asset 1')
    expect(screen.getByRole('button', { name: /Filters/ }).textContent).toContain('1')
    expect(screen.getByText('Asset 100')).toBeTruthy()
  })

  it('opens the new asset from the success message', async () => {
    const user = userEvent.setup()
    renderAssetsPage()
    await screen.findByText('Page 1 of 2')
    await addAsset(user, 'NEW-004', 'Viewable asset')

    await user.click(screen.getByRole('button', { name: 'View asset' }))

    expect(
      screen.getByRole('button', { name: 'View details for asset NEW-004' }).closest('tr')?.className,
    ).toContain('row-selected')
  })

  it('shows the new asset in its group in the Category view', async () => {
    const user = userEvent.setup()
    renderAssetsPage()
    await screen.findByText('Page 1 of 2')
    await user.selectOptions(screen.getByLabelText('View by'), 'category')
    await screen.findByText('Showing 25 assets in 1 category')

    await addAsset(user, 'NEW-005', 'Grouped new asset')

    expect(await screen.findByText('Showing 26 assets in 1 category')).toBeTruthy()
    expect(screen.getByText('Grouped new asset')).toBeTruthy()
  })
})

describe('Assets page keyboard access', () => {
  it('closes Add Asset with Escape from anywhere and returns focus to the button', async () => {
    const user = userEvent.setup()
    renderAssetsPage()
    await screen.findByText('Page 1 of 2')
    const addButton = screen.getByRole('button', { name: 'Add Asset' })
    await user.click(addButton)
    expect(screen.getByRole('dialog', { name: 'Add Asset' })).toBeTruthy()

    ;(document.activeElement as HTMLElement | null)?.blur()
    await user.keyboard('{Escape}')

    expect(screen.queryByRole('dialog', { name: 'Add Asset' })).toBeNull()
    expect(document.activeElement).toBe(addButton)
  })

  it('keeps Tab inside the Add Asset dialog', async () => {
    const user = userEvent.setup()
    renderAssetsPage()
    await screen.findByText('Page 1 of 2')
    await user.click(screen.getByRole('button', { name: 'Add Asset' }))
    const dialog = screen.getByRole('dialog', { name: 'Add Asset' })

    for (let press = 0; press < 15; press += 1) {
      await user.tab()
      expect(dialog.contains(document.activeElement)).toBe(true)
    }
  })

  it('focuses the Filters panel and closes it with Escape or an outside click', async () => {
    const user = userEvent.setup()
    renderAssetsPage()
    await screen.findByText('Page 1 of 2')
    const trigger = screen.getByRole('button', { name: /Filters/ })

    await user.click(trigger)
    expect(document.activeElement).toBe(screen.getByLabelText('Category'))
    await user.keyboard('{Escape}')
    expect(screen.queryByRole('dialog', { name: 'Filter assets' })).toBeNull()
    expect(document.activeElement).toBe(trigger)

    await user.click(trigger)
    await user.click(screen.getByRole('heading', { name: 'Assets' }))
    expect(screen.queryByRole('dialog', { name: 'Filter assets' })).toBeNull()
  })
})

describe('Assets page retry', () => {
  it('retries with the applied filters', async () => {
    const user = userEvent.setup()
    renderAssetsPage()
    await screen.findByText('Page 1 of 2')
    await user.click(screen.getByRole('button', { name: /Filters/ }))
    await user.selectOptions(screen.getByLabelText('Category'), '1')
    let failNext = true
    server.use(http.get(`${apiBaseUrl}/assets/`, ({ request }) => {
      if (!failNext) return undefined
      failNext = false
      requested.push(new URL(request.url).searchParams)
      return HttpResponse.json({ detail: 'Try later.' }, { status: 503 })
    }))
    await user.click(screen.getByRole('button', { name: 'Apply filters' }))
    await screen.findByText('Try later.')

    await user.click(screen.getByRole('button', { name: 'Try again' }))

    await screen.findByText('Page 1 of 2')
    expect(requested.at(-1)?.get('category_id')).toBe('1')
  })
})
