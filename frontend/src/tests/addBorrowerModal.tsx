// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'
import { MemoryRouter } from 'react-router'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { apiBaseUrl } from '../api'
import type { BorrowerRecord } from '../features/borrowers/api'
import BorrowersPage from '../pages/BorrowersPage'
import { withAuth } from './authTestUtils'

const existingBorrower: BorrowerRecord = {
  borrower_id: 1,
  unb_id: '0000101',
  first_name: 'Ada',
  last_name: 'Lovelace',
}

const server = setupServer(
  http.get(`${apiBaseUrl}/borrowers/`, () =>
    HttpResponse.json({
      count: 1,
      next: null,
      previous: null,
      results: [existingBorrower],
    }),
  ),
)

function renderBorrowersPage() {
  return render(<MemoryRouter>{withAuth(<BorrowersPage />)}</MemoryRouter>)
}

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))
beforeEach(() => {
  document.cookie = 'csrftoken=test-csrf-token'
})
afterEach(() => {
  cleanup()
  server.resetHandlers()
})
afterAll(() => server.close())

describe('Add Borrower modal workflows', () => {
  it('opens the modal, validates required fields, and cancels without submitting', async () => {
    const user = userEvent.setup()
    let postCount = 0
    server.use(
      http.post(`${apiBaseUrl}/borrowers/`, () => {
        postCount += 1
        return HttpResponse.json(existingBorrower, { status: 201 })
      }),
    )

    renderBorrowersPage()
    await screen.findByText('Ada Lovelace')

    await user.click(screen.getByRole('button', { name: 'Add Borrower' }))
    expect(screen.getByRole('dialog', { name: 'Add Borrower' })).toBeTruthy()
    expect(screen.queryByLabelText(/Eligibility/i)).toBeNull()

    await user.click(screen.getByRole('button', { name: 'Save' }))
    expect(await screen.findByText('Please complete all required fields.')).toBeTruthy()
    expect(postCount).toBe(0)

    await user.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(screen.queryByRole('dialog', { name: 'Add Borrower' })).toBeNull()
  })

  it('creates a borrower and adds it to the visible table with a success banner', async () => {
    const user = userEvent.setup()
    let receivedBody: unknown
    let receivedCsrf: string | null = null
    const createdBorrower: BorrowerRecord = {
      borrower_id: 2,
      unb_id: '3519271',
      first_name: 'Kobi',
      last_name: 'Mensah',
    }

    server.use(
      http.post(`${apiBaseUrl}/borrowers/`, async ({ request }) => {
        receivedBody = await request.json()
        receivedCsrf = request.headers.get('X-CSRFToken')
        return HttpResponse.json(createdBorrower, { status: 201 })
      }),
    )

    renderBorrowersPage()
    await screen.findByText('Ada Lovelace')

    await user.click(screen.getByRole('button', { name: 'Add Borrower' }))
    await user.type(screen.getByLabelText(/UNB ID/), '  3519271  ')
    await user.type(screen.getByLabelText(/First Name/), '  Kobi  ')
    await user.type(screen.getByLabelText(/Last Name/), '  Mensah  ')
    await user.click(screen.getByRole('button', { name: 'Save' }))

    expect(
      await screen.findByText('Borrower Kobi Mensah (3519271) was added successfully.'),
    ).toBeTruthy()
    expect(screen.queryByRole('dialog', { name: 'Add Borrower' })).toBeNull()
    expect(screen.getByText('Kobi Mensah')).toBeTruthy()
    expect(screen.getByText('3519271')).toBeTruthy()
    expect(receivedCsrf).toBe('test-csrf-token')
    expect(receivedBody).toEqual({
      unb_id: '3519271',
      first_name: 'Kobi',
      last_name: 'Mensah',
    })
  })

  it('displays backend 400 validation errors inside the modal without closing it', async () => {
    const user = userEvent.setup()
    server.use(
      http.post(`${apiBaseUrl}/borrowers/`, () =>
        HttpResponse.json(
          { unb_id: ['A borrower with this UNB ID already exists.'] },
          { status: 400 },
        ),
      ),
    )

    renderBorrowersPage()
    await screen.findByText('Ada Lovelace')

    await user.click(screen.getByRole('button', { name: 'Add Borrower' }))
    await user.type(screen.getByLabelText(/UNB ID/), '0000101')
    await user.type(screen.getByLabelText(/First Name/), 'Duplicate')
    await user.click(screen.getByRole('button', { name: 'Save' }))

    expect(
      await screen.findByText('A borrower with this UNB ID already exists.'),
    ).toBeTruthy()
    expect(screen.getByRole('dialog', { name: 'Add Borrower' })).toBeTruthy()
  })
})