import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'
import { apiBaseUrl } from '../../api'
import { AnalyticsRequestError, fetchAnalyticsExport, fetchOptions, fetchReport } from '../../features/analytics/api'

const server = setupServer()
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))
afterEach(() => server.resetHandlers())
afterAll(() => server.close())
describe('Analytics API', () => {
  it('sends session credentials and combined filters', async () => {
    server.use(http.get(`${apiBaseUrl}/analytics/lending/`, ({ request }) => {
      const url = new URL(request.url)
      expect(request.credentials).toBe('include')
      expect(url.searchParams.get('category_id')).toBe('1')
      expect(url.searchParams.get('equipment_type_id')).toBe('2')
      expect(url.searchParams.get('year')).toBe('2025')
      expect(url.searchParams.get('report')).toBe('utilization')
      return HttpResponse.json({ year: 2025, rows: [] })
    }))
    expect((await fetchReport('utilization', { category_id: '1', equipment_type_id: '2', year: '2025' })).lending.year).toBe(2025)
  })
  it('does not apply historical year to current availability', async () => {
    server.use(
      http.get(`${apiBaseUrl}/analytics/lending/`, () => HttpResponse.json({ year: 2025, rows: [] })),
      http.get(`${apiBaseUrl}/analytics/availability/`, ({ request }) => {
        expect(new URL(request.url).searchParams.has('year')).toBe(false)
        return HttpResponse.json({ rows: [] })
      }),
    )
    expect((await fetchReport('availability', { category_id: '', equipment_type_id: '', year: '2025' })).availability).toEqual([])
  })
  it.each([400, 403, 500])('preserves HTTP %s errors', async status => {
    server.use(http.get(`${apiBaseUrl}/analytics/options/`, () => new HttpResponse(null, { status })))
    await expect(fetchOptions()).rejects.toEqual(new AnalyticsRequestError(status))
  })
  it.each(['current', 'all'] as const)('exports selected reports with %s scope', async scope => {
    server.use(http.get(`${apiBaseUrl}/analytics/exports/`, ({ request }) => {
      const params = new URL(request.url).searchParams
      expect(request.credentials).toBe('include')
      expect(params.getAll('reports')).toEqual(['availability', 'borrowers'])
      expect(params.get('scope')).toBe(scope)
      expect(params.get('category_id')).toBe(scope === 'current' ? '1' : null)
      expect(params.get('equipment_type_id')).toBe(scope === 'current' ? '2' : null)
      expect(params.get('year')).toBe(scope === 'current' ? '2025' : null)
      return new HttpResponse('workbook bytes', { headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      } })
    }))
    const result = await fetchAnalyticsExport(['availability', 'borrowers'], scope,
      { category_id: '1', equipment_type_id: '2', year: '2025' })
    expect(await result.text()).toBe('workbook bytes')
  })
  it.each([400, 403, 500])('reports export HTTP %s errors', async status => {
    server.use(http.get(`${apiBaseUrl}/analytics/exports/`, () => new HttpResponse(null, { status })))
    await expect(fetchAnalyticsExport(['availability'], 'current',
      { category_id: '', equipment_type_id: '', year: '2025' })).rejects.toMatchObject({ status })
  })
})
