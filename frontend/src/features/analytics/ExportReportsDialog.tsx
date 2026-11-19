import { useEffect, useRef, useState, type FormEvent } from 'react'
import { buttonClassNames } from '../../components/ui/buttonStyles'
import { AnalyticsRequestError, fetchAnalyticsExport } from './api'
import type { ExportScope, Filters, Options, Report } from './api'

interface Props {
  currentReport: Report
  choices: readonly { id: Report; label: string }[]
  filters: Filters
  options: Options | null
  onClose: () => void
  onDownloaded: () => void
}

export default function ExportReportsDialog({ currentReport, choices, filters, options, onClose, onDownloaded }: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const requestRef = useRef<AbortController | null>(null)
  const pressedOutside = useRef(false)
  const [selected, setSelected] = useState<Report[]>([currentReport])
  const [scope, setScope] = useState<ExportScope>('current')
  const [pending, setPending] = useState(false)
  const [error, setError] = useState('')
  const category = options?.categories.find(item => String(item.category_id) === filters.category_id)?.name
  const equipmentType = options?.equipment_types.find(item => String(item.type_id) === filters.equipment_type_id)?.name

  useEffect(() => {
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null
    dialogRef.current?.showModal()
    return () => {
      requestRef.current?.abort()
      previousFocus?.focus()
    }
  }, [])

  const close = () => {
    requestRef.current?.abort()
    onClose()
  }
  const isOutside = (event: { clientX: number; clientY: number }, dialog: HTMLDialogElement) => {
    const bounds = dialog.getBoundingClientRect()
    return event.clientX < bounds.left || event.clientX > bounds.right
      || event.clientY < bounds.top || event.clientY > bounds.bottom
  }
  const download = async (event: FormEvent) => {
    event.preventDefault()
    if (!selected.length || requestRef.current) return
    const controller = new AbortController()
    requestRef.current = controller
    setPending(true)
    setError('')
    try {
      const reports = choices.filter(choice => selected.includes(choice.id)).map(choice => choice.id)
      const blob = await fetchAnalyticsExport(reports, scope, filters, controller.signal)
      if (controller.signal.aborted) return
      const objectUrl = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = objectUrl
      link.download = 'ems-analytics.xlsx'
      document.body.append(link)
      try {
        link.click()
      } finally {
        link.remove()
        window.setTimeout(() => URL.revokeObjectURL(objectUrl), 0)
      }
      onDownloaded()
    } catch (reason: unknown) {
      if (!controller.signal.aborted) setError(reason instanceof AnalyticsRequestError
        ? reason.message : 'Could not export reports. Please try again.')
    } finally {
      if (!controller.signal.aborted) {
        requestRef.current = null
        setPending(false)
      }
    }
  }

  return (
    <dialog ref={dialogRef} aria-labelledby="export-title" aria-describedby="export-description"
      className="m-auto max-h-[calc(100dvh-40px)] w-[min(550px,calc(100vw-32px))] overflow-y-auto rounded-[13px] border border-line bg-white p-6 shadow-xl backdrop:bg-sidebar/50"
      onPointerDown={event => {
        pressedOutside.current = event.target === event.currentTarget && isOutside(event, event.currentTarget)
      }}
      onClick={event => {
        const startedOutside = pressedOutside.current
        pressedOutside.current = false
        if (startedOutside && event.target === event.currentTarget && isOutside(event, event.currentTarget)) close()
      }}
      onCancel={event => { event.preventDefault(); close() }} onClose={close}>
      <h2 id="export-title" className="text-lg font-semibold text-heading">Export reports</h2>
      <p id="export-description" className="mt-1 text-xs text-muted">Download one Excel workbook with a worksheet for each selected report, plus filters and summary metrics.</p>
      <form onSubmit={event => { void download(event) }} className="mt-5 grid gap-5" aria-busy={pending}>
        <fieldset disabled={pending} className="grid gap-3 text-sm text-body">
          <legend className="mb-3 text-xs font-semibold text-heading">Reports</legend>
          <label className="flex items-center gap-2 border-b border-divider pb-3 font-semibold">
            <input type="checkbox" checked={selected.length === choices.length}
              ref={element => { if (element) element.indeterminate = selected.length > 0 && selected.length < choices.length }}
              onChange={event => setSelected(event.target.checked ? choices.map(choice => choice.id) : [])} />
            Select all reports
          </label>
          {choices.map(choice => <label key={choice.id} className="flex items-center gap-2">
            <input type="checkbox" checked={selected.includes(choice.id)} onChange={event => setSelected(
              event.target.checked ? [...selected, choice.id] : selected.filter(id => id !== choice.id),
            )} />{choice.label}
          </label>)}
        </fieldset>
        <fieldset disabled={pending} className="grid gap-3 text-sm text-body">
          <legend className="mb-3 text-xs font-semibold text-heading">Export scope</legend>
          <label className="flex items-center gap-2"><input type="radio" name="export-scope" value="current" checked={scope === 'current'} onChange={() => setScope('current')} />Current applied filters</label>
          <label className="flex items-center gap-2"><input type="radio" name="export-scope" value="all" checked={scope === 'all'} onChange={() => setScope('all')} />All data</label>
        </fieldset>
        <div className="rounded-lg bg-page p-3 text-xs text-muted" aria-label="Export filter summary">
          {scope === 'all' ? <p>All categories, all equipment types, and all checkout years.</p> : <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1">
            <dt>Category</dt><dd>{filters.category_id ? category ?? `Unknown category (ID ${filters.category_id})` : 'All categories'}</dd>
            <dt>Equipment type</dt><dd>{filters.equipment_type_id ? equipmentType ?? `Unknown type (ID ${filters.equipment_type_id})` : 'All equipment types'}</dd>
            <dt>Checkout year</dt><dd>{filters.year}</dd>
          </dl>}
          <p className="mt-2">Availability always shows current inventory. Borrower activity contains aggregated counts only.</p>
        </div>
        {error && <p role="alert" className="text-sm text-danger">{error}</p>}
        {pending && <p role="status" className="text-sm text-primary">Preparing your workbook…</p>}
        <div className="flex flex-wrap justify-end gap-3 border-t border-divider pt-4">
          <button type="button" className={buttonClassNames.secondary} onClick={close}>Cancel</button>
          <button type="submit" className={buttonClassNames.primary} disabled={!selected.length || pending}>
            {pending ? 'Preparing…' : 'Download Excel'}
          </button>
        </div>
      </form>
    </dialog>
  )
}
