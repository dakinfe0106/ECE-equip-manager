// @vitest-environment jsdom
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'
import { MemoryRouter } from 'react-router'
import { apiBaseUrl } from '../api'
import AppRoutes from '../AppRoutes'
import { withAuth } from './authTestUtils'

const asset = {
  asset_id: 1,
  asset_identifier: 'SHOP-001',
  name: 'Cordless drill',
  acquisition_date: '2024-03-15',
  status: 'Available' as const,
  equipment_type: {
    type_id: 1,
    name: 'Power tools',
    description: 'Portable power tools',
    category: { category_id: 1, name: 'Tools' },
  },
}

const server = setupServer(
  http.get(`${apiBaseUrl}/assets/`, () => HttpResponse.json({
    count: 1,
    next: null,
    previous: null,
    results: [asset],
  })),
  http.get(`${apiBaseUrl}/categories/`, () => HttpResponse.json([
    { category_id: 1, name: 'Tools' },
  ])),
  http.get(`${apiBaseUrl}/equipment-types/`, () => HttpResponse.json([
    {
      type_id: 1,
      name: 'Power tools',
      description: 'Portable power tools',
      category_id: 1,
      category: { category_id: 1, name: 'Tools' },
    },
  ])),
  http.post(`${apiBaseUrl}/assets/`, () => HttpResponse.json(asset, { status: 201 })),
)

function renderAssetsPage() {
  return render(
    <MemoryRouter initialEntries={['/assets']}>
      {withAuth(<AppRoutes />)}
    </MemoryRouter>,
  )
}

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))
afterEach(() => {
  cleanup()
  server.resetHandlers()
})
afterAll(() => server.close())

