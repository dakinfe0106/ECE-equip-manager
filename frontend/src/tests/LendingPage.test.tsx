
/**
 * @vitest-environment jsdom
 */

import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react'

import LendingPage from '../pages/LendingPage'
import { fetchLoans } from '../features/lending/api'
import type { LoanRecord } from '../features/lending/types'

vi.mock('../features/lending/api', () => ({
  fetchLoans: vi.fn(),
  LoanLookupError: class LoanLookupError extends Error {
    status: number

    constructor(status: number) {
      super('Loan lookup failed')
      this.status = status
    }
  },
}))

const mockedFetchLoans = vi.mocked(fetchLoans)

const sampleLoan: LoanRecord = {
  loan_id: 1,
  asset_id: 10,
  asset_identifier: 'ECE-010',
  equipment_name: 'Oscilloscope',
  borrower_id: 5,
  borrower_unb_id: 'UNB-005',
  borrower_name: 'Ada Lovelace',
  checkout_date: '2026-11-01',
  expected_return_date: '2026-11-20',
  actual_return_date: null,
  return_condition: null,
  status: 'on_loan',
}

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
  vi.useRealTimers()
})

describe('LendingPage review improvements', () => {
  it('debounces search requests by 300 milliseconds', async () => {
    mockedFetchLoans.mockResolvedValue([sampleLoan])

    render(<LendingPage />)

    await waitFor(() => {
      expect(mockedFetchLoans).toHaveBeenCalledTimes(1)
    })

    const search = screen.getByRole('searchbox', {
      name: 'Search loans',
    })

    fireEvent.change(search, {
      target: { value: 'A' },
    })

    fireEvent.change(search, {
      target: { value: 'Ad' },
    })

    fireEvent.change(search, {
      target: { value: 'Ada' },
    })

    // No new request should happen immediately.
    expect(mockedFetchLoans).toHaveBeenCalledTimes(1)

    // Wait for the debounce interval.
    await waitFor(
      () => {
        expect(mockedFetchLoans).toHaveBeenCalledTimes(2)
      },
      { timeout: 1500 },
    )

    expect(mockedFetchLoans).toHaveBeenLastCalledWith(
      expect.any(Object),
      'Ada',
    )
  })

  it('keeps existing loans visible while refreshing results', async () => {
    let resolveRefresh!: (loans: LoanRecord[]) => void

    mockedFetchLoans
      .mockResolvedValueOnce([sampleLoan])
      .mockImplementationOnce(
        () =>
          new Promise<LoanRecord[]>((resolve) => {
            resolveRefresh = resolve
          }),
      )

    render(<LendingPage />)

    await waitFor(() => {
      expect(screen.getByText('Oscilloscope')).toBeTruthy()
    })

    fireEvent.change(
      screen.getByRole('searchbox', {
        name: 'Search loans',
      }),
      {
        target: { value: 'camera' },
      },
    )

    await waitFor(
      () => {
        expect(mockedFetchLoans).toHaveBeenCalledTimes(2)
      },
      { timeout: 1500 },
    )

    // Old data must remain visible during the pending request.
    expect(screen.getByText('Oscilloscope')).toBeTruthy()
    expect(
      screen.getByText('Updating lending records...'),
    ).toBeTruthy()

    await act(async () => {
      resolveRefresh([])
    })

    await waitFor(() => {
      expect(screen.getByText('No loans found.')).toBeTruthy()
    })
  })

  it('shows the number of active filters and hides zero', async () => {
    mockedFetchLoans.mockResolvedValue([sampleLoan])

    render(<LendingPage />)

    const filterButton = screen.getByRole('button', {
      name: /filters/i,
    })

    // No active filters: no count badge.
    expect(filterButton.textContent).not.toMatch(/\d/)

    fireEvent.click(filterButton)

    fireEvent.change(screen.getByLabelText('Loan state'), {
      target: { value: 'overdue' },
    })

    fireEvent.change(screen.getByLabelText('Asset status'), {
      target: { value: 'under_maintenance' },
    })

    fireEvent.click(
      screen.getByRole('button', {
        name: 'Apply Filters',
      }),
    )

    // Two non-default filters should produce a count of 2.
    expect(filterButton.textContent).toContain('2')

    fireEvent.click(filterButton)

    fireEvent.click(
      screen.getByRole('button', {
        name: 'Reset',
      }),
    )

    fireEvent.click(
      screen.getByRole('button', {
        name: 'Apply Filters',
      }),
    )

    expect(filterButton.textContent).not.toMatch(/\d/)
  })
})
