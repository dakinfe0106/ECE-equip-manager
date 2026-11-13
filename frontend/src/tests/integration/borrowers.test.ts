import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'
import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'
import { apiBaseUrl } from '../../api'
import {
  BorrowerRequestError,
  fetchBorrowerDetails,
  fetchBorrowers,
  type BorrowerDetailsRecord,
  type PaginatedBorrowers,
} from '../../features/borrowers/api'

const response: PaginatedBorrowers = {
  count: 1,
  next: null,
  previous: null,
  results: [
    {
      borrower_id: 1,
      unb_id: '0000101',
      first_name: 'Ada',
      last_name: 'Lovelace',
    },
  ],
}

const borrowerDetails: BorrowerDetailsRecord = {
  borrower_id: 1,
  unb_id: '0000101',
  first_name: 'Ada',
  last_name: 'Lovelace',
  negligent_damage_flag: false,
}

const server = setupServer(
  http.get(`${apiBaseUrl}/borrowers/`, () => HttpResponse.json(response)),
  http.get(`${apiBaseUrl}/borrowers/:borrowerId/`, ({ params }) => (
    Number(params.borrowerId) === borrowerDetails.borrower_id
      ? HttpResponse.json(borrowerDetails)
      : new HttpResponse(null, { status: 404 })
  )),
)

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))
afterEach(() => server.resetHandlers())
afterAll(() => server.close())

describe('Borrowers API client', () => {
  it('loads the paginated borrower response', async () => {
    await expect(fetchBorrowers()).resolves.toEqual(response)
  })

  it('sends the requested page and trimmed search value', async () => {
    let requestedUrl = ''
    server.use(http.get(`${apiBaseUrl}/borrowers/`, ({ request }) => {
      requestedUrl = request.url
      return HttpResponse.json(response)
    }))

    await fetchBorrowers(2, '  ada lovelace  ')

    const params = new URL(requestedUrl).searchParams
    expect(params.get('page')).toBe('2')
    expect(params.get('search')).toBe('ada lovelace')
  })

  it('omits empty search and reports authorization errors', async () => {
    let requestedUrl = ''
    server.use(http.get(`${apiBaseUrl}/borrowers/`, ({ request }) => {
      requestedUrl = request.url
      return new HttpResponse(null, { status: 403 })
    }))

    await expect(fetchBorrowers(1, '   ')).rejects.toBeInstanceOf(BorrowerRequestError)
    await expect(fetchBorrowers()).rejects.toMatchObject({ status: 403 })
    expect(new URL(requestedUrl).searchParams.has('search')).toBe(false)
  })

  it('loads details using the selected numeric borrower ID', async () => {
    let requestedUrl = ''
    server.use(http.get(`${apiBaseUrl}/borrowers/:borrowerId/`, ({ request }) => {
      requestedUrl = request.url
      return HttpResponse.json(borrowerDetails)
    }))

    await expect(fetchBorrowerDetails(1)).resolves.toEqual(borrowerDetails)
    expect(requestedUrl).toBe(`${apiBaseUrl}/borrowers/1/`)
  })

  it('reports details authorization and not-found failures', async () => {
    server.use(http.get(`${apiBaseUrl}/borrowers/:borrowerId/`, ({ params }) => (
      Number(params.borrowerId) === 1
        ? new HttpResponse(null, { status: 403 })
        : new HttpResponse(null, { status: 404 })
    )))

    await expect(fetchBorrowerDetails(1)).rejects.toMatchObject({ status: 403 })
    await expect(fetchBorrowerDetails(2)).rejects.toBeInstanceOf(BorrowerRequestError)
  })
})
