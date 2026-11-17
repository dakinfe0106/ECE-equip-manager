// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'
import { apiBaseUrl } from '../api'
import type { MaintenanceRecord } from '../features/maintenance/api'
import CompleteMaintenanceDialog from '../features/maintenance/components/CompleteMaintenanceDialog'

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

let sentBody: unknown
let completeResponse = () => HttpResponse.json({ ...record, status: 'Completed' })

const server = setupServer(
  http.get(`${apiBaseUrl}/auth/csrf/`, () =>
    HttpResponse.json({ csrfToken: 'test-csrf-token' }),
  ),
  http.post(
    `${apiBaseUrl}/maintenance-records/17/complete/`,
    async ({ request }) => {
      sentBody = await request.json()
      return completeResponse()
    },
  ),
)

beforeAll(() => {
  server.listen({ onUnhandledRequest: 'error' })
  HTMLDialogElement.prototype.showModal = function showModal() {
    this.setAttribute('open', '')
  }
  HTMLDialogElement.prototype.close = function close() {
    this.removeAttribute('open')
  }
})
afterEach(() => {
  cleanup()
  server.resetHandlers()
  sentBody = undefined
  completeResponse = () => HttpResponse.json({ ...record, status: 'Completed' })
  vi.restoreAllMocks()
})
afterAll(() => server.close())

function renderDialog() {
  const onClose = vi.fn()
  const onCompleted = vi.fn()
  render(
    <CompleteMaintenanceDialog
      record={record}
      onClose={onClose}
      onCompleted={onCompleted}
    />,
  )
  return { onClose, onCompleted }
}

describe('CompleteMaintenanceDialog', () => {
  it('shows the record and a date that cannot be before the start date', () => {
    renderDialog()

    expect(screen.getByText('SHOP-005')).toBeTruthy()
    expect(screen.getByText(/Oscilloscope/)).toBeTruthy()
    const dateInput = screen.getByLabelText(/Completion Date/)
    expect(dateInput.getAttribute('min')).toBe('2026-11-01')
    expect(dateInput).toHaveProperty(
      'value',
      new Date().toLocaleDateString('en-CA'),
    )
  })

  it('sends the chosen date and reports completion', async () => {
    const { onCompleted } = renderDialog()

    fireEvent.change(screen.getByLabelText(/Completion Date/), {
      target: { value: '2026-11-05' },
    })
    await userEvent.click(screen.getByRole('button', { name: 'Complete Maintenance' }))

    await waitFor(() => expect(onCompleted).toHaveBeenCalledTimes(1))
    expect(sentBody).toEqual({ end_date: '2026-11-05' })
  })

  it('shows the server error and stays open when completion is rejected', async () => {
    completeResponse = () =>
      HttpResponse.json(
        { end_date: 'This maintenance record is already completed.' },
        { status: 400 },
      )
    const { onCompleted } = renderDialog()

    await userEvent.click(screen.getByRole('button', { name: 'Complete Maintenance' }))

    expect((await screen.findByRole('alert')).textContent).toBe(
      'This maintenance record is already completed.',
    )
    expect(onCompleted).not.toHaveBeenCalled()
  })

  it('closes without sending anything when cancelled', async () => {
    const { onClose, onCompleted } = renderDialog()

    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }))

    expect(onClose).toHaveBeenCalledTimes(1)
    expect(onCompleted).not.toHaveBeenCalled()
    expect(sentBody).toBeUndefined()
  })
})
