import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'
import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'
import { apiBaseUrl } from '../../api'
import {
  MaintenanceRequestError,
  updateMaintenanceRecord,
  type MaintenanceRecord,
} from '../../features/maintenance/api'

const updatedRecord: MaintenanceRecord = {
  maintenance_id: 17,
  asset: {
    asset_id: 5,
    asset_identifier: 'SHOP-005',
    name: 'Oscilloscope',
    status: 'Under_Maintenance',
    equipment_type: 'Test Equipment',
  },
  technician: {
    id: 3,
    username: 'lab-tech',
    first_name: 'Lab',
    last_name: 'Technician',
  },
  maintenance_type: 'Calibration',
  priority: 'Urgent',
  start_date: '2026-11-01',
  end_date: null,
  status: 'In Progress',
}

let requestBody: unknown
let csrfHeader: string | null
let updateResponse = () => HttpResponse.json(updatedRecord)

const server = setupServer(
  http.get(`${apiBaseUrl}/auth/csrf/`, () =>
    HttpResponse.json({ csrfToken: 'test-csrf-token' }),
  ),
  http.patch(`${apiBaseUrl}/maintenance-records/17/`, async ({ request }) => {
    requestBody = await request.json()
    csrfHeader = request.headers.get('X-CSRFToken')
    return updateResponse()
  }),
)

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))
afterEach(() => {
  server.resetHandlers()
  updateResponse = () => HttpResponse.json(updatedRecord)
})
afterAll(() => server.close())

describe('updateMaintenanceRecord', () => {
  it('patches only the given fields with the CSRF token and returns the record', async () => {
    const record = await updateMaintenanceRecord(17, {
      maintenance_type: 'Calibration',
      priority: 'Urgent',
      technician_id: 3,
    })

    expect(requestBody).toEqual({
      maintenance_type: 'Calibration',
      priority: 'Urgent',
      technician_id: 3,
    })
    expect(csrfHeader).toBe('test-csrf-token')
    expect(record.priority).toBe('Urgent')
    expect(record.technician.id).toBe(3)
  })

  it('surfaces the server message when a completed record is edited', async () => {
    updateResponse = () =>
      HttpResponse.json(
        { maintenance_id: 'Completed maintenance records cannot be edited.' },
        { status: 400 },
      )

    const error = await updateMaintenanceRecord(17, { priority: 'Low' }).catch(
      (reason: unknown) => reason,
    )

    expect(error).toBeInstanceOf(MaintenanceRequestError)
    expect(error).toHaveProperty('status', 400)
    expect(error).toHaveProperty(
      'message',
      'Completed maintenance records cannot be edited.',
    )
  })
})
