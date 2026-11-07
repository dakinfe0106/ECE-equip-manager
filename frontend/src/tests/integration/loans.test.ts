import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'
import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'
import { fetchLoans, LoanLookupError } from '../../features/lending/api'

const apiBase = 'http://localhost:8000/api'

const server = setupServer(
  http.get(`${apiBase}/loans/`, ({ request }) => {
    const url = new URL(request.url)

    expect(url.searchParams.get('status')).toBe('overdue')
    expect(url.searchParams.get('search')).toBe('ECE-021')

    return HttpResponse.json({
      count: 1,
      next: null,
      previous: null,
      results: [
        {
          loan_id: 7,
          asset_id: 'ECE-021',
          equipment_name: 'Thermal Camera',
          borrower_id: '0000103',
          borrower_name: 'Casey Example',
          checkout_date: '2026-10-20',
          expected_return_date: '2026-11-01',
          actual_return_date: null,
          return_condition: null,
          status: 'overdue',
        },
      ],
    })
  }),
)

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))
afterEach(() => server.resetHandlers())
afterAll(() => server.close())

describe('loans API', () => {
  it('fetches filtered loan records', async () => {
    const response = await fetchLoans('overdue', 'ECE-021')

    expect(response.count).toBe(1)
    expect(response.results[0].status).toBe('overdue')
    expect(response.results[0].asset_id).toBe('ECE-021')
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

    await expect(fetchLoans()).rejects.toBeInstanceOf(LoanLookupError)
  })
})