import { apiBaseUrl } from '../../api'
import { sessionFetch } from '../auth/sessionFetch'

export type ExportRecord = 'inventory' | 'lending'

const exportPaths: Record<ExportRecord, string> = {
  inventory: 'assets/export/',
  lending: 'loans/export/',
}

export class ExportRequestError extends Error {
  readonly status: number

  constructor(status: number) {
    super(status === 403
      ? 'Sign in or ask for access to export records.'
      : 'Could not export records. Please try again.')
    this.name = 'ExportRequestError'
    this.status = status
  }
}

export async function fetchRecordsExport(record: ExportRecord, signal?: AbortSignal): Promise<Blob> {
  const response = await sessionFetch(`${apiBaseUrl}/${exportPaths[record]}`, {
    credentials: 'include', signal,
  })
  if (!response.ok) throw new ExportRequestError(response.status)
  return response.blob()
}
