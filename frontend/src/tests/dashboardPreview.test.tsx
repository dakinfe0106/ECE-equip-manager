// @vitest-environment jsdom
import { cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { afterEach, describe, expect, it, vi } from 'vitest'
import AppRoutes from '../AppRoutes'
import DashboardPage from '../pages/DashboardPage'
import type { DashboardSummary } from '../features/dashboard/api'
import type { LoanRecord } from '../features/lending/types'
import type { CurrentUser } from '../features/auth/api'
import { technicianAuth, withAuth } from './authTestUtils'

const summary: DashboardSummary = {
  total_assets: 425, available_assets: 310, on_loan_assets: 75, under_maintenance_assets: 40,
}

function loan(id: number, due: string, status: LoanRecord['status'] = 'on_loan'): LoanRecord {
  return {
    loan_id: id, asset_id: id, asset_identifier: `ECE-${id}`, equipment_name: 'Oscilloscope',
    borrower_id: id, borrower_unb_id: `10000${id}`, borrower_name: `Borrower ${id}`,
    checkout_date: '2026-10-15', expected_return_date: due,
    actual_return_date: status === 'returned' ? '2026-10-28' : null,
    return_condition: null, status,
  }
}

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
  vi.useRealTimers()
})

function mockRequests({
  inventory = () => Response.json(summary),
  loans = () => Response.json([]),
  overdue = () => Response.json([]),
}: {
  inventory?: () => Response
  loans?: () => Response
  overdue?: () => Response
} = {}) {
  return vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
    const url = new URL(input instanceof Request ? input.url : input)
    if (url.pathname.endsWith('/dashboard/')) return inventory()
    if (url.pathname.endsWith('/loans/')) {
      return url.searchParams.get('status') === 'overdue' ? overdue() : loans()
    }
    return new Response(null, { status: 404 })
  })
}

function renderDashboard(role: CurrentUser['role'] = 'ADMINISTRATOR', fullApp = false) {
  return render(
    <MemoryRouter>{withAuth(fullApp ? <AppRoutes /> : <DashboardPage />, {
      ...technicianAuth, user: { ...technicianAuth.user!, role },
    })}</MemoryRouter>,
  )
}

function card(name: string) {
  return within(screen.getByRole('article', { name }))
}

function availability(total: number) {
  return screen.findByRole('img', { name: `Equipment availability: ${total} assets` })
}

