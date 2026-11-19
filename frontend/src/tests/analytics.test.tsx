// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import AppRoutes from '../AppRoutes'
import AnalyticsPage from '../pages/AnalyticsPage'
import * as api from '../features/analytics/api'
import { technicianAuth, withAuth } from './authTestUtils'

const options: api.Options = {
  categories: [{ category_id: 1, name: 'Meters', is_deleted: false }],
  equipment_types: [{ type_id: 2, category_id: 1, name: 'Digital', is_deleted: false }],
  years: [2025],
}
const result: Awaited<ReturnType<typeof api.fetchReport>> = {
  availability: [{ label: 'Meters / Digital', available: 3, on_loan: 1, under_maintenance: 0, retired: 0, total: 4 }],
  lending: { year: 2025, as_of: '2025-02-11', rows: [{ label: 'Jan', value: 2 }],
    summary: { transactions: 2, total_loan_days: 10, average_duration: 5, overdue_rate: 0 } },
}
afterEach(() => { cleanup(); vi.restoreAllMocks() })
beforeEach(() => {
  HTMLDialogElement.prototype.showModal = function () {
    this.setAttribute('open', '')
  }
})
function prepare() {
  vi.spyOn(api, 'fetchOptions').mockResolvedValue(options)
  return vi.spyOn(api, 'fetchReport').mockResolvedValue(result)
}
function page() {
  return render(<MemoryRouter initialEntries={['/analytics?year=2025']}><AnalyticsPage /></MemoryRouter>)
}
describe('Analytics', () => {
  it.each(['FACULTY', 'TECHNICIAN', 'ADMINISTRATOR'] as const)('routes %s to the real page', async role => {
    prepare()
    render(<MemoryRouter initialEntries={['/analytics']}>
      {withAuth(<AppRoutes />, { ...technicianAuth, user: { ...technicianAuth.user!, role } })}
    </MemoryRouter>)
    expect(await screen.findByRole('heading', { name: 'Analytics' })).toBeTruthy()
    expect(await screen.findByText('Available: 3 · On loan: 1 · Under maintenance: 0 · Retired: 0')).toBeTruthy()
  })
  it('applies and resets filters, switches reports, and opens export choices', async () => {
    const fetchReport = prepare()
    page()
    await screen.findByText('Available: 3 · On loan: 1 · Under maintenance: 0 · Retired: 0')
    fireEvent.change(screen.getByLabelText('Category'), { target: { value: '1' } })
    expect(fetchReport).toHaveBeenCalledTimes(1)
    fireEvent.click(screen.getByRole('button', { name: 'Apply Filters' }))
    await waitFor(() => expect(fetchReport).toHaveBeenLastCalledWith('availability',
      { category_id: '1', equipment_type_id: '', year: '2025' }, expect.any(AbortSignal)))
    fireEvent.click(screen.getByRole('button', { name: 'Borrowing Activity' }))
    await waitFor(() => expect(fetchReport).toHaveBeenLastCalledWith('borrowing',
      { category_id: '1', equipment_type_id: '', year: '2025' }, expect.any(AbortSignal)))
    await screen.findByText('2 loans')
    const calls = fetchReport.mock.calls.length
    fireEvent.click(screen.getByRole('button', { name: 'Export to Excel' }))
    expect(screen.getByRole('dialog', { name: 'Export reports' })).toBeTruthy()
    expect((screen.getByRole('checkbox', { name: 'Borrowing Activity' }) as HTMLInputElement).checked).toBe(true)
    expect(fetchReport).toHaveBeenCalledTimes(calls)
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    fireEvent.click(screen.getByRole('button', { name: 'Reset Filters' }))
    await waitFor(() => expect(fetchReport).toHaveBeenLastCalledWith('borrowing',
      { category_id: '', equipment_type_id: '', year: String(new Date().getFullYear()) }, expect.any(AbortSignal)))
  })
  it('shows loading, failure, retry, and empty results', async () => {
    vi.spyOn(api, 'fetchOptions').mockResolvedValue(options)
    vi.spyOn(api, 'fetchReport').mockRejectedValueOnce(new Error('offline'))
      .mockResolvedValue({ ...result, availability: [] })
    page()
    expect(screen.getByRole('status').textContent).toContain('Loading analytics')
    expect(await screen.findByRole('alert')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }))
    expect(await screen.findByText('No data matches these filters.')).toBeTruthy()
  })
})
