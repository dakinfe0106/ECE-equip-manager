// @vitest-environment jsdom
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'
import { apiBaseUrl } from '../api'
import type { BorrowerDetails } from '../features/borrowers/api'
import BorrowersPage from '../pages/BorrowersPage'
import { withAuth } from './authTestUtils'

let borrowers: BorrowerDetails[] = []
let listRequests: { page: string; search: string | null }[] = []
let detailRequests = 0
let patchRequests: {
  body: unknown
  csrfToken: string | null
  credentials: RequestCredentials
}[] = []

const server = setupServer(
  http.get(`${apiBaseUrl}/borrowers/`, ({ request }) => {
    const params = new URL(request.url).searchParams
    const page = params.get('page') ?? '1'
    const search = params.get('search')
    listRequests.push({ page, search })
    const matches = borrowers.filter((borrower) =>
      `${borrower.unb_id} ${borrower.first_name} ${borrower.last_name}`
        .toLowerCase()
        .includes((search ?? '').toLowerCase()),
    )
    const pageNumber = Number(page)
    return HttpResponse.json({
      count: matches.length,
      next: pageNumber * 20 < matches.length ? `?page=${pageNumber + 1}` : null,
      previous: pageNumber > 1 ? `?page=${pageNumber - 1}` : null,
      results: matches.slice((pageNumber - 1) * 20, pageNumber * 20),
    })
  }),
  http.get(`${apiBaseUrl}/borrowers/:borrowerId/`, ({ params }) => {
    detailRequests += 1
    const borrower = borrowers.find((record) => record.borrower_id === Number(params.borrowerId))
    return borrower
      ? HttpResponse.json(borrower)
      : HttpResponse.json({ detail: 'Not found.' }, { status: 404 })
  }),
  http.patch(`${apiBaseUrl}/borrowers/:borrowerId/`, async ({ params, request }) => {
    const body: unknown = await request.json()
    patchRequests.push({
      body,
      csrfToken: request.headers.get('x-csrftoken'),
      credentials: request.credentials,
    })
    if (typeof body !== 'object' || body === null || !('first_name' in body)) {
      return HttpResponse.json({ detail: 'Invalid request.' }, { status: 400 })
    }
    const borrower = borrowers.find((record) => record.borrower_id === Number(params.borrowerId))
    if (!borrower) return HttpResponse.json({ detail: 'Not found.' }, { status: 404 })
    borrower.first_name = String(body.first_name)
    return HttpResponse.json(borrower)
  }),
)

function renderBorrowersPage() {
  return render(withAuth(<BorrowersPage />))
}

function makeBorrowers(): BorrowerDetails[] {
  return Array.from({ length: 22 }, (_, index) => ({
    borrower_id: index + 1,
    unb_id: `UNB-${String(index + 1).padStart(3, '0')}`,
    first_name: `Ada ${index + 1}`,
    last_name: `Person ${index + 1}`,
  }))
}

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))
beforeEach(() => {
  borrowers = makeBorrowers()
  listRequests = []
  detailRequests = 0
  patchRequests = []
  document.cookie = 'csrftoken=test-csrf-token; path=/'
})
afterEach(() => {
  cleanup()
  server.resetHandlers()
  document.cookie = 'csrftoken=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/'
})
afterAll(() => server.close())