describe('Dashboard inventory', () => {
  it('renders live totals and links and reconciles the three active statuses', async () => {
    mockRequests()
    renderDashboard()
    await availability(425)

    for (const [label, count, path] of [
      ['Total Assets', 425, '/assets'],
      ['Available Assets', 310, '/assets'],
      ['Assets On Loan', 75, '/loans'],
      ['Under Maintenance', 40, '/maintenance'],
    ] as const) {
      expect(card(label).getByText(String(count))).toBeTruthy()
      expect(card(label).getByRole('link').getAttribute('href')).toBe(path)
    }

    const chart = within(screen.getByRole('region', { name: 'Equipment availability' }))
    expect(chart.getAllByRole('term').map((term) => term.textContent)).toEqual(['Available', 'On Loan', 'Maintenance'])
    const counts = chart.getAllByRole('definition').map((value) => Number(value.textContent))
    expect(counts).toEqual([310, 75, 40])
    expect(counts.reduce((total, count) => total + count, 0)).toBe(425)
    expect(chart.queryByText('Retired')).toBeNull()
  })

  it('shows zero counts and an empty availability state', async () => {
    mockRequests({ inventory: () => Response.json({
      total_assets: 0, available_assets: 0, on_loan_assets: 0, under_maintenance_assets: 0,
    }) })
    renderDashboard()
    await availability(0)
    expect(screen.getByText('No assets to display.')).toBeTruthy()
    expect(card('Total Assets').getByText('0')).toBeTruthy()
  })

  it('shows loading placeholders while inventory and lending requests are pending', () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(() => new Promise(() => {}))
    renderDashboard()
    expect(screen.getByRole('status').textContent).toContain('Loading dashboard information')
    expect(card('Total Assets').getByText('—')).toBeTruthy()
    expect(card('Overdue Loans').getByText(/^Loading/)).toBeTruthy()
    expect(screen.getByText('Loading availability...')).toBeTruthy()
    expect(screen.getByText(/^Loading upcoming returns/)).toBeTruthy()
    expect(screen.getByText(/^Loading recent lending activity/)).toBeTruthy()
  })

  it('retries a failed inventory request without repeating lending requests', async () => {
    const inventory = vi.fn()
      .mockImplementationOnce(() => new Response(null, { status: 500 }))
      .mockImplementationOnce(() => Response.json(summary))
    const loans = vi.fn(() => Response.json([]))
    const overdue = vi.fn(() => Response.json([]))
    mockRequests({ inventory, loans, overdue })
    renderDashboard()
    expect((await screen.findByRole('alert')).textContent).toContain('Could not load dashboard information')
    expect(card('Total Assets').getByText('—')).toBeTruthy()
    expect(screen.getByText('Availability data is unavailable.')).toBeTruthy()
    await userEvent.click(screen.getByRole('button', { name: 'Retry' }))
    await availability(425)
    expect(inventory).toHaveBeenCalledTimes(2)
    expect(loans).toHaveBeenCalledTimes(1)
    expect(overdue).toHaveBeenCalledTimes(1)
  })

  it('shows the authorization-specific error on a 403', async () => {
    mockRequests({ inventory: () => new Response(null, { status: 403 }) })
    renderDashboard('FACULTY')
    expect((await screen.findByRole('alert')).textContent).toContain('You are not authorized to view the dashboard.')
  })

  it('redirects signed-out visitors before requesting dashboard data', async () => {
    const fetchSpy = mockRequests()
    render(
      <MemoryRouter>
        {withAuth(<AppRoutes />, { ...technicianAuth, user: null })}
      </MemoryRouter>,
    )
    expect(await screen.findByRole('heading', { name: 'Sign in to your workspace' })).toBeTruthy()
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it('fetches fresh inventory when returning from Lending', async () => {
    const inventory = vi.fn()
      .mockImplementationOnce(() => Response.json(summary))
      .mockImplementationOnce(() => Response.json({ ...summary, available_assets: 309, on_loan_assets: 76 }))
    const loans = vi.fn(() => Response.json([]))
    mockRequests({ inventory, loans })
    renderDashboard('ADMINISTRATOR', true)

    await availability(425)
    expect(inventory).toHaveBeenCalledTimes(1)
    await userEvent.click(screen.getByRole('link', { name: 'View all' }))
    expect(await screen.findByRole('heading', { name: 'Lending', level: 1 })).toBeTruthy()
    expect(await screen.findByText('No loans found.')).toBeTruthy()
    expect(loans).toHaveBeenCalledTimes(2)

    await userEvent.click(screen.getByRole('link', { name: 'Dashboard' }))
    await availability(425)
    expect(inventory).toHaveBeenCalledTimes(2)
    expect(card('Available Assets').getByText('309')).toBeTruthy()
    expect(card('Assets On Loan').getByText('76')).toBeTruthy()
  })
})

describe('Dashboard lending', () => {
  it.each(['ADMINISTRATOR', 'TECHNICIAN'] as const)('renders live overdue, upcoming, and recent records for %s', async (role) => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date(2026, 9, 29, 23, 45))
    const recent = [
      loan(1, '2026-10-28', 'overdue'),
      loan(2, '2026-11-01', 'returned'),
      loan(3, '2026-11-06'),
      loan(4, '2026-10-29'),
      loan(5, '2026-11-05'),
      loan(6, '2026-10-30'),
      loan(7, '2026-10-28', 'overdue'),
      loan(8, '2026-11-01', 'returned'),
    ]
    const fetchSpy = mockRequests({
      loans: () => Response.json(recent),
      overdue: () => Response.json([recent[0], recent[6]]),
    })
    renderDashboard(role)
    expect(await card('Overdue Loans').findByText('2')).toBeTruthy()
    expect(card('Overdue Loans').getByRole('link').getAttribute('href')).toBe('/loans')
    expect(fetchSpy).toHaveBeenCalledWith(expect.stringContaining('/loans/?status=overdue'), { credentials: 'include' })

    const upcoming = within(screen.getByRole('region', { name: 'Upcoming returns' }))
    await upcoming.findByText('Borrower 6')
    expect(upcoming.getAllByRole('listitem').map((item) => item.querySelector('time')?.dateTime))
      .toEqual(['2026-10-29', '2026-10-30', '2026-11-05'])
    expect(upcoming.getByText('ECE-5')).toBeTruthy()
    for (const id of [1, 2, 3, 7, 8]) expect(upcoming.queryByText(`ECE-${id}`)).toBeNull()

    const activity = within(screen.getByRole('region', { name: 'Recent lending activity' }))
    expect(activity.getAllByRole('rowheader').map((item) => item.textContent)).toEqual(['ECE-8', 'ECE-7', 'ECE-6', 'ECE-5'])
    const returned = within(activity.getByRole('rowheader', { name: 'ECE-8' }).closest('tr')!)
    for (const field of ['Borrower 8', '2026-10-15', '2026-11-01', 'Completed']) {
      expect(returned.getByText(field)).toBeTruthy()
    }
    expect(activity.getByText('Overdue')).toBeTruthy()
    expect(screen.queryByText(/Sample data|Demo Laptop|Demo Borrower/i)).toBeNull()
  })

  it('shows an overdue count of zero and empty lending states', async () => {
    mockRequests()
    renderDashboard()
    expect(await card('Overdue Loans').findByText('0')).toBeTruthy()
    expect(await screen.findByText('No upcoming returns in the next 7 days.')).toBeTruthy()
    expect(screen.getByText('No lending activity yet.')).toBeTruthy()
  })

  it('keeps inventory usable when lending fails', async () => {
    const failure = () => new Response(null, { status: 500 })
    mockRequests({ loans: failure, overdue: failure })
    renderDashboard()
    expect(await card('Overdue Loans').findByText('Unavailable')).toBeTruthy()
    expect(screen.getByText('Upcoming returns are unavailable.')).toBeTruthy()
    expect(screen.getByText('Recent lending activity is unavailable.')).toBeTruthy()
    await availability(425)
    expect(screen.queryByRole('alert')).toBeNull()
  })

  it('keeps the live overdue count if the full lending list fails', async () => {
    mockRequests({ loans: () => new Response(null, { status: 500 }) })
    renderDashboard()
    expect(await screen.findByText('Recent lending activity is unavailable.')).toBeTruthy()
    expect(await card('Overdue Loans').findByText('0')).toBeTruthy()
  })

  it('limits Faculty to inventory and skips lending requests', async () => {
    const fetchSpy = mockRequests()
    renderDashboard('FACULTY')
    await availability(425)
    expect(fetchSpy).toHaveBeenCalledTimes(1)
    expect(screen.queryByRole('article', { name: 'Overdue Loans' })).toBeNull()
    expect(screen.queryByRole('region', { name: 'Upcoming returns' })).toBeNull()
    expect(screen.queryByRole('region', { name: 'Recent lending activity' })).toBeNull()
    expect(card('Assets On Loan').queryByRole('link')).toBeNull()
    expect(card('Under Maintenance').queryByRole('link')).toBeNull()
  })
})
