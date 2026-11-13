import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'
import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'
import { apiBaseUrl } from '../../api'
import {
  createMaintenanceRecord,
  fetchAssetMaintenanceHistory,
  fetchAvailableMaintenanceAssets,
  fetchMaintenanceRecords,
  fetchMaintenanceTechnicians,
  type MaintenanceRecord,
} from '../../features/maintenance/api'

const record: MaintenanceRecord = {
  maintenance_id: 17,
  asset: {
    asset_id: 5,
    asset_identifier: 'SHOP-005',
    name: 'Oscilloscope',
    status: 'Under_Maintenance',
    equipment_type: 'Test Equipment',
  },
  technician: {
    id: 2,
    username: 'shop-tech',
    first_name: 'Shop',
    last_name: 'Technician',
  },
  maintenance_type: 'Repair',
  priority: 'High',
  start_date: '2026-11-01',
  end_date: null,
  status: 'In Progress',
}

const server = setupServer(
  http.get(`${apiBaseUrl}/maintenance-records/`, () =>
    HttpResponse.json({ count: 1, next: null, previous: null, results: [record] }),
  ),
  http.get(`${apiBaseUrl}/maintenance-records/technicians/`, () =>
    HttpResponse.json([record.technician]),
  ),
  http.get(`${apiBaseUrl}/auth/csrf/`, () =>
    HttpResponse.json({ csrfToken: 'test-csrf-token' }),
  ),
  http.post(`${apiBaseUrl}/maintenance-records/`, () =>
    HttpResponse.json(record, { status: 201 }),
  ),
  http.get(`${apiBaseUrl}/assets/`, () =>
    HttpResponse.json({
      count: 1,
      next: null,
      previous: null,
      results: [
        {
          asset_id: 5,
          asset_identifier: 'SHOP-005',
          name: 'Oscilloscope',
          acquisition_date: null,
          status: 'Available',
          equipment_type: {
            type_id: 2,
            name: 'Test Equipment',
            description: '',
            category: { category_id: 1, name: 'Tools' },
          },
        },
      ],
    }),
  ),
)

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))
afterEach(() => server.resetHandlers())
afterAll(() => server.close())

describe('Maintenance API client', () => {
  it('loads maintenance records with server-side filters', async () => {
    let requestedUrl = ''
    server.use(http.get(`${apiBaseUrl}/maintenance-records/`, ({ request }) => {
      requestedUrl = request.url
      return HttpResponse.json({
        count: 1,
        next: null,
        previous: null,
        results: [record],
      })
    }))

    const result = await fetchMaintenanceRecords({
      asset_identifier: ' SHOP-00 ',
      status: 'in_progress',
      maintenance_type: 'Repair',
      priority: 'High',
    }, 2)

    const query = new URL(requestedUrl).searchParams
    expect(query.get('asset_identifier')).toBe('SHOP-00')
    expect(query.get('status')).toBe('in_progress')
    expect(query.get('maintenance_type')).toBe('Repair')
    expect(query.get('priority')).toBe('High')
    expect(query.get('page')).toBe('2')
    expect(result.results).toEqual([record])
  })

  it('loads all maintenance history for one asset and active technicians', async () => {
    let historyUrl = ''
    server.use(http.get(`${apiBaseUrl}/maintenance-records/`, ({ request }) => {
      historyUrl = request.url
      return HttpResponse.json({
        count: 1,
        next: null,
        previous: null,
        results: [record],
      })
    }))

    const history = await fetchAssetMaintenanceHistory(5)
    const technicians = await fetchMaintenanceTechnicians()

    expect(new URL(historyUrl).searchParams.get('asset_id')).toBe('5')
    expect(history).toEqual([record])
    expect(technicians).toEqual([record.technician])
  })

  it('fetches every page of an asset maintenance history', async () => {
    const secondRecord = { ...record, maintenance_id: 18 }
    let requestedPages = 0
    server.use(http.get(`${apiBaseUrl}/maintenance-records/`, ({ request }) => {
      requestedPages += 1
      const page = new URL(request.url).searchParams.get('page')
      return HttpResponse.json({
        count: 21,
        next: page === '1' ? `${apiBaseUrl}/maintenance-records/?page=2` : null,
        previous: page === '1' ? null : `${apiBaseUrl}/maintenance-records/?page=1`,
        results: page === '1'
          ? [record, ...Array.from({ length: 19 }, (_, index) => ({
              ...record,
              maintenance_id: index + 20,
            }))]
          : [secondRecord],
      })
    }))

    const history = await fetchAssetMaintenanceHistory(5)

    expect(requestedPages).toBe(2)
    expect(history).toHaveLength(21)
    expect(history[20]).toEqual(secondRecord)
  })

  it('searches only currently available assets', async () => {
    let requestedUrl = ''
    server.use(http.get(`${apiBaseUrl}/assets/`, ({ request }) => {
      requestedUrl = request.url
      return HttpResponse.json({
        count: 1,
        next: null,
        previous: null,
        results: [],
      })
    }))

    await fetchAvailableMaintenanceAssets('SHOP-005')

    const query = new URL(requestedUrl).searchParams
    expect(query.get('status')).toBe('Available')
    expect(query.get('asset_identifier')).toBe('SHOP-005')
  })

  it('creates records with a CSRF-protected request', async () => {
    let createBody: unknown
    let csrfHeader = ''
    server.use(
      http.post(`${apiBaseUrl}/maintenance-records/`, async ({ request }) => {
        createBody = await request.json()
        csrfHeader = request.headers.get('X-CSRFToken') ?? ''
        return HttpResponse.json(record, { status: 201 })
      }),
    )

    await createMaintenanceRecord({
      asset_id: 5,
      technician_id: 2,
      maintenance_type: 'Repair',
      priority: 'High',
      start_date: '2026-11-01',
    })
    expect(createBody).toEqual({
      asset_id: 5,
      technician_id: 2,
      maintenance_type: 'Repair',
      priority: 'High',
      start_date: '2026-11-01',
    })
    expect(csrfHeader).toBe('test-csrf-token')
  })

  it('surfaces forbidden responses', async () => {
    server.use(
      http.get(
        `${apiBaseUrl}/maintenance-records/`,
        () => HttpResponse.json({ detail: 'Access denied.' }, { status: 403 }),
      ),
    )

    await expect(fetchMaintenanceRecords()).rejects.toMatchObject({
      status: 403,
      message: 'Access denied.',
    })
  })
})