describe('Borrower selection and editing', () => {
  it('fetches and prefills one borrower, submits only first_name with CSRF, then refreshes details and the current list', async () => {
    const user = userEvent.setup()
    renderBorrowersPage()
    await screen.findByText('Ada 1 Person 1')

    await user.type(screen.getByRole('searchbox'), 'Ada{Enter}')
    await screen.findByText('Page 1 of 2')
    await user.click(screen.getByRole('button', { name: 'Next' }))
    await screen.findByText('Page 2 of 2')
    await user.click(
      screen.getByRole('button', {
        name: 'Edit borrower Ada 22 Person 22 (UNB ID UNB-022)',
      }),
    )

    const dialog = await screen.findByRole('dialog', { name: 'Ada 22 Person 22' })
    const firstName = await screen.findByLabelText('First name')
    expect((firstName as HTMLInputElement).value).toBe('Ada 22')
    const borrowerEyebrow = within(dialog).getByText(/Borrower details/)
    expect(borrowerEyebrow.textContent?.replace(/\s+/g, ' ').trim()).toBe(
      'Borrower details · UNB ID UNB-022',
    )
    expect(within(dialog).getByRole('heading', { level: 2, name: 'Ada 22 Person 22' })).toBeTruthy()
    expect(within(dialog).getByRole('region', { name: 'Borrower information' })).toBeTruthy()
    expect(dialog.className).toContain('max-w-[650px]')
    expect(dialog.querySelector('.sm\\:grid-cols-2')).toBeTruthy()
    expect((within(dialog).getByLabelText('Borrower ID · Read only') as HTMLInputElement).value).toBe('22')
    expect((within(dialog).getByLabelText('UNB ID · Read only') as HTMLInputElement).value).toBe('UNB-022')
    expect((within(dialog).getByLabelText('Last name · Read only') as HTMLInputElement).value).toBe('Person 22')
    expect((firstName as HTMLInputElement).readOnly).toBe(false)
    expect((within(dialog).getByLabelText('Borrower ID · Read only') as HTMLInputElement).readOnly).toBe(true)
    expect((within(dialog).getByLabelText('UNB ID · Read only') as HTMLInputElement).readOnly).toBe(true)
    expect((within(dialog).getByLabelText('Last name · Read only') as HTMLInputElement).readOnly).toBe(true)
    expect(patchRequests).toHaveLength(0)

    await user.clear(firstName)
    await user.type(firstName, '  Ada Updated  ')
    await user.click(screen.getByRole('button', { name: 'Save changes' }))

    await waitFor(() => expect(detailRequests).toBe(2))
    await waitFor(() => {
      expect(listRequests.at(-1)).toEqual({ page: '2', search: 'Ada' })
    })
    expect(patchRequests).toEqual([
      {
        body: { first_name: 'Ada Updated' },
        csrfToken: 'test-csrf-token',
        credentials: 'include',
      },
    ])
    const successMessage = await screen.findByRole('status')
    expect(successMessage.textContent).toBe('Borrower updated successfully.')
    expect(successMessage.getAttribute('aria-live')).toBe('polite')
    expect((screen.getByLabelText('First name') as HTMLInputElement).value).toBe('Ada Updated')
    expect(within(screen.getByRole('table')).getByText('Ada Updated Person 22')).toBeTruthy()
    expect((screen.getByRole('searchbox') as HTMLInputElement).value).toBe('Ada')
    expect(screen.getByText('Page 2 of 2')).toBeTruthy()
  })

  it('does not save when editing is cancelled', async () => {
    const user = userEvent.setup()
    renderBorrowersPage()
    await screen.findByText('Ada 1 Person 1')
    await user.click(
      screen.getByRole('button', {
        name: 'Edit borrower Ada 1 Person 1 (UNB ID UNB-001)',
      }),
    )
    const firstName = await screen.findByLabelText('First name')
    await user.clear(firstName)
    await user.type(firstName, 'Changed but cancelled')
    await user.click(screen.getByRole('button', { name: 'Cancel' }))

    expect(screen.queryByRole('dialog')).toBeNull()
    expect(patchRequests).toHaveLength(0)
    expect(borrowers[0].first_name).toBe('Ada 1')
  })

  it('validates trimmed required first name and the 255-character limit before saving', async () => {
    const user = userEvent.setup()
    renderBorrowersPage()
    await screen.findByText('Ada 1 Person 1')
    await user.click(
      screen.getByRole('button', {
        name: 'Edit borrower Ada 1 Person 1 (UNB ID UNB-001)',
      }),
    )
    const firstName = await screen.findByLabelText('First name')
    await user.clear(firstName)
    await user.type(firstName, '   ')
    await user.click(screen.getByRole('button', { name: 'Save changes' }))
    expect(await screen.findByText('Enter a first name.')).toBeTruthy()
    expect(patchRequests).toHaveLength(0)

    fireEvent.change(firstName, { target: { value: 'x'.repeat(256) } })
    await user.click(screen.getByRole('button', { name: 'Save changes' }))
    expect(await screen.findByText('First name must be 255 characters or fewer.')).toBeTruthy()
    expect(patchRequests).toHaveLength(0)
  })

  it('accepts an abbreviated first name even when another borrower has the same name', async () => {
    const user = userEvent.setup()
    borrowers[1].first_name = 'LilyJ'
    renderBorrowersPage()
    await screen.findByText('Ada 1 Person 1')
    await user.click(
      screen.getByRole('button', {
        name: 'Edit borrower Ada 1 Person 1 (UNB ID UNB-001)',
      }),
    )
    const firstName = await screen.findByLabelText('First name')
    await user.clear(firstName)
    await user.type(firstName, 'LilyJ')
    await user.click(screen.getByRole('button', { name: 'Save changes' }))

    expect(await screen.findByText('Borrower updated successfully.')).toBeTruthy()
    expect(borrowers[0].first_name).toBe('LilyJ')
    expect(borrowers[1].first_name).toBe('LilyJ')
  })

  it('announces detail loading and save progress', async () => {
    const user = userEvent.setup()
    const wait = () => new Promise((resolve) => setTimeout(resolve, 80))
    server.use(
      http.get(`${apiBaseUrl}/borrowers/:borrowerId/`, async ({ params }) => {
        detailRequests += 1
        await wait()
        const borrower = borrowers.find((record) => record.borrower_id === Number(params.borrowerId))
        return borrower ? HttpResponse.json(borrower) : HttpResponse.json(null, { status: 404 })
      }),
      http.patch(`${apiBaseUrl}/borrowers/:borrowerId/`, async ({ params, request }) => {
        const body = await request.json() as { first_name: string }
        await wait()
        const borrower = borrowers.find((record) => record.borrower_id === Number(params.borrowerId))
        if (!borrower) return HttpResponse.json(null, { status: 404 })
        borrower.first_name = body.first_name
        return HttpResponse.json(borrower)
      }),
    )
    renderBorrowersPage()
    await screen.findByText('Ada 1 Person 1')
    await user.click(
      screen.getByRole('button', {
        name: 'Edit borrower Ada 1 Person 1 (UNB ID UNB-001)',
      }),
    )
    expect(await screen.findByText('Loading borrower details…')).toBeTruthy()
    const firstName = await screen.findByLabelText('First name')
    await user.clear(firstName)
    await user.type(firstName, 'Ada Edited')
    await user.click(screen.getByRole('button', { name: 'Save changes' }))

    expect(await screen.findByText('Saving borrower changes…')).toBeTruthy()
    expect(await screen.findByText('Borrower updated successfully.')).toBeTruthy()
    await waitFor(() => expect(detailRequests).toBe(2))
  })

  it('shows a field validation error returned by the API accessibly', async () => {
    const user = userEvent.setup()
    server.use(http.patch(`${apiBaseUrl}/borrowers/:borrowerId/`, () =>
      HttpResponse.json({ first_name: ['Enter a valid first name.'] }, { status: 400 }),
    ))
    renderBorrowersPage()
    await screen.findByText('Ada 1 Person 1')
    await user.click(
      screen.getByRole('button', {
        name: 'Edit borrower Ada 1 Person 1 (UNB ID UNB-001)',
      }),
    )
    await screen.findByLabelText('First name')
    await user.click(screen.getByRole('button', { name: 'Save changes' }))

    expect(await screen.findByText('Enter a valid first name.')).toBeTruthy()
    expect(screen.getByRole('alert')).toBeTruthy()
    expect(borrowers[0].first_name).toBe('Ada 1')
  })

  it('shows a general API error when saving fails', async () => {
    const user = userEvent.setup()
    server.use(http.patch(`${apiBaseUrl}/borrowers/:borrowerId/`, () =>
      HttpResponse.json({ detail: 'Temporary server error.' }, { status: 500 }),
    ))
    renderBorrowersPage()
    await screen.findByText('Ada 1 Person 1')
    await user.click(
      screen.getByRole('button', {
        name: 'Edit borrower Ada 1 Person 1 (UNB ID UNB-001)',
      }),
    )
    await screen.findByLabelText('First name')
    await user.click(screen.getByRole('button', { name: 'Save changes' }))

    const alert = await screen.findByRole('alert')
    expect(alert.textContent).toContain('Could not save borrower (error 500).')
    expect(borrowers[0].first_name).toBe('Ada 1')
  })
})
