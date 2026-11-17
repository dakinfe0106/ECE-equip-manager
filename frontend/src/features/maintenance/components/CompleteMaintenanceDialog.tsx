import { useEffect, useRef, useState, type FormEvent } from 'react'
import {
  completeMaintenanceRecord,
  describeMaintenanceError,
  maintenanceTypeLabels,
  technicianName,
  type MaintenanceOutcome,
  type MaintenanceRecord,
} from '../api'

interface CompleteMaintenanceDialogProps {
  record: MaintenanceRecord
  onClose: () => void
  onCompleted: (completed: MaintenanceRecord, outcome: MaintenanceOutcome) => void
}

const outcomeOptions: {
  value: MaintenanceOutcome
  label: string
  description: string
}[] = [
  {
    value: 'Available',
    label: 'Return to Service',
    description: 'Maintenance was successful, and the equipment is ready for use.',
  },
  {
    value: 'Retired',
    label: 'Retire Asset',
    description: 'Equipment is no longer suitable for use and cannot be checked out.',
  },
]

export default function CompleteMaintenanceDialog({
  record,
  onClose,
  onCompleted,
}: CompleteMaintenanceDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const today = new Date().toLocaleDateString('en-CA')
  const [endDate, setEndDate] = useState(today)
  const [outcome, setOutcome] = useState<MaintenanceOutcome | ''>('')
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
    if (!outcome) {
      setErrorMessage('Select a maintenance outcome before confirming completion.')
      return
    }
    if (
      outcome === 'Retired'
      && !window.confirm(
        'Retire this asset? It will no longer be available for lending, but all historical records will be preserved.',
      )
    ) {
      return
    }

    setIsSubmitting(true)
    setErrorMessage('')
    try {
      const completed = await completeMaintenanceRecord(
        record.maintenance_id,
        endDate,
        outcome,
      )
      onCompleted(completed, outcome)
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
      className="m-auto max-h-[calc(100dvh-32px)] w-[min(560px,calc(100vw-32px))] overflow-y-auto rounded-[13px] border border-line bg-white p-0 text-body shadow-[0_24px_60px_rgb(15_27_45_/_28%)] backdrop:bg-[rgb(20_33_54_/_45%)]"
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
            Complete maintenance · {record.maintenance_id}
          </p>
          <h2
            className="mb-0 mt-1 text-[19px] font-bold text-heading"
            id="complete-maintenance-title"
          >
            {record.asset.name}
          </h2>
        </header>

        <div className="grid grid-cols-2 gap-4 px-6 py-5 max-[600px]:grid-cols-1">
          <div className="col-span-full">
            <ReadOnlyField
              label="Asset"
              value={`${record.asset.asset_identifier} · ${record.asset.name}`}
            />
          </div>
          <ReadOnlyField
            label="Maintenance Type"
            value={maintenanceTypeLabels[record.maintenance_type]}
          />
          <ReadOnlyField
            label="Responsible Technician"
            value={technicianName(record.technician)}
          />
          <label className="col-span-full flex flex-col gap-1.5 text-[11px] font-semibold text-body">
            <span>Completion Date *</span>
            <input
              className="min-h-10 rounded-lg border border-input px-3 text-[12px] font-normal"
              type="date"
              required
              min={record.start_date}
              max={today}
              value={endDate}
              onChange={(event) => {
                setEndDate(event.target.value)
                setErrorMessage('')
              }}
            />
          </label>
          <fieldset className="col-span-full m-0 flex flex-col gap-2 border-0 p-0">
            <legend className="mb-1.5 p-0 text-[11px] font-semibold text-body">
              Maintenance Outcome *
            </legend>
            {outcomeOptions.map((option) => (
              <label
                key={option.value}
                className="flex cursor-pointer items-start gap-2.5 rounded-lg border border-input px-3 py-2.5 text-[11px] has-[:checked]:border-primary has-[:checked]:bg-primary-soft"
              >
                <input
                  className="mt-0.5"
                  type="radio"
                  name="maintenance-outcome"
                  value={option.value}
                  checked={outcome === option.value}
                  onChange={() => {
                    setOutcome(option.value)
                    setErrorMessage('')
                  }}
                />
                <span className="flex flex-col gap-0.5">
                  <strong className="text-heading">{option.label}</strong>
                  <span className="text-muted">{option.description}</span>
                </span>
              </label>
            ))}
          </fieldset>
          {errorMessage && (
            <div
              className="col-span-full flex flex-col gap-0.5 rounded-lg border border-danger/20 bg-danger-soft px-3 py-2 text-[12px] text-danger"
              role="alert"
            >
              <strong>Unable to complete maintenance</strong>
              <span>{errorMessage}</span>
            </div>
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
            disabled={isSubmitting || !endDate || !outcome}
          >
            {isSubmitting ? 'Saving…' : 'Confirm Completion'}
          </button>
        </footer>
      </form>
    </dialog>
  )
}

function ReadOnlyField({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex min-w-0 flex-col gap-1.5 text-[11px]">
      <span className="font-semibold text-muted">{label}</span>
      <span className="break-words text-body">{value}</span>
    </div>
  )
}
