import { renderToString } from 'react-dom/server'
import { MemoryRouter } from 'react-router'
import { afterEach, describe, expect, it, vi } from 'vitest'
import AppRoutes from './authTestHelpers'
import {
    DashboardLookupError,
    fetchDashboardSummary,
    type DashboardSummary,
} from '../features/dashboard/api'
import DashboardSummaryCards from '../features/dashboard/components/DashboardSummaryCards'

afterEach(() => {
    vi.restoreAllMocks()
})

describe('DashboardSummaryCards', () => {
    it('renders all four dashboard values', () => {
        const summary: DashboardSummary = {
            total_assets: 26,
            available_assets: 21,
            on_loan_assets: 2,
            under_maintenance_assets: 3,
        }

        const html = renderToString(
            <MemoryRouter>
                <DashboardSummaryCards summary={summary} />
            </MemoryRouter>,
        )

        expect(html).toContain('Total Assets')
        expect(html).toContain('>26<')

        expect(html).toContain('Available Assets')
        expect(html).toContain('>21<')

        expect(html).toContain('Assets On Loan')
        expect(html).toContain('>2<')

        expect(html).toContain('Under Maintenance')
        expect(html).toContain('>3<')
    })

    it('renders zero values correctly', () => {
        const summary: DashboardSummary = {
            total_assets: 0,
            available_assets: 0,
            on_loan_assets: 0,
            under_maintenance_assets: 0,
        }

        const html = renderToString(
            <MemoryRouter>
                <DashboardSummaryCards summary={summary} />
            </MemoryRouter>,
        )

        expect(html.match(/>0</g)).toHaveLength(4)
    })
})

describe('Dashboard API', () => {
    it('fetches the dashboard summary from the backend', async () => {
        const mockSummary: DashboardSummary = {
            total_assets: 26,
            available_assets: 21,
            on_loan_assets: 2,
            under_maintenance_assets: 3,
        }

        const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
            new Response(JSON.stringify(mockSummary), {
                status: 200,
                headers: {
                    'Content-Type': 'application/json',
                },
            }),
        )

        const result = await fetchDashboardSummary()

        expect(fetchSpy).toHaveBeenCalledWith(
            'http://localhost:8000/api/dashboard/',
            {
                credentials: 'include',
            },
        )

        expect(result).toEqual(mockSummary)
    })

    it('throws DashboardLookupError when the backend request fails', async () => {
        vi.spyOn(globalThis, 'fetch').mockResolvedValue(
            new Response(null, { status: 500 }),
        )

        await expect(fetchDashboardSummary()).rejects.toBeInstanceOf(
            DashboardLookupError,
        )
    })
})

describe('Dashboard route', () => {
    it('renders the dashboard at the root route', () => {
        vi.spyOn(globalThis, 'fetch').mockImplementation(
            () => new Promise(() => { }),
        )

        const html = renderToString(
            <MemoryRouter initialEntries={['/']}>
                <AppRoutes />
            </MemoryRouter>,
        )

        expect(html).toContain('Equipment operations')
        expect(html).toContain('Loading dashboard information')
        expect(html).not.toContain('Page not found')
    })
})