import { useEffect, useRef, useState } from 'react'
import Panel from '../../../components/ui/Panel'
import { buttonClassNames } from '../../../components/ui/buttonStyles'
import { ExportRequestError, fetchRecordsExport, type ExportRecord } from '../api'

const exportChoices: readonly { id: ExportRecord; title: string; description: string; filePrefix: string }[] = [
  {
    id: 'inventory',
    title: 'Inventory',
    description: 'Active assets with Asset ID, name, category, equipment type, acquisition date, and status.',
    filePrefix: 'ems-inventory',
  },
  {
    id: 'lending',
    title: 'Lending Records',
    description: 'All active, overdue, and completed loans with equipment, borrower, dates, and return condition.',
    filePrefix: 'ems-lending-records',
  },
]

function localDate(): string {
  const today = new Date()
  const month = String(today.getMonth() + 1).padStart(2, '0')
  const day = String(today.getDate()).padStart(2, '0')
  return `${today.getFullYear()}-${month}-${day}`
}

function saveFile(blob: Blob, filename: string) {
  const objectUrl = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = objectUrl
  link.download = filename
  document.body.append(link)
  try {
    link.click()
  } finally {
    link.remove()
    window.setTimeout(() => URL.revokeObjectURL(objectUrl), 0)
  }
}

type ExportState = { status: 'idle' | 'pending' | 'done' } | { status: 'error'; message: string }

function ExportCard({ choice }: { choice: typeof exportChoices[number] }) {
  const requestRef = useRef<AbortController | null>(null)
  const [state, setState] = useState<ExportState>({ status: 'idle' })
  const headingId = `export-${choice.id}-title`

  useEffect(() => () => requestRef.current?.abort(), [])

  const download = async () => {
    if (requestRef.current) return
    const controller = new AbortController()
    requestRef.current = controller
    setState({ status: 'pending' })
    try {
      const blob = await fetchRecordsExport(choice.id, controller.signal)
      if (controller.signal.aborted) return
      saveFile(blob, `${choice.filePrefix}-${localDate()}.xlsx`)
      setState({ status: 'done' })
    } catch (reason: unknown) {
      if (controller.signal.aborted) return
      setState({
        status: 'error',
        message: reason instanceof ExportRequestError ? reason.message : 'Could not export records. Please try again.',
      })
    } finally {
      if (!controller.signal.aborted) requestRef.current = null
    }
  }

  const pending = state.status === 'pending'
  return (
    <article aria-labelledby={headingId} aria-busy={pending}
      className="flex flex-col gap-4 rounded-[9px] border border-line p-4">
      <div>
        <h2 id={headingId} className="m-0 text-[13px] font-semibold text-body">{choice.title}</h2>
        <p className="mt-1 mb-0 text-[11px] text-subtle">{choice.description}</p>
      </div>
      <div className="mt-auto flex flex-wrap items-center justify-between gap-3">
        <div className="min-h-5 text-[11px]">
          {pending && <p role="status" className="m-0 text-primary">Preparing your workbook…</p>}
          {state.status === 'done' && <p role="status" className="m-0 text-success">Excel download started.</p>}
          {state.status === 'error' && <p role="alert" className="m-0 text-danger">{state.message}</p>}
        </div>
        <button type="button" className={buttonClassNames.primary} disabled={pending}
          aria-label={`Export ${choice.title} to Excel`} onClick={() => { void download() }}>
          {pending ? 'Preparing…' : 'Export to Excel'}
        </button>
      </div>
    </article>
  )
}

export default function ExportRecordsPanel() {
  return (
    <Panel label="Export records" className="grid grid-cols-2 gap-[10px] p-[22px] max-[760px]:grid-cols-1">
      {exportChoices.map(choice => <ExportCard key={choice.id} choice={choice} />)}
    </Panel>
  )
}
