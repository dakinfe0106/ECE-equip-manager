// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'
import { apiBaseUrl } from '../api'
import type { MaintenanceRecord } from '../features/maintenance/api'
import CompleteMaintenanceDialog from '../features/maintenance/components/CompleteMaintenanceDialog'
import MaintenanceRecordDialog from '../features/maintenance/components/MaintenanceRecordDialog'

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
  it('limits the date to between the start date and today', () => {
    renderDialog()

    const today = new Date().toLocaleDateString('en-CA')
    const dateInput = screen.getByLabelText(/Completion Date/)
    expect(dateInput.getAttribute('min')).toBe('2026-11-01')
    expect(dateInput.getAttribute('max')).toBe(today)
    expect(dateInput).toHaveProperty('value', today)
  })

  it('shows the asset, type and technician as read-only details', () => {
    renderDialog()

    expect(screen.getByText('SHOP-005 · Oscilloscope')).toBeTruthy()
    expect(screen.getByText('Repair')).toBeTruthy()
    expect(screen.getByText('Shop Technician')).toBeTruthy()
  })

  it('needs an outcome before the completion can be confirmed', async () => {
    renderDialog()
    const confirm = screen.getByRole('button', { name: 'Confirm Completion' })

    expect(confirm).toHaveProperty('disabled', true)
    await userEvent.click(screen.getByLabelText(/Return to Service/))

    expect(confirm).toHaveProperty('disabled', false)
  })

  it('sends the chosen date and outcome and reports completion', async () => {
    const { onCompleted } = renderDialog()

    fireEvent.change(screen.getByLabelText(/Completion Date/), {
      target: { value: '2026-11-05' },
    })
    await userEvent.click(screen.getByLabelText(/Return to Service/))
    await userEvent.click(screen.getByRole('button', { name: 'Confirm Completion' }))

    await waitFor(() =>
      expect(onCompleted).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'Completed' }),
        'Available',
      ),
    )
    expect(sentBody).toEqual({ end_date: '2026-11-05', outcome: 'Available' })
  })

  it('retires the asset after the user confirms the warning', async () => {
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(true)
    const { onCompleted } = renderDialog()

    await userEvent.click(screen.getByLabelText(/Retire Asset/))
    await userEvent.click(screen.getByRole('button', { name: 'Confirm Completion' }))

    await waitFor(() =>
      expect(onCompleted).toHaveBeenCalledWith(expect.anything(), 'Retired'),
    )
    expect(confirm).toHaveBeenCalledWith(expect.stringContaining('Retire this asset?'))
    expect(sentBody).toMatchObject({ outcome: 'Retired' })
  })

  it('sends nothing when the retire warning is declined', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(false)
    const { onCompleted } = renderDialog()

    await userEvent.click(screen.getByLabelText(/Retire Asset/))
    await userEvent.click(screen.getByRole('button', { name: 'Confirm Completion' }))

    expect(sentBody).toBeUndefined()
    expect(onCompleted).not.toHaveBeenCalled()
  })

  it('shows the server error and stays open when completion is rejected', async () => {
    completeResponse = () =>
      HttpResponse.json(
        { end_date: 'This maintenance record has already been completed.' },
        { status: 400 },
      )
    const { onCompleted } = renderDialog()

    await userEvent.click(screen.getByLabelText(/Return to Service/))
    await userEvent.click(screen.getByRole('button', { name: 'Confirm Completion' }))

    const alert = await screen.findByRole('alert')
    expect(alert.textContent).toContain('Unable to complete maintenance')
    expect(alert.textContent).toContain(
      'This maintenance record has already been completed.',
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

describe('MaintenanceRecordDialog complete action', () => {
  it('offers Complete Maintenance for an in-progress record', async () => {
    const onComplete = vi.fn()
    render(
      <MaintenanceRecordDialog
        mode="details"
        record={record}
        onClose={() => {}}
        onCreated={() => {}}
        onComplete={onComplete}
      />,
    )

    await userEvent.click(screen.getByRole('button', { name: 'Complete Maintenance' }))

    expect(onComplete).toHaveBeenCalledTimes(1)
  })

  it('does not offer it for a completed record or without permission', () => {
    const completed = { ...record, status: 'Completed' as const, end_date: '2026-11-05' }
    const { rerender } = render(
      <MaintenanceRecordDialog
        mode="details"
        record={completed}
        onClose={() => {}}
        onCreated={() => {}}
        onComplete={() => {}}
      />,
    )
    expect(screen.queryByRole('button', { name: 'Complete Maintenance' })).toBeNull()

    rerender(
      <MaintenanceRecordDialog
        mode="details"
        record={record}
        onClose={() => {}}
        onCreated={() => {}}
      />,
    )
    expect(screen.queryByRole('button', { name: 'Complete Maintenance' })).toBeNull()
  })
})
