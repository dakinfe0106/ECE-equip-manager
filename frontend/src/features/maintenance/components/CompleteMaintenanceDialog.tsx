import { useEffect, useRef, useState, type FormEvent } from 'react'
import {
  completeMaintenanceRecord,
  describeMaintenanceError,
  maintenanceTypeLabels,
  type MaintenanceRecord,
} from '../api'

interface CompleteMaintenanceDialogProps {
  record: MaintenanceRecord
  onClose: () => void
  onCompleted: () => void
}

export default function CompleteMaintenanceDialog({
  record,
  onClose,
  onCompleted,
}: CompleteMaintenanceDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const [endDate, setEndDate] = useState(() => new Date().toLocaleDateString('en-CA'))
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')

  useEffect(() => {
    const dialog = dialogRef.current
    if (dialog && !dialog.open && typeof dialog.showModal === 'function') {
      dialog.showModal()
    }
    return () => {
      if (dialog?.open) dialog.close()
    }
  }, [])

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setIsSubmitting(true)
    setErrorMessage('')
    try {
      await completeMaintenanceRecord(record.maintenance_id, endDate)
      onCompleted()
    } catch (error) {
      setErrorMessage(
        describeMaintenanceError(error, 'complete the maintenance record'),
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <dialog
      ref={dialogRef}
      className="m-auto max-h-[calc(100dvh-32px)] w-[min(520px,calc(100vw-32px))] overflow-y-auto rounded-[13px] border border-line bg-white p-0 text-body shadow-[0_24px_60px_rgb(15_27_45_/_28%)] backdrop:bg-[rgb(20_33_54_/_45%)]"
      aria-labelledby="complete-maintenance-title"
      onCancel={(event) => {
        event.preventDefault()
        onClose()
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <form onSubmit={submit}>
        <header className="border-b border-divider px-6 py-5">
          <p className="m-0 text-[10px] font-semibold uppercase tracking-[0.08em] text-muted">
            Maintenance record · {record.maintenance_id}
          </p>
          <h2
            className="mb-0 mt-1 text-[19px] font-bold text-heading"
            id="complete-maintenance-title"
          >
            Complete Maintenance
          </h2>
        </header>

        <div className="flex flex-col gap-4 px-6 py-5">
          <p className="m-0 text-[12px] text-body">
            <span className="font-semibold">{record.asset.asset_identifier}</span>
            {' · '}
            {record.asset.name}
            {' · '}
            {maintenanceTypeLabels[record.maintenance_type]}
            {' · started '}
            {record.start_date}
          </p>
          <label className="flex flex-col gap-1.5 text-[11px] font-semibold text-body">
            <span>Completion Date *</span>
            <input
              className="min-h-10 rounded-lg border border-input px-3 text-[12px] font-normal"
              type="date"
              required
              min={record.start_date}
              value={endDate}
              onChange={(event) => setEndDate(event.target.value)}
            />
          </label>
          <p className="m-0 text-[11px] text-muted">
            The equipment will be marked Available and this record will stay in
            the maintenance history.
          </p>
          {errorMessage && (
            <p
              className="m-0 rounded-lg border border-danger/20 bg-danger-soft px-3 py-2 text-[12px] text-danger"
              role="alert"
            >
              {errorMessage}
            </p>
          )}
        </div>

        <footer className="flex flex-wrap items-center justify-end gap-2 border-t border-divider px-6 py-4">
          <button
            className="min-h-9 rounded-lg border border-input bg-white px-4 text-[12px] font-semibold text-body hover:bg-page"
            type="button"
            disabled={isSubmitting}
            onClick={onClose}
          >
            Cancel
          </button>
          <button
            className="min-h-9 rounded-lg bg-primary px-4 text-[12px] font-semibold text-white hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-60"
            type="submit"
            disabled={isSubmitting || !endDate}
          >
            {isSubmitting ? 'Saving…' : 'Complete Maintenance'}
          </button>
        </footer>
      </form>
    </dialog>
  )
}
