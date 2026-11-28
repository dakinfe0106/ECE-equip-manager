import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'
import { apiBaseUrl } from '../../api'
import { ExportRequestError, fetchRecordsExport } from '../../features/importExport/api'

const server = setupServer()
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))
afterEach(() => server.resetHandlers())
afterAll(() => server.close())

describe('Import & Export API', () => {
  it.each([
    ['inventory', '/assets/export/'],
    ['lending', '/loans/export/'],
  ] as const)('downloads the %s workbook with session credentials', async (record, path) => {
    server.use(http.get(`${apiBaseUrl}${path}`, ({ request }) => {
      expect(request.credentials).toBe('include')
      return new HttpResponse('workbook bytes', { headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      } })
    }))

    expect(await (await fetchRecordsExport(record)).text()).toBe('workbook bytes')
  })

  it('reports a permission error for 403', async () => {
    server.use(http.get(`${apiBaseUrl}/loans/export/`, () => new HttpResponse(null, { status: 403 })))

    await expect(fetchRecordsExport('lending')).rejects.toEqual(new ExportRequestError(403))
    await expect(fetchRecordsExport('lending')).rejects.toMatchObject({
      status: 403, message: 'Sign in or ask for access to export records.',
    })
  })

  it('reports a retryable error for server failures', async () => {
    server.use(http.get(`${apiBaseUrl}/assets/export/`, () => new HttpResponse(null, { status: 500 })))

    await expect(fetchRecordsExport('inventory')).rejects.toMatchObject({
      status: 500, message: 'Could not export records. Please try again.',
    })
  })
})
