import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'
import { apiBaseUrl } from '../../api'
import {
  BorrowerRequestError,
  createBorrower,
  fetchBorrowerDetails,
  fetchBorrowers,
  updateBorrower,
  type BorrowerDetailsRecord,
  type BorrowerRecord,
  type PaginatedBorrowers,
} from '../../features/borrowers/api'

const borrower: BorrowerRecord = {
  borrower_id: 1,
  unb_id: '0000101',
  first_name: 'Ada',
  last_name: 'Lovelace',
}

const response: PaginatedBorrowers = {
  count: 1,
  next: null,
  previous: null,
  results: [borrower],
}

const borrowerDetails: BorrowerDetailsRecord = {
  borrower_id: 1,
  unb_id: '0000101',
  first_name: 'Ada',
  last_name: 'Lovelace',
  negligent_damage_flag: false,
  unresolved_damage_flag_count: 0,
  damage_warning_level: 'no_warning',
  damage_eligible: true,
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
beforeEach(() => {
  if (typeof document !== 'undefined') {
    document.cookie = 'csrftoken=integration-csrf-token'
  }
})
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

  it('creates a borrower via POST with CSRF token and returns the created record', async () => {
    let receivedBody: unknown
    let receivedCsrf: string | null = null
    let receivedCredentials: RequestCredentials | undefined
    const created: BorrowerRecord = {
      borrower_id: 2,
      unb_id: '3519271',
      first_name: 'Kobi',
      last_name: 'Mensah',
      is_manual_enrollment: true,
    }

    server.use(
      http.post(`${apiBaseUrl}/borrowers/`, async ({ request }) => {
        receivedBody = await request.json()
        receivedCsrf = request.headers.get('X-CSRFToken')
        receivedCredentials = request.credentials
        return HttpResponse.json(created, { status: 201 })
      }),
    )

    const result = await createBorrower({
      unb_id: '3519271',
      first_name: 'Kobi',
      last_name: 'Mensah',
    })

    expect(result).toEqual(created)
    expect(receivedCredentials).toBe('include')
    expect(receivedCsrf).toBe('integration-csrf-token')
    expect(receivedBody).toEqual({
      unb_id: '3519271',
      first_name: 'Kobi',
      last_name: 'Mensah',
    })
  })

  it('extracts field validation messages on a 400 duplicate UNB ID error', async () => {
    server.use(
      http.post(`${apiBaseUrl}/borrowers/`, () =>
        HttpResponse.json(
          { unb_id: ['A borrower with this UNB ID already exists.'] },
          { status: 400 },
        ),
      ),
    )

    await expect(
      createBorrower({
        unb_id: '0000101',
        first_name: 'Ada',
      }),
    ).rejects.toMatchObject({
      status: 400,
      message: 'A borrower with this UNB ID already exists.',
    })
  })

  it('updates a borrower first_name via PATCH with CSRF token and returns the updated record', async () => {
    let receivedBody: unknown
    let receivedCsrf: string | null = null
    let receivedCredentials: RequestCredentials | undefined
    const updated: BorrowerDetailsRecord = {
      ...borrowerDetails,
      first_name: 'Augusta',
    }

    server.use(
      http.patch(`${apiBaseUrl}/borrowers/:borrowerId/`, async ({ params, request }) => {
        if (Number(params.borrowerId) !== 1) {
          return new HttpResponse(null, { status: 404 })
        }
        receivedBody = await request.json()
        receivedCsrf = request.headers.get('X-CSRFToken')
        receivedCredentials = request.credentials
        return HttpResponse.json(updated, { status: 200 })
      }),
    )

    const result = await updateBorrower(1, { first_name: 'Augusta' })

    expect(result).toEqual(updated)
    expect(receivedCredentials).toBe('include')
    expect(receivedCsrf).toBe('integration-csrf-token')
    expect(receivedBody).toEqual({ first_name: 'Augusta' })
  })

  it('reports field validation errors on a 400 PATCH response', async () => {
    server.use(
      http.patch(`${apiBaseUrl}/borrowers/:borrowerId/`, () =>
        HttpResponse.json(
          { first_name: ['Enter a valid first name.'] },
          { status: 400 },
        ),
      ),
    )

    await expect(
      updateBorrower(1, { first_name: '' }),
    ).rejects.toMatchObject({
      status: 400,
      fieldErrors: { first_name: 'Enter a valid first name.' },
    })
  })
})