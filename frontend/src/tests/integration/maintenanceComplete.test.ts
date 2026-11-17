import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'
import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'
import { apiBaseUrl } from '../../api'
import {
  completeMaintenanceRecord,
  MaintenanceRequestError,
  type MaintenanceRecord,
} from '../../features/maintenance/api'

const completedRecord: MaintenanceRecord = {
  maintenance_id: 17,
  asset: {
    asset_id: 5,
    asset_identifier: 'SHOP-005',
    name: 'Oscilloscope',
    status: 'Available',
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
  end_date: '2026-11-05',
  status: 'Completed',
}

let requestBody: unknown
let csrfHeader: string | null
let completeResponse = () => HttpResponse.json(completedRecord)

const server = setupServer(
  http.get(`${apiBaseUrl}/auth/csrf/`, () =>
    HttpResponse.json({ csrfToken: 'test-csrf-token' }),
  ),
  http.post(
    `${apiBaseUrl}/maintenance-records/17/complete/`,
    async ({ request }) => {
      requestBody = await request.json()
      csrfHeader = request.headers.get('X-CSRFToken')
      return completeResponse()
    },
  ),
)

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))
afterEach(() => {
  server.resetHandlers()
  completeResponse = () => HttpResponse.json(completedRecord)
})
afterAll(() => server.close())

describe('completeMaintenanceRecord', () => {
  it('posts the completion date with the CSRF token and returns the record', async () => {
    const record = await completeMaintenanceRecord(17, '2026-11-05')

    expect(requestBody).toEqual({ end_date: '2026-11-05' })
    expect(csrfHeader).toBe('test-csrf-token')
    expect(record.status).toBe('Completed')
    expect(record.asset.status).toBe('Available')
  })

  it('surfaces the server message when completion is rejected', async () => {
    completeResponse = () =>
      HttpResponse.json(
        { end_date: 'Completion date cannot be earlier than the start date.' },
        { status: 400 },
      )

    const error = await completeMaintenanceRecord(17, '2026-10-01').catch(
      (reason: unknown) => reason,
    )

    expect(error).toBeInstanceOf(MaintenanceRequestError)
    expect(error).toHaveProperty('status', 400)
    expect(error).toHaveProperty(
      'message',
      'Completion date cannot be earlier than the start date.',
    )
  })
})
