import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'
import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'
import { fetchLoans, LoanLookupError } from '../../features/lending/api'
import { defaultLoanFilters } from '../../features/lending/types'

const apiBase = 'http://localhost:8000/api'

const server = setupServer(
  http.get(`${apiBase}/loans/`, ({ request }) => {
    const url = new URL(request.url)

    expect(url.searchParams.get('status')).toBe('overdue')
    expect(url.searchParams.get('search')).toBe('ECE-021')
    expect(url.searchParams.get('expected_return_from')).toBe('2026-10-01')
    expect(url.searchParams.get('expected_return_to')).toBe('2026-11-30')
    expect(url.searchParams.get('asset_status')).toBe('on_loan')

    return HttpResponse.json([
      {
        loan_id: 7,
        asset_id: 21,
        asset_identifier: 'ECE-021',
        equipment_name: 'Thermal Camera',
        borrower_id: 103,
        borrower_unb_id: 'UNB-0103',
        borrower_name: 'Casey Example',
        checkout_date: '2026-10-20',
        expected_return_date: '2026-11-01',
        actual_return_date: null,
        return_condition: null,
        status: 'overdue',
      },
    ])
  }),
)

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))
afterEach(() => server.resetHandlers())
afterAll(() => server.close())

describe('loans API', () => {
  it('fetches filtered loan records', async () => {
    const response = await fetchLoans(
      {
        loanState: 'overdue',
        expectedReturnDateFrom: '2026-10-01',
        expectedReturnDateTo: '2026-11-30',
        assetStatus: 'on_loan',
      },
      'ECE-021',
    )

    expect(response).toHaveLength(1)
    expect(response[0].status).toBe('overdue')
    expect(response[0].asset_id).toBe(21)
    expect(response[0].asset_identifier).toBe('ECE-021')
    expect(response[0].borrower_unb_id).toBe('UNB-0103')
  })

  it('throws LoanLookupError when the request fails', async () => {
    server.use(
      http.get(`${apiBase}/loans/`, () =>
        HttpResponse.json(
          { detail: 'Forbidden' },
          { status: 403 },
        ),
      ),
    )

    await expect(
      fetchLoans(defaultLoanFilters),
    ).rejects.toBeInstanceOf(LoanLookupError)
  })
})