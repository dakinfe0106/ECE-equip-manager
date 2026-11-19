// @vitest-environment jsdom
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'
import { apiBaseUrl } from '../../api'
import {
  AnalyticsRequestError,
  downloadAnalyticsReport,
  fetchAnalyticsReport,
  fetchAnalyticsYears,
} from '../../features/analytics/api'

const server = setupServer(
  http.get(`${apiBaseUrl}/analytics/years/`, () => HttpResponse.json({ years: [2025, 2024] })),
  http.get(`${apiBaseUrl}/analytics/availability/`, () => HttpResponse.json({ results: [] })),
  http.get(`${apiBaseUrl}/analytics/utilization/`, () => HttpResponse.json({ year: 2025, results: [] })),
  http.get(`${apiBaseUrl}/analytics/borrowing/`, () => HttpResponse.json({
    year: 2025,
    total_loans: 4,
    completed_loans: 2,
    active_loans: 2,
    overdue_loans: 1,
    intact_returns: 1,
    damaged_returns: 1,
  })),
  http.get(`${apiBaseUrl}/analytics/borrowers/`, () => HttpResponse.json({ year: 2025, results: [] })),
)

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))
afterEach(() => {
  server.resetHandlers()
  vi.restoreAllMocks()
})
afterAll(() => server.close())

describe('Analytics API client', () => {
  it('loads available checkout years', async () => {
    await expect(fetchAnalyticsYears()).resolves.toEqual([2025, 2024])
  })

  it('sends report filters to the selected report endpoint', async () => {
    let requestedUrl = ''
    server.use(http.get(`${apiBaseUrl}/analytics/borrowers/`, ({ request }) => {
      requestedUrl = request.url
      return HttpResponse.json({ year: 2025, results: [] })
    }))

    await fetchAnalyticsReport('borrowers', {
      year: 2025,
      categoryId: 3,
      equipmentTypeId: 7,
      search: '  Ada  ',
    })

    const params = new URL(requestedUrl).searchParams
    expect(params.get('year')).toBe('2025')
    expect(params.get('category_id')).toBe('3')
    expect(params.get('equipment_type_id')).toBe('7')
    expect(params.get('search')).toBe('Ada')
  })

  it('downloads a filtered Excel workbook', async () => {
    let requestedUrl = ''
    const originalCreateDescriptor = Object.getOwnPropertyDescriptor(URL, 'createObjectURL')
    const originalRevokeDescriptor = Object.getOwnPropertyDescriptor(URL, 'revokeObjectURL')
    Object.defineProperty(URL, 'createObjectURL', { configurable: true, value: vi.fn(() => 'blob:test') })
    Object.defineProperty(URL, 'revokeObjectURL', { configurable: true, value: vi.fn() })
    const anchorClick = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})
    server.use(http.get(`${apiBaseUrl}/analytics/borrowing/`, ({ request }) => {
      requestedUrl = request.url
      return new HttpResponse(new Uint8Array([80, 75, 3, 4]), {
        headers: { 'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' },
      })
    }))

    await downloadAnalyticsReport('borrowing', { year: 2025 })

    expect(new URL(requestedUrl).searchParams.get('year')).toBe('2025')
    expect(new URL(requestedUrl).searchParams.get('export')).toBe('xlsx')
    expect(anchorClick).toHaveBeenCalledOnce()
    if (originalCreateDescriptor) {
      Object.defineProperty(URL, 'createObjectURL', originalCreateDescriptor)
    } else {
      Reflect.deleteProperty(URL, 'createObjectURL')
    }
    if (originalRevokeDescriptor) {
      Object.defineProperty(URL, 'revokeObjectURL', originalRevokeDescriptor)
    } else {
      Reflect.deleteProperty(URL, 'revokeObjectURL')
    }
  })

  it('surfaces API errors with their status', async () => {
    server.use(http.get(`${apiBaseUrl}/analytics/availability/`, () =>
      HttpResponse.json({ detail: 'Access denied.' }, { status: 403 }),
    ))

    await expect(fetchAnalyticsReport('availability', {})).rejects.toMatchObject({
      name: 'AnalyticsRequestError',
      status: 403,
      message: 'Access denied.',
    } satisfies Partial<AnalyticsRequestError>)
  })
})
