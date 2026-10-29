// @vitest-environment jsdom
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'
import { MemoryRouter } from 'react-router'
import { apiBaseUrl } from '../api'
import AssetsPage from '../pages/AssetsPage'
import { withAuth } from './authTestUtils'

const asset = {
  asset_id: 1,
  asset_identifier: 'SHOP-001',
  name: 'Cordless drill',
  acquisition_date: '2024-03-15',
  status: 'On_Loan' as const,
  equipment_type: {
    type_id: 1,
    name: 'Power tools',
    description: 'Portable power tools',
    category: { category_id: 1, name: 'Tools' },
  },
}

const page = (results: (typeof asset)[], count = results.length) =>
  HttpResponse.json({ count, next: null, previous: null, results })

const server = setupServer(http.get(`${apiBaseUrl}/assets/`, () => page([asset])))

function renderAssetsPage() {
  return render(<MemoryRouter>{withAuth(<AssetsPage />)}</MemoryRouter>)
}

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))
afterEach(() => {
  cleanup()
  server.resetHandlers()
})
afterAll(() => server.close())

describe('Assets page load states', () => {
  it('shows loading, then the asset rows from the API', async () => {
    renderAssetsPage()

    expect(screen.getByText('Loading equipment records…')).toBeTruthy()
    expect(await screen.findByText('Cordless drill')).toBeTruthy()
    expect(screen.getByText('SHOP-001')).toBeTruthy()
    expect(screen.getByText('Tools')).toBeTruthy()
    expect(screen.getByText('Power tools')).toBeTruthy()
    expect(screen.getByText('On Loan')).toBeTruthy()
    expect(screen.queryByText('Loading equipment records…')).toBeNull()
  })

  it('shows the empty message when the API returns no assets', async () => {
    server.use(http.get(`${apiBaseUrl}/assets/`, () => page([])))
    renderAssetsPage()

    expect(await screen.findByText('No active assets are available.')).toBeTruthy()
    expect(screen.queryByRole('alert')).toBeNull()
  })

  it('shows one error block with the API message, and Try again reloads the list', async () => {
    const user = userEvent.setup()
    let requests = 0
    server.use(http.get(`${apiBaseUrl}/assets/`, () => {
      requests += 1
      return requests === 1
        ? HttpResponse.json({ detail: 'A server error occurred.' }, { status: 500 })
        : page([asset])
    }))
    renderAssetsPage()

    const alert = await screen.findByRole('alert')
    expect(alert.textContent).toContain('Unable to load assets')
    expect(alert.textContent).toContain('A server error occurred.')
    expect(screen.getAllByRole('alert')).toHaveLength(1)
    expect(screen.queryByText('No active assets are available.')).toBeNull()

    await user.click(screen.getByRole('button', { name: 'Try again' }))

    expect(await screen.findByText('Cordless drill')).toBeTruthy()
    expect(screen.queryByRole('alert')).toBeNull()
    expect(requests).toBe(2)
  })

  it('retries the page and search that failed', async () => {
    const user = userEvent.setup()
    const requested: URLSearchParams[] = []
    server.use(http.get(`${apiBaseUrl}/assets/`, ({ request }) => {
      const params = new URL(request.url).searchParams
      requested.push(params)
      if (params.get('page') === '2' && requested.length === 2) {
        return HttpResponse.json({ detail: 'Try later.' }, { status: 503 })
      }
      return page([asset], 25)
    }))
    renderAssetsPage()

    await screen.findByText('Cordless drill')
    await user.click(screen.getByRole('button', { name: 'Next' }))
    await screen.findByText('Try later.')
    await user.click(screen.getByRole('button', { name: 'Try again' }))
    await screen.findByText('Page 2 of 2')

    expect(requested.at(-1)?.get('page')).toBe('2')
  })

  it('explains a permission error and a connection failure', async () => {
    server.use(http.get(`${apiBaseUrl}/assets/`, () => new HttpResponse(null, { status: 403 })))
    renderAssetsPage()
    expect(
      await screen.findByText('Your account does not have permission to view assets.'),
    ).toBeTruthy()
    cleanup()

    server.use(http.get(`${apiBaseUrl}/assets/`, () => HttpResponse.error()))
    renderAssetsPage()
    expect(await screen.findByText(/Could not connect to equipment records/)).toBeTruthy()
  })
})
