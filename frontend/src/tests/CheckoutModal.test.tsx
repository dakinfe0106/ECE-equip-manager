/**
 * @vitest-environment jsdom
 */

import {
    afterAll,
    afterEach,
    beforeAll,
    describe,
    expect,
    it,
    vi,
} from 'vitest'
import {
    cleanup,
    fireEvent,
    render,
    screen,
    waitFor,
} from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'

import { apiBaseUrl } from '../api'
import CheckoutModal from '../features/lending/components/CheckoutModal'
import type { LoanRecord } from '../features/lending/types'
import LendingPage from '../pages/LendingPage'

const availableAsset = {
    asset_id: 104,
    asset_identifier: 'ECE-104',
    name: 'Network Tester',
    acquisition_date: null,
    status: 'Available' as const,
    equipment_type: {
        type_id: 1,
        name: 'Network Equipment',
        description: 'Network testing tools',
        category: {
            category_id: 1,
            name: 'Testing Equipment',
        },
    },
}

const unavailableAsset = {
    ...availableAsset,
    asset_id: 101,
    asset_identifier: 'ECE-101',
    name: 'ThinkPad T14',
    status: 'On_Loan' as const,
}

const borrower = {
    borrower_id: 5,
    first_name: 'Ada',
    last_name: 'Lovelace',
    unb_id: 'UNB-005',
}

const borrowerDetails = {
    ...borrower,
    negligent_damage_flag: false,
    unresolved_damage_flag_count: 0,
    damage_warning_level: 'no_warning',
    damage_eligible: true,
}

const createdLoan: LoanRecord = {
    loan_id: 20,
    asset_id: 104,
    asset_identifier: 'ECE-104',
    equipment_name: 'Network Tester',
    borrower_id: 5,
    borrower_unb_id: 'UNB-005',
    borrower_name: 'Ada Lovelace',
    checkout_date: '2026-11-16',
    expected_return_date: '2030-01-01',
    actual_return_date: null,
    return_condition: null,
    status: 'on_loan',
}

const server = setupServer(
    http.get(`${apiBaseUrl}/assets/`, () =>
        HttpResponse.json({
            count: 2,
            next: null,
            previous: null,
            results: [availableAsset, unavailableAsset],
        }),
    ),

    http.get(`${apiBaseUrl}/borrowers/`, () =>
        HttpResponse.json({
            count: 1,
            next: null,
            previous: null,
            results: [borrower],
        }),
    ),

    http.get(`${apiBaseUrl}/borrowers/5/`, () =>
        HttpResponse.json(borrowerDetails),
    ),

    http.post(`${apiBaseUrl}/loans/`, () =>
        HttpResponse.json(createdLoan, { status: 201 }),
    ),
)

beforeAll(() => {
    server.listen({ onUnhandledRequest: 'error' })
})

afterEach(() => {
    cleanup()
    server.resetHandlers()
    vi.clearAllMocks()
})

afterAll(() => {
    server.close()
})

async function fillCheckoutForm() {
    const user = userEvent.setup()

    const assetSelect = await screen.findByLabelText('Asset *')
    await user.selectOptions(assetSelect, '104')

    await user.click(
        screen.getByRole('combobox', { name: 'Borrower *' }),
    )

    await user.click(
        await screen.findByRole('option', {
            name: /Ada Lovelace/,
        }),
    )

    await waitFor(() => {
        expect(screen.getByText('Eligible')).toBeTruthy()
    })

    fireEvent.change(
        screen.getByLabelText('Expected Return Date *'),
        {
            target: { value: '2030-01-01' },
        },
    )

    return user
}

