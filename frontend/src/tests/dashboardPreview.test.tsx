// @vitest-environment jsdom
import { cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { afterEach, describe, expect, it, vi } from 'vitest'
import AppRoutes from '../AppRoutes'
import DashboardPage from '../pages/DashboardPage'
import { UpcomingReturnsPreview } from '../features/dashboard/components/DashboardPreviewPanels'
import type { DashboardSummary } from '../features/dashboard/api'
import type { CurrentUser } from '../features/auth/api'
import { technicianAuth, withAuth } from './authTestUtils'

const summary: DashboardSummary = {
  total_assets: 450, available_assets: 310, on_loan_assets: 75, under_maintenance_assets: 40,
}

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
  vi.useRealTimers()
})

function mockSummary(data: DashboardSummary = summary) {
  return vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify(data), {
    status: 200, headers: { 'Content-Type': 'application/json' },
  }))
}

function renderDashboard(role: CurrentUser['role'] = 'ADMINISTRATOR', fullApp = false) {
  return render(
    <MemoryRouter>{withAuth(fullApp ? <AppRoutes /> : <DashboardPage />, {
      ...technicianAuth, user: { ...technicianAuth.user!, role },
    })}</MemoryRouter>,
  )
}

describe('Dashboard live inventory and demo previews', () => {
  it.each(['ADMINISTRATOR', 'TECHNICIAN'] as const)('keeps real inventory values separate from lending samples for %s', async (role) => {
    mockSummary()
    renderDashboard(role)
    await screen.findByRole('img', { name: 'Equipment availability: 450 assets' })
    expect(within(screen.getByRole('article', { name: 'Total Assets' })).getByText('450')).toBeTruthy()
    expect(within(screen.getByRole('article', { name: 'Available Assets' })).getByText('310')).toBeTruthy()
    expect(within(screen.getByRole('article', { name: 'Assets On Loan' })).getByText('75')).toBeTruthy()
    expect(within(screen.getByRole('article', { name: 'Under Maintenance' })).getByText('40')).toBeTruthy()
    const overdue = screen.getByRole('article', { name: 'Overdue Loans' })
    expect(within(overdue).getByText('8')).toBeTruthy()
    expect(within(overdue).getByText('Sample data')).toBeTruthy()
    const availability = screen.getByRole('region', { name: 'Equipment availability' })
    expect(within(availability).getByText('Retired').parentElement?.textContent).toBe('Retired25')
    const upcoming = screen.getByRole('region', { name: 'Upcoming returns' })
    expect(within(upcoming).getByText('Sample data')).toBeTruthy()
    expect(within(upcoming).getByText('Demo Borrower 1')).toBeTruthy()
    const recent = screen.getByRole('region', { name: 'Recent lending activity' })
    expect(within(recent).getByText('Sample data')).toBeTruthy()
    expect(within(recent).getAllByRole('row')).toHaveLength(5)
    expect(within(recent).getByText('Overdue')).toBeTruthy()
    expect(within(recent).getByText('Completed')).toBeTruthy()
  })

  it('limits Faculty to inventory information', async () => {
    mockSummary()
    renderDashboard('FACULTY')
    await screen.findByRole('img', { name: 'Equipment availability: 450 assets' })
    expect(screen.queryByRole('article', { name: 'Overdue Loans' })).toBeNull()
    expect(screen.queryByRole('region', { name: 'Upcoming returns' })).toBeNull()
    expect(screen.queryByRole('region', { name: 'Recent lending activity' })).toBeNull()
    expect(screen.queryByText('Demo Borrower 1')).toBeNull()
  })

  it('shows an empty availability state when there are no assets', async () => {
    mockSummary({ total_assets: 0, available_assets: 0, on_loan_assets: 0, under_maintenance_assets: 0 })
    renderDashboard()
    expect(await screen.findByText('No assets to display.')).toBeTruthy()
    expect(screen.getByRole('img', { name: 'Equipment availability: 0 assets' })).toBeTruthy()
    expect(within(screen.getByRole('article', { name: 'Total Assets' })).getByText('0')).toBeTruthy()
  })

  it('does not invent inventory values when the backend fails', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(null, { status: 500 }))
    renderDashboard()
    expect((await screen.findByRole('alert')).textContent).toContain('Could not load dashboard information')
    const total = screen.getByRole('article', { name: 'Total Assets' })
    expect(within(total).getByText('\u2014')).toBeTruthy()
    expect(within(total).queryByText('450')).toBeNull()
    expect(screen.getByText('Availability data is unavailable.')).toBeTruthy()
    expect(within(screen.getByRole('article', { name: 'Overdue Loans' })).getByText('Sample data')).toBeTruthy()
  })

  it('keeps the layout and sample labels visible while inventory is loading', () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(() => new Promise(() => {}))
    renderDashboard()
    expect(screen.getByRole('status').textContent).toContain('Loading dashboard information')
    expect(within(screen.getByRole('article', { name: 'Total Assets' })).getByText('\u2014')).toBeTruthy()
    expect(screen.getByText('Loading availability...')).toBeTruthy()
    expect(within(screen.getByRole('region', { name: 'Upcoming returns' })).getByText('Sample data')).toBeTruthy()
  })

  it('keeps sample upcoming dates relative to the local calendar', () => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date(2026, 9, 29, 12))
    render(<UpcomingReturnsPreview />)
    expect(screen.getByText('2026-10-30').getAttribute('datetime')).toBe('2026-10-30')
    expect(screen.getByText('2026-11-01').getAttribute('datetime')).toBe('2026-11-01')
    expect(screen.getByText('Tomorrow')).toBeTruthy()
    expect(screen.getByText('In 3 days')).toBeTruthy()
  })

  it('opens the in-progress Lending page from View all', async () => {
    const fetchSpy = mockSummary()
    renderDashboard('ADMINISTRATOR', true)
    await screen.findByRole('img', { name: 'Equipment availability: 450 assets' })
    await userEvent.click(screen.getByRole('link', { name: 'View all' }))
    expect(await screen.findByRole('heading', { name: 'Lending', level: 1 })).toBeTruthy()
    expect(screen.getByText('This page is still in progress.')).toBeTruthy()
    expect(fetchSpy).toHaveBeenCalledTimes(1)
  })
})