describe('Assets page revamp workflows', () => {
  it('combines text search and category/type filters and can reset them', async () => {
    const user = userEvent.setup()
    const requestedUrls: URL[] = []
    server.use(http.get(`${apiBaseUrl}/assets/`, ({ request }) => {
      requestedUrls.push(new URL(request.url))
      return HttpResponse.json({ count: 1, next: null, previous: null, results: [asset] })
    }))
    renderAssetsPage()

    await waitFor(() => expect(requestedUrls).toHaveLength(1))
    await user.click(screen.getByRole('button', { name: /filters/i }))
    await user.selectOptions(screen.getByLabelText('Category'), '1')
    await user.selectOptions(screen.getByLabelText('Equipment type'), '1')
    await user.click(screen.getByRole('button', { name: /apply filters/i }))
    await waitFor(() => expect(requestedUrls.at(-1)?.searchParams.get('equipment_type_id')).toBe('1'))

    await user.type(screen.getByRole('searchbox', { name: 'Search assets' }), 'drill')
    await user.keyboard('{Enter}')
    await waitFor(() => {
      const params = requestedUrls.at(-1)?.searchParams
      expect(params?.get('search')).toBe('drill')
      expect(params?.get('category_id')).toBe('1')
      expect(params?.get('equipment_type_id')).toBe('1')
    })

    await user.click(screen.getByRole('button', { name: 'Clear search' }))
    await waitFor(() => expect(requestedUrls.at(-1)?.searchParams.has('search')).toBe(false))
    expect(requestedUrls.at(-1)?.searchParams.get('category_id')).toBe('1')

    await user.click(screen.getByRole('button', { name: /filters/i }))
    await user.click(screen.getByRole('button', { name: 'Reset' }))
    await waitFor(() => expect(requestedUrls.at(-1)?.searchParams.has('category_id')).toBe(false))
    expect(requestedUrls.at(-1)?.searchParams.has('equipment_type_id')).toBe(false)
  })

  it('opens the add-asset modal and cancels without creating an asset', async () => {
    const user = userEvent.setup()
    let createCount = 0
    server.use(http.post(`${apiBaseUrl}/assets/`, () => {
      createCount += 1
      return HttpResponse.json(asset, { status: 201 })
    }))
    renderAssetsPage()

    await user.click(await screen.findByRole('button', { name: 'Add Asset' }))
    expect(await screen.findByRole('dialog', { name: 'Add Asset' })).toBeTruthy()
    expect(screen.getByLabelText(/Asset ID/)).toBeTruthy()
    expect(screen.getByLabelText(/Asset name/i)).toBeTruthy()
    await user.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(screen.queryByRole('dialog', { name: 'Add Asset' })).toBeNull()
    expect(createCount).toBe(0)
  })

  it('creates an asset through the modal and refreshes the visible inventory', async () => {
    const user = userEvent.setup()
    let createCount = 0
    let requestBody: unknown
    const createdAsset = { ...asset, asset_id: 2, asset_identifier: 'SHOP-002', name: 'New drill' }
    server.use(
      http.post(`${apiBaseUrl}/assets/`, async ({ request }) => {
        createCount += 1
        requestBody = await request.json()
        return HttpResponse.json(createdAsset, { status: 201 })
      }),
      http.get(`${apiBaseUrl}/assets/`, () => HttpResponse.json({
        count: 2,
        next: null,
        previous: null,
        results: [createdAsset, asset],
      })),
    )
    renderAssetsPage()

    await user.click(await screen.findByRole('button', { name: 'Add Asset' }))
    await user.type(screen.getByLabelText(/Asset ID/), 'SHOP-002')
    await user.type(screen.getByLabelText(/Asset name/i), 'New drill')
    await user.selectOptions(await screen.findByLabelText(/Category/), '1')
    await user.selectOptions(await screen.findByLabelText(/Equipment type/), '1')
    await user.click(screen.getByRole('button', { name: 'Save Asset' }))

    expect(await screen.findByText('Asset SHOP-002 was added successfully.')).toBeTruthy()
    expect(await screen.findByText('New drill')).toBeTruthy()
    expect(screen.queryByRole('dialog', { name: 'Add Asset' })).toBeNull()
    expect(createCount).toBe(1)
    expect(requestBody).toEqual({
      asset_identifier: 'SHOP-002',
      name: 'New drill',
      equipment_type_id: 1,
      acquisition_date: null,
    })
  })

  it('keeps the current page when an asset is created from a later page', async () => {
    const user = userEvent.setup()
    const firstPageAssets = Array.from({ length: 20 }, (_, index) => ({
      ...asset,
      asset_id: index + 1,
      asset_identifier: `SHOP-${String(index + 1).padStart(3, '0')}`,
      name: `Drill ${index + 1}`,
    }))
    const pageTwoAsset = {
      ...asset,
      asset_id: 21,
      asset_identifier: 'SHOP-021',
      name: 'Page two drill',
    }
    const createdAsset = {
      ...asset,
      asset_id: 22,
      asset_identifier: 'SHOP-022',
      name: 'New page two drill',
    }
    const requestedPages: string[] = []
    let wasCreated = false
    server.use(
      http.get(`${apiBaseUrl}/assets/`, ({ request }) => {
        const page = new URL(request.url).searchParams.get('page') ?? '1'
        requestedPages.push(page)
        const results = page === '2'
          ? wasCreated ? [pageTwoAsset, createdAsset] : [pageTwoAsset]
          : firstPageAssets
        return HttpResponse.json({
          count: wasCreated ? 22 : 21,
          next: null,
          previous: page === '2' ? 'page=1' : null,
          results,
        })
      }),
      http.post(`${apiBaseUrl}/assets/`, () => {
        wasCreated = true
        return HttpResponse.json(createdAsset, { status: 201 })
      }),
    )
    renderAssetsPage()

    expect(await screen.findByText('Page 1 of 2')).toBeTruthy()
    await user.click(screen.getByRole('button', { name: 'Next' }))
    expect(await screen.findByText('Page 2 of 2')).toBeTruthy()
    expect(await screen.findByText('Page two drill')).toBeTruthy()

    await user.click(screen.getByRole('button', { name: 'Add Asset' }))
    await user.type(screen.getByLabelText(/Asset ID/), 'SHOP-022')
    await user.type(screen.getByLabelText(/Asset name/i), 'New page two drill')
    await user.selectOptions(await screen.findByLabelText(/Category/), '1')
    await user.selectOptions(await screen.findByLabelText(/Equipment type/), '1')
    await user.click(screen.getByRole('button', { name: 'Save Asset' }))

    expect(await screen.findByText('New page two drill')).toBeTruthy()
    expect(screen.getByText('Page 2 of 2')).toBeTruthy()
    expect(requestedPages.at(-1)).toBe('2')
  })
})
