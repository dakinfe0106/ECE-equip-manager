// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import * as api from '../features/importExport/api'
import ImportExportPage from '../pages/ImportExportPage'

let clickedDownloads: string[] = []

beforeEach(() => {
  clickedDownloads = []
  vi.stubGlobal('URL', class extends URL {
    static createObjectURL = vi.fn(() => 'blob:export-test')
    static revokeObjectURL = vi.fn()
  })
  vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) {
    clickedDownloads.push(this.download)
  })
})
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals() })

function renderPage(path = '/import-export') {
  render(<MemoryRouter initialEntries={[path]}><ImportExportPage /></MemoryRouter>)
}

describe('Import & Export page', () => {
  it('opens on Import Records and explains that import is not available yet', () => {
    renderPage()

    expect(screen.getByRole('button', { name: 'Import Records' }).getAttribute('aria-pressed')).toBe('true')
    expect(screen.getByText('Spreadsheet import is not available yet')).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Export Inventory to Excel' })).toBeNull()
  })

  it('switches to Export Records and lists the two available exports', () => {
    renderPage()

    fireEvent.click(screen.getByRole('button', { name: 'Export Records' }))

    expect(screen.getByRole('button', { name: 'Export Records' }).getAttribute('aria-pressed')).toBe('true')
    expect(screen.getByRole('heading', { name: 'Inventory' })).toBeTruthy()
    expect(screen.getByRole('heading', { name: 'Lending Records' })).toBeTruthy()
  })

  it('downloads the inventory workbook and blocks duplicate requests while pending', async () => {
    let resolve!: (blob: Blob) => void
    const request = vi.spyOn(api, 'fetchRecordsExport').mockReturnValue(new Promise(done => { resolve = done }))
    renderPage('/import-export?tab=export')
    const button = screen.getByRole('button', { name: 'Export Inventory to Excel' })

    fireEvent.click(button)
    fireEvent.click(button)

    expect(request).toHaveBeenCalledTimes(1)
    expect(request).toHaveBeenCalledWith('inventory', expect.any(AbortSignal))
    expect(screen.getByRole('status').textContent).toBe('Preparing your workbook…')
    expect((button as HTMLButtonElement).disabled).toBe(true)

    resolve(new Blob(['workbook']))

    await waitFor(() => expect(screen.getByRole('status').textContent).toBe('Excel download started.'))
    expect(clickedDownloads).toHaveLength(1)
    expect(clickedDownloads[0]).toMatch(/^ems-inventory-\d{4}-\d{2}-\d{2}\.xlsx$/)
    expect((button as HTMLButtonElement).disabled).toBe(false)
  })

  it('shows the permission error for a failed lending export', async () => {
    vi.spyOn(api, 'fetchRecordsExport').mockRejectedValue(new api.ExportRequestError(403))
    renderPage('/import-export?tab=export')

    fireEvent.click(screen.getByRole('button', { name: 'Export Lending Records to Excel' }))

    expect((await screen.findByRole('alert')).textContent).toBe('Sign in or ask for access to export records.')
    expect(clickedDownloads).toHaveLength(0)
  })
})
