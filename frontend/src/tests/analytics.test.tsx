// @vitest-environment jsdom
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'
import { MemoryRouter } from 'react-router'
import { apiBaseUrl } from '../api'
import AppRoutes from '../AppRoutes'
import { technicianAuth, withAuth } from './authTestUtils'

const server = setupServer(
  http.get(`${apiBaseUrl}/categories/`, () => HttpResponse.json([
    { category_id: 3, name: 'Meters' },
  ])),
  http.get(`${apiBaseUrl}/equipment-types/`, () => HttpResponse.json([
    {
      type_id: 7,
      name: 'Multimeters',
      description: '',
      category_id: 3,
      category: { category_id: 3, name: 'Meters' },
    },
  ])),
  http.get(`${apiBaseUrl}/analytics/years/`, () => HttpResponse.json({ years: [2025, 2024] })),
  http.get(`${apiBaseUrl}/analytics/availability/`, () => HttpResponse.json({
    results: [{
      category_id: 3,
      category_name: 'Meters',
      equipment_type_id: 7,
      equipment_type_name: 'Multimeters',
      total_assets: 8,
      available_assets: 5,
      on_loan_assets: 1,
      under_maintenance_assets: 1,
      retired_assets: 1,
    }],
  })),
  http.get(`${apiBaseUrl}/analytics/utilization/`, () => HttpResponse.json({
    year: null,
    results: [{
      asset_id: 10,
      asset_identifier: 'METER-010',
      asset_name: 'Digital multimeter',
      category_id: 3,
      category_name: 'Meters',
      equipment_type_id: 7,
      equipment_type_name: 'Multimeters',
      loan_count: 6,
      total_loan_days: 30,
      average_loan_days: 5,
    }],
  })),
  http.get(`${apiBaseUrl}/analytics/borrowing/`, () => HttpResponse.json({
    year: null,
    total_loans: 10,
    completed_loans: 7,
    active_loans: 3,
    overdue_loans: 1,
    intact_returns: 5,
    damaged_returns: 2,
  })),
  http.get(`${apiBaseUrl}/analytics/borrowers/`, () => HttpResponse.json({
    year: null,
    results: [{
      borrower_id: 4,
      unb_id: 'UNB-004',
      first_name: 'Ada',
      last_name: 'Lovelace',
      total_loans: 3,
      completed_loans: 2,
      active_loans: 1,
      overdue_loans: 1,
      damaged_returns: 1,
    }],
  })),
)

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))
afterEach(() => {
  cleanup()
  server.resetHandlers()
})
afterAll(() => server.close())

function renderAnalytics(role: 'TECHNICIAN' | 'FACULTY' = 'TECHNICIAN') {
  const auth = role === 'TECHNICIAN'
    ? technicianAuth
    : {
        ...technicianAuth,
        user: { ...technicianAuth.user!, role: 'FACULTY' as const, role_label: 'Faculty' },
      }
  return render(
    <MemoryRouter initialEntries={['/analytics']}>
      {withAuth(<AppRoutes />, auth)}
    </MemoryRouter>,
  )
}

describe('Analytics page', () => {
  it('shows live availability counts by equipment type', async () => {
    renderAnalytics()

    expect(await screen.findByRole('heading', { name: 'Analytics' })).toBeTruthy()
    expect((await screen.findAllByText('Multimeters')).length).toBeGreaterThan(1)
    expect(screen.getByText('Under maintenance')).toBeTruthy()
    expect(screen.getByRole('img', {
      name: '5 available, 1 on loan, 1 under maintenance, 1 retired',
    })).toBeTruthy()
  })

  it('allows Faculty to view Analytics according to the project access policy', async () => {
    renderAnalytics('FACULTY')

    expect((await screen.findAllByText('Multimeters')).length).toBeGreaterThan(1)
    expect(screen.queryByText('Access denied')).toBeNull()
  })

  it('switches among the four report views and displays their metrics', async () => {
    const user = userEvent.setup()
    renderAnalytics()

    await user.click(await screen.findByRole('tab', { name: 'Equipment Utilization' }))
    expect(await screen.findByText('Digital multimeter')).toBeTruthy()
    expect(screen.getByText('Most borrowed')).toBeTruthy()

    await user.click(screen.getByRole('tab', { name: 'Borrowing Activity' }))
    expect(await screen.findByText('Total loans')).toBeTruthy()
    expect(screen.getByText('Overdue')).toBeTruthy()

    await user.click(screen.getByRole('tab', { name: 'Borrower Activity' }))
    expect(await screen.findByText('Ada Lovelace')).toBeTruthy()
    expect(screen.getByText('UNB-004')).toBeTruthy()
    expect(screen.getByText('Damaged returns')).toBeTruthy()
  })

  it('applies year and category/type filters to the selected report', async () => {
    const user = userEvent.setup()
    const requestedUrls: URL[] = []
    server.use(http.get(`${apiBaseUrl}/analytics/utilization/`, ({ request }) => {
      requestedUrls.push(new URL(request.url))
      return HttpResponse.json({ year: 2025, results: [] })
    }))
    renderAnalytics()

    await user.click(await screen.findByRole('tab', { name: 'Equipment Utilization' }))
    await user.selectOptions(screen.getByLabelText('Category'), '3')
    await user.selectOptions(screen.getByLabelText('Equipment type'), '7')
    await user.selectOptions(screen.getByLabelText('Checkout year'), '2025')
    await user.click(screen.getByRole('button', { name: 'Apply filters' }))

    await waitFor(() => expect(requestedUrls.length).toBeGreaterThan(0))
    const params = requestedUrls.at(-1)?.searchParams
    expect(params?.get('year')).toBe('2025')
    expect(params?.get('category_id')).toBe('3')
    expect(params?.get('equipment_type_id')).toBe('7')
  })

  it('searches borrower activity by borrower identity fields', async () => {
    const user = userEvent.setup()
    const requestedUrls: URL[] = []
    server.use(http.get(`${apiBaseUrl}/analytics/borrowers/`, ({ request }) => {
      requestedUrls.push(new URL(request.url))
      return HttpResponse.json({ year: 2025, results: [] })
    }))
    renderAnalytics()

    await user.click(await screen.findByRole('tab', { name: 'Borrower Activity' }))
    const search = await screen.findByRole('searchbox', { name: 'Search borrowers' })
    await user.type(search, 'UNB-004')
    await user.selectOptions(screen.getByLabelText('Checkout year'), '2025')
    await user.click(screen.getByRole('button', { name: 'Apply filters' }))

    await waitFor(() => expect(requestedUrls.length).toBeGreaterThan(0))
    expect(requestedUrls.at(-1)?.searchParams.get('search')).toBe('UNB-004')
    expect(requestedUrls.at(-1)?.searchParams.get('year')).toBe('2025')
  })

  it('shows an empty state and an error state', async () => {
    const user = userEvent.setup()
    server.use(
      http.get(`${apiBaseUrl}/analytics/availability/`, () => HttpResponse.json({ results: [] })),
      http.get(`${apiBaseUrl}/analytics/borrowing/`, () => HttpResponse.json({ detail: 'Report unavailable.' }, { status: 500 })),
    )
    renderAnalytics()

    expect(await screen.findByText('No records match these filters.')).toBeTruthy()
    await user.click(screen.getByRole('tab', { name: 'Borrowing Activity' }))
    expect((await screen.findByRole('alert')).textContent).toContain('Report unavailable.')
  })
})