describe('CheckoutModal integration', () => {
    it('shows only available assets in the dropdown', async () => {
        render(
            <CheckoutModal
                onClose={vi.fn()}
                onSuccess={vi.fn()}
            />,
        )

        expect(
            await screen.findByRole('option', {
                name: /ECE-104/,
            }),
        ).toBeTruthy()

        expect(
            screen.queryByRole('option', {
                name: /ECE-101/,
            }),
        ).toBeNull()
    })

    it('shows an empty-state message when no assets are available', async () => {
        server.use(
            http.get(`${apiBaseUrl}/assets/`, () =>
                HttpResponse.json({
                    count: 1,
                    next: null,
                    previous: null,
                    results: [unavailableAsset],
                }),
            ),
        )

        render(
            <CheckoutModal
                onClose={vi.fn()}
                onSuccess={vi.fn()}
            />,
        )

        expect(
            await screen.findByText(
                'No equipment is currently available for checkout.',
            ),
        ).toBeTruthy()

        expect(
            screen.getByRole('button', {
                name: 'Confirm Checkout',
            }),
        ).toHaveProperty('disabled', true)
    })

    it('submits the correct checkout data and reports success', async () => {
        const onSuccess = vi.fn()
        let requestBody: unknown

        server.use(
            http.post(`${apiBaseUrl}/loans/`, async ({ request }) => {
                requestBody = await request.json()

                return HttpResponse.json(createdLoan, {
                    status: 201,
                })
            }),
        )

        render(
            <CheckoutModal
                onClose={vi.fn()}
                onSuccess={onSuccess}
            />,
        )

        const user = await fillCheckoutForm()

        await user.click(
            screen.getByRole('button', {
                name: 'Confirm Checkout',
            }),
        )

        await waitFor(() => {
            expect(onSuccess).toHaveBeenCalledWith(createdLoan)
        })

        expect(requestBody).toEqual({
            asset_id: 104,
            borrower_id: 5,
            expected_return_date: '2030-01-01',
        })
    })

    it('shows backend validation errors without reporting success', async () => {
        const onSuccess = vi.fn()

        server.use(
            http.post(`${apiBaseUrl}/loans/`, () =>
                HttpResponse.json(
                    {
                        borrower_id: [
                            'This borrower has overdue equipment.',
                        ],
                    },
                    { status: 400 },
                ),
            ),
        )

        render(
            <CheckoutModal
                onClose={vi.fn()}
                onSuccess={onSuccess}
            />,
        )

        const user = await fillCheckoutForm()

        await user.click(
            screen.getByRole('button', {
                name: 'Confirm Checkout',
            }),
        )

        expect(
            await screen.findByText(
                'This borrower has overdue equipment.',
            ),
        ).toBeTruthy()

        expect(onSuccess).not.toHaveBeenCalled()
    })


    it('refreshes the Lending table after a successful checkout', async () => {
        let checkoutCompleted = false
        let loanRequests = 0

        server.use(
            http.get(`${apiBaseUrl}/loans/`, () => {
                loanRequests += 1

                return HttpResponse.json(
                    checkoutCompleted ? [createdLoan] : [],
                )
            }),

            http.post(`${apiBaseUrl}/loans/`, () => {
                checkoutCompleted = true

                return HttpResponse.json(createdLoan, {
                    status: 201,
                })
            }),
        )

        render(<LendingPage />)

        expect(
            await screen.findByText('No loans found.'),
        ).toBeTruthy()

        const user = userEvent.setup()

        await user.click(
            screen.getByRole('button', {
                name: /new loan/i,
            }),
        )

        expect(
            await screen.findByRole('dialog', {
                name: 'New Loan',
            }),
        ).toBeTruthy()

        await fillCheckoutForm()

        await user.click(
            screen.getByRole('button', {
                name: 'Confirm Checkout',
            }),
        )

        expect(
            await screen.findByText(
                'Network Tester was checked out to Ada Lovelace.',
            ),
        ).toBeTruthy()

        await waitFor(() => {
            expect(screen.getByText('Network Tester')).toBeTruthy()
            expect(loanRequests).toBeGreaterThanOrEqual(2)
        })

        expect(
            screen.queryByRole('dialog', {
                name: 'New Loan',
            }),
        ).toBeNull()
    })


    it('keeps previous borrower results visible but disabled while searching', async () => {
        const user = userEvent.setup()

        const nextBorrower = {
            ...borrower,
            borrower_id: 6,
            first_name: 'Juanita',
            last_name: 'Reyes',
            unb_id: 'UNB-006',
        }

        let releaseSearch!: () => void
        const delayedSearch = new Promise<void>((resolve) => {
            releaseSearch = resolve
        })

        let newSearchStarted = false

        server.use(
            http.get(`${apiBaseUrl}/borrowers/`, async ({ request }) => {
                const search = new URL(request.url).searchParams.get('search')

                if (search === 'Juan') {
                    newSearchStarted = true
                    await delayedSearch

                    return HttpResponse.json({
                        count: 1,
                        next: null,
                        previous: null,
                        results: [nextBorrower],
                    })
                }

                return HttpResponse.json({
                    count: 1,
                    next: null,
                    previous: null,
                    results: [borrower],
                })
            }),
        )

        render(
            <CheckoutModal
                onClose={vi.fn()}
                onSuccess={vi.fn()}
            />,
        )

        const searchInput = screen.getByRole('combobox', {
            name: 'Borrower *',
        })

        await user.click(searchInput)

        const oldResult = await screen.findByRole('option', {
            name: /Ada Lovelace/,
        })

        await user.type(searchInput, 'Juan')

        // Previous results remain visible but cannot be selected.
        expect(oldResult).toHaveProperty('disabled', true)

        // Loading should not push existing results downward.
        expect(screen.queryByText('Searching borrowers...')).toBeNull()

        // Wait for the debounced API request to begin.
        await waitFor(() => {
            expect(newSearchStarted).toBe(true)
        })

        // The previous result stays disabled while the server responds.
        expect(oldResult).toHaveProperty('disabled', true)

        releaseSearch()

        // Only the new matching result should remain.
        expect(
            await screen.findByRole('option', {
                name: /Juanita Reyes/,
            }),
        ).toBeTruthy()

        expect(
            screen.queryByRole('option', {
                name: /Ada Lovelace/,
            }),
        ).toBeNull()
    })


})
