// @vitest-environment jsdom
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'
import { MemoryRouter } from 'react-router'
import { apiBaseUrl } from '../api'
import type { AssetRecord } from '../features/assets/api'
import AssetsPage from '../pages/AssetsPage'
import { withAuth } from './authTestUtils'

const tools = { category_id: 1, name: 'Tools' }
const meters = { category_id: 2, name: 'Meters' }
const drills = { type_id: 10, name: 'Drills', description: '', category: tools }
const multimeters = { type_id: 20, name: 'Multimeters', description: '', category: meters }

// 25 assets, so the list needs two pages: 15 drills (Tools) and 10 multimeters (Meters).
const assets: AssetRecord[] = Array.from({ length: 25 }, (_, index) => ({
  asset_id: index + 1,
  asset_identifier: `A-${String(index + 1).padStart(2, '0')}`,
  name: `Asset ${index + 1}`,
  acquisition_date: null,
  status: 'Available',
  equipment_type: index < 15 ? drills : multimeters,
}))

let requested: URLSearchParams[] = []

// Pages and searches like the backend: ordered by asset_id, 20 per page.
const server = setupServer(
  http.get(`${apiBaseUrl}/assets/`, ({ request }) => {
    const params = new URL(request.url).searchParams
    requested.push(params)
    const page = Number(params.get('page'))
    const search = params.get('asset_identifier')?.toLowerCase() ?? ''
    const matches = assets.filter((asset) => asset.asset_identifier.toLowerCase().includes(search))
    return HttpResponse.json({
      count: matches.length,
      next: null,
      previous: null,
      results: matches.slice((page - 1) * 20, page * 20),
    })
  }),
)

function renderAssetsPage() {
  return render(<MemoryRouter>{withAuth(<AssetsPage />)}</MemoryRouter>)
}

const viewBy = () => screen.getByLabelText('View by')
const groupHeadings = () =>
  screen.queryAllByRole('rowheader').map((heading) => heading.textContent)

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))
beforeEach(() => {
  requested = []
})
afterEach(() => {
  cleanup()
  server.resetHandlers()
})
afterAll(() => server.close())

describe('Assets View by', () => {
  it('starts in List view with one page of assets', async () => {
    renderAssetsPage()

    expect(await screen.findByText('Page 1 of 2')).toBeTruthy()
    expect((viewBy() as HTMLSelectElement).value).toBe('list')
    expect(screen.queryByText('Asset 21')).toBeNull()
    expect(groupHeadings()).toEqual([])
  })

  it('groups every asset by category, without pagination', async () => {
    const user = userEvent.setup()
    renderAssetsPage()
    await screen.findByText('Page 1 of 2')
    requested = []

    await user.selectOptions(viewBy(), 'category')

    expect(await screen.findByText('Showing 25 assets in 2 categories')).toBeTruthy()
    expect(groupHeadings()).toEqual(['Meters10 assets', 'Tools15 assets'])
    expect(screen.getByText('Asset 25')).toBeTruthy()
    expect(screen.queryByText('Page 1 of 2')).toBeNull()
    expect(requested.map((params) => params.get('page')).sort()).toEqual(['1', '2'])
  })

  it('switches between Category and Equipment Type without reloading', async () => {
    const user = userEvent.setup()
    renderAssetsPage()
    await screen.findByText('Page 1 of 2')
    await user.selectOptions(viewBy(), 'category')
    await screen.findByText('Showing 25 assets in 2 categories')
    requested = []

    await user.selectOptions(viewBy(), 'type')

    expect(screen.getByText('Showing 25 assets in 2 equipment types')).toBeTruthy()
    expect(groupHeadings()).toEqual(['DrillsTools · 15 assets', 'MultimetersMeters · 10 assets'])
    expect(requested).toEqual([])
  })

  it('returns to the paginated list', async () => {
    const user = userEvent.setup()
    renderAssetsPage()
    await screen.findByText('Page 1 of 2')
    await user.selectOptions(viewBy(), 'category')
    await screen.findByText('Showing 25 assets in 2 categories')

    await user.selectOptions(viewBy(), 'list')

    expect(await screen.findByText('Page 1 of 2')).toBeTruthy()
    expect(groupHeadings()).toEqual([])
    expect(screen.queryByText('Asset 21')).toBeNull()
  })

  it('applies the search to the grouped view', async () => {
    const user = userEvent.setup()
    renderAssetsPage()
    await screen.findByText('Page 1 of 2')
    await user.selectOptions(viewBy(), 'category')
    await screen.findByText('Showing 25 assets in 2 categories')

    await user.type(screen.getByRole('searchbox'), 'A-2{Enter}')

    // A-20 to A-25 match, and they are all multimeters (Meters).
    expect(await screen.findByText('Showing 6 assets in 1 category')).toBeTruthy()
    expect(groupHeadings()).toEqual(['Meters6 assets'])
    expect(requested.at(-1)?.get('asset_identifier')).toBe('A-2')
  })

  it('shows the error block in a grouped view, and Try again reloads it', async () => {
    const user = userEvent.setup()
    renderAssetsPage()
    await screen.findByText('Page 1 of 2')
    let failed = false
    server.use(http.get(`${apiBaseUrl}/assets/`, () => {
      if (failed) return undefined
      failed = true
      return HttpResponse.json({ detail: 'A server error occurred.' }, { status: 500 })
    }))

    await user.selectOptions(viewBy(), 'category')
    const alert = await screen.findByRole('alert')
    expect(alert.textContent).toContain('Unable to load assets')

    await user.click(within(alert).getByRole('button', { name: 'Try again' }))

    expect(await screen.findByText('Showing 25 assets in 2 categories')).toBeTruthy()
    expect(screen.queryByRole('alert')).toBeNull()
  })

  it('opens the details of an asset from a grouped view', async () => {
    const user = userEvent.setup()
    renderAssetsPage()
    await screen.findByText('Page 1 of 2')
    await user.selectOptions(viewBy(), 'category')
    await screen.findByText('Showing 25 assets in 2 categories')

    await user.click(screen.getByRole('button', { name: 'View details for asset A-25' }))

    expect(screen.getByRole('button', { name: 'View details for asset A-25' }).closest('tr')?.className)
      .toContain('row-selected')
  })
})
