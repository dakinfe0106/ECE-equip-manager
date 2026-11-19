// @vitest-environment jsdom
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'
import { apiBaseUrl } from '../api'
import type { MaintenanceRecord } from '../features/maintenance/api'
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
const completed: MaintenanceRecord = {
  ...record,
  end_date: '2026-11-05',
  status: 'Completed',
}
const labTech = { id: 3, username: 'lab-tech', first_name: 'Lab', last_name: 'Tech' }

let sentBody: unknown
let patchResponse = () => HttpResponse.json(record)

const server = setupServer(
  http.get(`${apiBaseUrl}/auth/csrf/`, () =>
    HttpResponse.json({ csrfToken: 'test-csrf-token' }),
  ),
  http.get(`${apiBaseUrl}/maintenance-records/technicians/`, () =>
    HttpResponse.json([record.technician, labTech]),
  ),
  http.patch(`${apiBaseUrl}/maintenance-records/17/`, async ({ request }) => {
    sentBody = await request.json()
    return patchResponse()
  }),
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
  patchResponse = () => HttpResponse.json(record)
  vi.restoreAllMocks()
})
afterAll(() => server.close())

function renderDetails(shown: MaintenanceRecord, canEdit = true) {
  const onUpdated = vi.fn()
  render(
    <MaintenanceRecordDialog
      mode="details"
      record={shown}
      canEdit={canEdit}
      onClose={() => {}}
      onCreated={() => {}}
      onUpdated={onUpdated}
    />,
  )
  return { onUpdated }
}

describe('Editing a maintenance record', () => {
  it('shows the editable fields with the current values', async () => {
    renderDetails(record)

    expect(screen.getByLabelText(/Maintenance Type/)).toHaveProperty('value', 'Repair')
    expect(screen.getByLabelText(/Priority/)).toHaveProperty('value', 'High')
    await waitFor(() =>
      expect(screen.getByLabelText(/Responsible Technician/)).toHaveProperty(
        'disabled',
        false,
      ),
    )
    expect(screen.getByLabelText(/Responsible Technician/)).toHaveProperty('value', '2')
    expect(screen.getByText('SHOP-005')).toBeTruthy()
  })

  it('keeps Save Changes disabled until something changes', async () => {
    renderDetails(record)
    const save = screen.getByRole('button', { name: 'Save Changes' })

    expect(save).toHaveProperty('disabled', true)
    await userEvent.selectOptions(screen.getByLabelText(/Priority/), 'Low')

    expect(save).toHaveProperty('disabled', false)
    await userEvent.selectOptions(screen.getByLabelText(/Priority/), 'High')
    expect(save).toHaveProperty('disabled', true)
  })

  it('sends only the fields that changed and reports the update', async () => {
    patchResponse = () =>
      HttpResponse.json({ ...record, maintenance_type: 'Calibration', technician: labTech })
    const { onUpdated } = renderDetails(record)

    await waitFor(() =>
      expect(screen.getByLabelText(/Responsible Technician/)).toHaveProperty(
        'disabled',
        false,
      ),
    )
    await userEvent.selectOptions(screen.getByLabelText(/Maintenance Type/), 'Calibration')
    await userEvent.selectOptions(screen.getByLabelText(/Responsible Technician/), '3')
    await userEvent.click(screen.getByRole('button', { name: 'Save Changes' }))

    await waitFor(() =>
      expect(onUpdated).toHaveBeenCalledWith(
        expect.objectContaining({ maintenance_type: 'Calibration', technician: labTech }),
      ),
    )
    expect(sentBody).toEqual({ maintenance_type: 'Calibration', technician_id: 3 })
  })

  it('stays open after saving and confirms the update until the next edit', async () => {
    patchResponse = () => HttpResponse.json({ ...record, priority: 'Urgent' })
    renderDetails(record)

    expect(screen.queryByText(/Maintenance record updated/)).toBeNull()
    await userEvent.selectOptions(screen.getByLabelText(/Priority/), 'Urgent')
    await userEvent.click(screen.getByRole('button', { name: 'Save Changes' }))

    expect((await screen.findByRole('status')).textContent).toContain(
      'Maintenance record updated.',
    )
    expect(screen.getByText('Urgent priority')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Save Changes' })).toHaveProperty(
      'disabled',
      true,
    )

    await userEvent.selectOptions(screen.getByLabelText(/Priority/), 'Low')
    expect(screen.queryByRole('status')).toBeNull()
  })

  it('shows the server error and stays open when the update is rejected', async () => {
    patchResponse = () =>
      HttpResponse.json(
        { maintenance_id: 'Completed maintenance records cannot be edited.' },
        { status: 400 },
      )
    const { onUpdated } = renderDetails(record)

    await userEvent.selectOptions(screen.getByLabelText(/Priority/), 'Urgent')
    await userEvent.click(screen.getByRole('button', { name: 'Save Changes' }))

    expect((await screen.findByRole('alert')).textContent).toBe(
      'Completed maintenance records cannot be edited.',
    )
    expect(onUpdated).not.toHaveBeenCalled()
  })

  it('is read-only for a completed record', () => {
    renderDetails(completed)

    expect(screen.queryByRole('button', { name: 'Save Changes' })).toBeNull()
    expect(screen.queryByLabelText(/Priority/)).toBeNull()
    expect(screen.getByText('2026-11-05')).toBeTruthy()
  })

  it('is read-only when the user cannot change records', () => {
    renderDetails(record, false)

    expect(screen.queryByRole('button', { name: 'Save Changes' })).toBeNull()
    expect(screen.queryByLabelText(/Maintenance Type/)).toBeNull()
  })
})
