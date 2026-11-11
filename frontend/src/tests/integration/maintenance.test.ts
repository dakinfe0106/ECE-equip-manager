import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'
import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'
import { apiBaseUrl } from '../../api'
import {
  createMaintenanceRecord,
  fetchAvailableMaintenanceAssets,
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
  it('loads active technicians', async () => {
    const technicians = await fetchMaintenanceTechnicians()

    expect(technicians).toEqual([record.technician])
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
      http.post(
        `${apiBaseUrl}/maintenance-records/`,
        () => HttpResponse.json({ detail: 'Access denied.' }, { status: 403 }),
      ),
    )

    await expect(createMaintenanceRecord({
      asset_id: 5,
      technician_id: 2,
      maintenance_type: 'Repair',
      priority: 'High',
      start_date: '2026-11-01',
    })).rejects.toMatchObject({
      status: 403,
      message: 'Access denied.',
    })
  })
})
