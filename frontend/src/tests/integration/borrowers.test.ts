import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'
import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'
import { apiBaseUrl } from '../../api'
import {
  BorrowerRequestError,
  createBorrower,
  fetchBorrowerDetails,
  fetchBorrowers,
  updateBorrower,
  type BorrowerCreateInput,
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
  unresolved_damage_flag_count: 0,
  damage_warning_level: 'no_warning',
  damage_eligible: true,
  is_manual_enrollment: false,
}

const updatedBorrowerDetails: BorrowerDetailsRecord = {
  ...borrowerDetails,
  first_name: 'Adeline',
}

const server = setupServer(
  http.get(`${apiBaseUrl}/borrowers/`, () => HttpResponse.json(response)),
  http.post(`${apiBaseUrl}/borrowers/`, async ({ request }) => {
    const body = (await request.json()) as BorrowerCreateInput
    return HttpResponse.json(
      {
        borrower_id: 2,
        unb_id: body.unb_id,
        first_name: body.first_name,
        last_name: body.last_name ?? '',
      },
      { status: 201 },
    )
  }),
  http.get(`${apiBaseUrl}/borrowers/:borrowerId/`, ({ params }) => (
    Number(params.borrowerId) === borrowerDetails.borrower_id
      ? HttpResponse.json(borrowerDetails)
      : new HttpResponse(null, { status: 404 })
  )),
  http.patch(`${apiBaseUrl}/borrowers/:borrowerId/`, async ({ params, request }) => {
    if (Number(params.borrowerId) === borrowerDetails.borrower_id) {
      const body = (await request.json()) as { first_name: string }
      return HttpResponse.json({ ...borrowerDetails, first_name: body.first_name })
    }
    return new HttpResponse(null, { status: 404 })
  }),
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

  it('updates the borrower first name successfully via PATCH', async () => {
    let capturedBody: unknown = null
    let requestedUrl = ''

    server.use(
      http.patch(`${apiBaseUrl}/borrowers/:borrowerId/`, async ({ request }) => {
        requestedUrl = request.url
        capturedBody = await request.json()
        return HttpResponse.json(updatedBorrowerDetails)
      }),
    )

    const result = await updateBorrower(1, { first_name: 'Adeline' })
    expect(requestedUrl).toBe(`${apiBaseUrl}/borrowers/1/`)
    expect(capturedBody).toEqual({ first_name: 'Adeline' })
    expect(result.first_name).toBe('Adeline')
  })

  it('creates a new borrower successfully via POST', async () => {
    let capturedBody: unknown = null
    let requestedUrl = ''

    server.use(
      http.post(`${apiBaseUrl}/borrowers/`, async ({ request }) => {
        requestedUrl = request.url
        capturedBody = await request.json()
        return HttpResponse.json(
          {
            borrower_id: 2,
            unb_id: '3519271',
            first_name: 'Kobi',
            last_name: 'Mensah',
          },
          { status: 201 },
        )
      }),
    )

    const result = await createBorrower({
      unb_id: '3519271',
      first_name: 'Kobi',
      last_name: 'Mensah',
    })

    expect(requestedUrl).toBe(`${apiBaseUrl}/borrowers/`)
    expect(capturedBody).toEqual({
      unb_id: '3519271',
      first_name: 'Kobi',
      last_name: 'Mensah',
    })
    expect(result).toEqual({
      borrower_id: 2,
      unb_id: '3519271',
      first_name: 'Kobi',
      last_name: 'Mensah',
    })
  })

  it('throws BorrowerRequestError with fieldErrors when POST fails with 400', async () => {
    server.use(
      http.post(`${apiBaseUrl}/borrowers/`, () =>
        HttpResponse.json(
          { unb_id: ['A borrower with this UNB ID already exists.'] },
          { status: 400 },
        ),
      ),
    )

    await expect(
      createBorrower({ unb_id: '0000101', first_name: 'Duplicate' }),
    ).rejects.toMatchObject({
      status: 400,
      fieldErrors: {
        unb_id: ['A borrower with this UNB ID already exists.'],
      },
    })
  })
})