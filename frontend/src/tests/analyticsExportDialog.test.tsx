// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import ExportReportsDialog from '../features/analytics/ExportReportsDialog'
import * as api from '../features/analytics/api'

const choices = [
  { id: 'availability', label: 'Equipment Availability' },
  { id: 'utilization', label: 'Equipment Utilization' },
  { id: 'borrowing', label: 'Borrowing Activity' },
  { id: 'borrowers', label: 'Borrower Activity' },
] as const
const filters: api.Filters = { category_id: '1', equipment_type_id: '2', year: '2025' }
const options: api.Options = {
  categories: [{ category_id: 1, name: 'Meters', is_deleted: false }],
  equipment_types: [{ type_id: 2, category_id: 1, name: 'Digital', is_deleted: false }],
  years: [2025],
}
beforeEach(() => {
  HTMLDialogElement.prototype.showModal = function () { this.setAttribute('open', '') }
  vi.stubGlobal('URL', class extends URL {
    static createObjectURL = vi.fn(() => 'blob:analytics-test')
    static revokeObjectURL = vi.fn()
  })
  vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})
})
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals() })
function dialog() {
  const onClose = vi.fn()
  const onDownloaded = vi.fn()
  render(<ExportReportsDialog currentReport="utilization" choices={choices} filters={filters}
    options={options} onClose={onClose} onDownloaded={onDownloaded} />)
  return { onClose, onDownloaded }
}

function backdropClick() {
  const element = screen.getByRole('dialog')
  vi.spyOn(element, 'getBoundingClientRect').mockReturnValue(new DOMRect(100, 100, 550, 600))
  fireEvent(element, new MouseEvent('pointerdown', { bubbles: true, clientX: 20, clientY: 20 }))
  fireEvent.click(element, { clientX: 20, clientY: 20 })
}

describe('Export reports dialog', () => {
  it('preselects the current tab and applied filters, and requires a report', () => {
    dialog()
    expect((screen.getByLabelText('Equipment Utilization') as HTMLInputElement).checked).toBe(true)
    expect((screen.getByLabelText('Current applied filters') as HTMLInputElement).checked).toBe(true)
    expect(screen.getByText('Meters')).toBeTruthy()
    expect(screen.getByText('Digital')).toBeTruthy()
    expect(screen.getByText('2025')).toBeTruthy()
    fireEvent.click(screen.getByLabelText('Equipment Utilization'))
    expect((screen.getByRole('button', { name: 'Download Excel' }) as HTMLButtonElement).disabled).toBe(true)
    fireEvent.click(screen.getByLabelText('Select all reports'))
    choices.forEach(choice => expect((screen.getByLabelText(choice.label) as HTMLInputElement).checked).toBe(true))
    fireEvent.click(screen.getByLabelText('Select all reports'))
    choices.forEach(choice => expect((screen.getByLabelText(choice.label) as HTMLInputElement).checked).toBe(false))
  })

  it('downloads a single workbook for the selected reports and all-data scope', async () => {
    const fetchExport = vi.spyOn(api, 'fetchAnalyticsExport').mockResolvedValue(new Blob(['workbook']))
    const { onDownloaded } = dialog()
    fireEvent.click(screen.getByLabelText('Select all reports'))
    fireEvent.click(screen.getByLabelText('All data'))
    expect(screen.getByText('All categories, all equipment types, and all checkout years.')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Download Excel' }))
    await waitFor(() => expect(onDownloaded).toHaveBeenCalledOnce())
    expect(fetchExport).toHaveBeenCalledWith(['availability', 'utilization', 'borrowing', 'borrowers'], 'all', filters, expect.any(AbortSignal))
    expect(HTMLAnchorElement.prototype.click).toHaveBeenCalledOnce()
    await waitFor(() => expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:analytics-test'))
  })

  it.each(['Cancel', 'backdrop'])('prevents duplicate submission and cancels pending downloads via %s', async dismiss => {
    let finish: (value: Blob) => void = () => {}
    const fetchExport = vi.spyOn(api, 'fetchAnalyticsExport').mockImplementation(() => new Promise(resolve => { finish = resolve }))
    const { onClose, onDownloaded } = dialog()
    const form = screen.getByRole('button', { name: 'Download Excel' }).closest('form')!
    fireEvent.submit(form)
    fireEvent.submit(form)
    expect(screen.getByRole('status').textContent).toContain('Preparing your workbook')
    expect(fetchExport).toHaveBeenCalledOnce()
    const signal = fetchExport.mock.calls[0][3]!
    if (dismiss === 'backdrop') backdropClick()
    else fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(signal.aborted).toBe(true)
    expect(onClose).toHaveBeenCalledOnce()
    await act(async () => { finish(new Blob(['cancelled workbook'])) })
    expect(onDownloaded).not.toHaveBeenCalled()
    expect(URL.createObjectURL).not.toHaveBeenCalled()
  })

  it('closes on a backdrop click without requesting a workbook', () => {
    const fetchExport = vi.spyOn(api, 'fetchAnalyticsExport')
    const { onClose } = dialog()
    backdropClick()
    expect(onClose).toHaveBeenCalledOnce()
    expect(fetchExport).not.toHaveBeenCalled()
  })

  it('keeps the dialog open for controls, padding, and a drag starting inside', () => {
    const { onClose } = dialog()
    const element = screen.getByRole('dialog')
    vi.spyOn(element, 'getBoundingClientRect').mockReturnValue(new DOMRect(100, 100, 550, 600))
    fireEvent.click(screen.getByLabelText('Equipment Availability'))
    expect((screen.getByLabelText('Equipment Availability') as HTMLInputElement).checked).toBe(true)
    fireEvent(element, new MouseEvent('pointerdown', { bubbles: true, clientX: 110, clientY: 110 }))
    fireEvent.click(element, { clientX: 110, clientY: 110 })
    fireEvent(element, new MouseEvent('pointerdown', { bubbles: true, clientX: 200, clientY: 200 }))
    fireEvent.click(element, { clientX: 20, clientY: 20 })
    expect(onClose).not.toHaveBeenCalled()
  })

  it('keeps selections after errors and allows retry', async () => {
    vi.spyOn(api, 'fetchAnalyticsExport').mockRejectedValueOnce(new api.AnalyticsRequestError(500, 'Could not export reports. Please try again.'))
      .mockResolvedValue(new Blob(['workbook']))
    const { onDownloaded } = dialog()
    fireEvent.click(screen.getByRole('button', { name: 'Download Excel' }))
    expect((await screen.findByRole('alert')).textContent).toContain('Could not export reports')
    expect((screen.getByLabelText('Equipment Utilization') as HTMLInputElement).checked).toBe(true)
    fireEvent.click(screen.getByRole('button', { name: 'Download Excel' }))
    await waitFor(() => expect(onDownloaded).toHaveBeenCalledOnce())
    await waitFor(() => expect(URL.revokeObjectURL).toHaveBeenCalledOnce())
  })

  it('supports Escape cancellation without requesting a workbook', () => {
    const fetchExport = vi.spyOn(api, 'fetchAnalyticsExport')
    const { onClose } = dialog()
    fireEvent(screen.getByRole('dialog'), new Event('cancel', { cancelable: true }))
    expect(onClose).toHaveBeenCalledOnce()
    expect(fetchExport).not.toHaveBeenCalled()
  })
})
