import { useMemo, useRef, useState, type FormEvent } from 'react'
import useModalAccessibility from '../hooks/useModalAccessibility'
import type {
  BorrowerIdentity,
  DamageFlagCreateInput,
  DamageFlagEquipmentOption,
} from '../types'

interface RecordDamageFlagModalProps {
  borrower: BorrowerIdentity
  equipmentOptions: DamageFlagEquipmentOption[]
  onCancel: () => void
  onSave: (payload: DamageFlagCreateInput) => void | Promise<unknown>
  restoreFocusOnUnmount?: boolean
}

const emptyErrors = {
  equipment: '',
  date: '',
  reason: '',
  review: '',
}

export default function RecordDamageFlagModal({
  borrower,
  equipmentOptions,
  onCancel,
  onSave,
  restoreFocusOnUnmount = true,
}: RecordDamageFlagModalProps) {
  const dialogRef = useRef<HTMLDivElement | null>(null)
  const savingRef = useRef(false)
  const [equipmentId, setEquipmentId] = useState<number | ''>('')
  const [incidentDate, setIncidentDate] = useState('')
  const [reason, setReason] = useState('')
  const [notes, setNotes] = useState('')
  const [reviewed, setReviewed] = useState(false)
  const [errors, setErrors] = useState(emptyErrors)
  const [isSaving, setIsSaving] = useState(false)
  const [isSaved, setIsSaved] = useState(false)
  const [saveError, setSaveError] = useState('')

  useModalAccessibility(dialogRef, () => {
    if (!savingRef.current) onCancel()
  }, restoreFocusOnUnmount)

  const selectedEquipment = useMemo(
    () => equipmentOptions.find((equipment) => equipment.id === equipmentId),
    [equipmentId, equipmentOptions],
  )

  const validate = () => {
    const nextErrors = { ...emptyErrors }

    if (!equipmentId) nextErrors.equipment = 'Equipment is required.'
    if (!incidentDate) nextErrors.date = 'Incident date is required.'
    if (!reason.trim()) nextErrors.reason = 'Reason is required.'
    if (!reviewed) nextErrors.review = 'Negligence review confirmation is required.'

    setErrors(nextErrors)
    return !nextErrors.equipment && !nextErrors.date && !nextErrors.reason && !nextErrors.review
  }

  const handleSave = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (isSaved || savingRef.current) return
    if (!validate()) return

    savingRef.current = true
    setIsSaving(true)
    setSaveError('')
    try {
      await onSave({
        borrower_id: borrower.borrower_id,
        borrower_name: borrower.borrower_name,
        equipment_id: Number(equipmentId),
        equipment_name: selectedEquipment?.name,
        incident_date: incidentDate,
        reason,
        notes,
        reviewed,
      })
      setIsSaved(true)
    } catch (error: unknown) {
      setSaveError(error instanceof Error ? error.message : 'Could not save the damage flag.')
    } finally {
      savingRef.current = false
      setIsSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-sidebar/50 p-4">
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="record-damage-flag-title"
        tabIndex={-1}
        className="flex max-h-[min(780px,calc(100dvh-40px))] w-[min(520px,calc(100vw-32px))] flex-col overflow-hidden rounded-[13px] border border-line bg-white shadow-[0_24px_70px_rgb(10_20_35_/_25%)]"
      >
        <div className="flex shrink-0 items-start justify-between gap-3 border-b border-line px-[22px] py-5">
          <div>
            <p className="mb-[7px] text-[11px] font-[750] uppercase tracking-[0.11em] text-primary">
              BORROWER RESTRICTION
            </p>
            <h2 id="record-damage-flag-title" className="m-0 text-[14px] font-[650] tracking-[-0.01em] text-heading">
              Record damage flag
            </h2>
          </div>
          <button
            type="button"
            aria-label="Close record damage flag"
            disabled={isSaving}
            onClick={onCancel}
            className="grid place-items-center rounded-lg border-0 bg-transparent p-[7px] text-[18px] leading-none text-muted hover:bg-page focus-visible:outline-2 focus-visible:outline-primary focus-visible:outline-offset-[3px]"
          >
            ×
          </button>
        </div>

        <form className="flex min-h-0 flex-1 flex-col overflow-hidden" onSubmit={handleSave} aria-busy={isSaving}>
          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-[22px] py-[21px]">
            <div>
              <p className="text-[11px] font-semibold text-body">Borrower</p>
              <p className="mt-1 text-[11px] text-muted">{borrower.borrower_name}</p>
            </div>

            <div>
              <label htmlFor="damage-flag-equipment" className="mb-1 block text-[9px] font-[650] uppercase tracking-[0.25px] text-muted">
                Equipment
              </label>
              <select
                aria-label="Equipment"
                id="damage-flag-equipment"
                className="w-full rounded-[5px] border border-input bg-white px-[9px] py-2 text-[11px] text-body focus-visible:outline-2 focus-visible:outline-primary focus-visible:outline-offset-[2px]"
                value={equipmentId}
                onChange={(event) => {
                  setEquipmentId(event.target.value ? Number(event.target.value) : '')
                  setErrors((current) => ({ ...current, equipment: '' }))
                }}
              >
                <option value="">Select equipment</option>
                {equipmentOptions.map((equipment) => (
                  <option key={equipment.id} value={equipment.id}>
                    {equipment.name}
                  </option>
                ))}
              </select>
              {errors.equipment && <p className="mt-1 text-[10px] text-danger">{errors.equipment}</p>}
            </div>

            <div>
              <label
                htmlFor="incident-date"
                className="mb-1 block text-[9px] font-[650] uppercase tracking-[0.25px] text-muted"
              >
                Incident date
              </label>
              <input
                id="incident-date"
                type="date"
                className="w-full rounded-[5px] border border-input bg-white px-[9px] py-2 text-[11px] text-body focus-visible:outline-2 focus-visible:outline-primary focus-visible:outline-offset-[2px]"
                value={incidentDate}
                onChange={(event) => {
                  setIncidentDate(event.target.value)
                  setErrors((current) => ({ ...current, date: '' }))
                }}
              />
              {errors.date && <p className="mt-1 text-[10px] text-danger">{errors.date}</p>}
            </div>

            <div>
              <label
                htmlFor="damage-flag-reason"
                className="mb-1 block text-[9px] font-[650] uppercase tracking-[0.25px] text-muted"
              >
                Reason
              </label>
              <textarea
                id="damage-flag-reason"
                className="min-h-[72px] w-full rounded-[5px] border border-input bg-white px-[9px] py-2 text-[11px] text-body focus-visible:outline-2 focus-visible:outline-primary focus-visible:outline-offset-[2px]"
                value={reason}
                onChange={(event) => {
                  setReason(event.target.value)
                  setErrors((current) => ({ ...current, reason: '' }))
                }}
                placeholder="Describe the negligent-damage incident"
              />
              {errors.reason && <p className="mt-1 text-[10px] text-danger">{errors.reason}</p>}
            </div>

            <div>
              <label
                htmlFor="damage-flag-notes"
                className="mb-1 block text-[9px] font-[650] uppercase tracking-[0.25px] text-muted"
              >
                Notes (optional)
              </label>
              <textarea
                id="damage-flag-notes"
                className="min-h-[64px] w-full rounded-[5px] border border-input bg-white px-[9px] py-2 text-[11px] text-body focus-visible:outline-2 focus-visible:outline-primary focus-visible:outline-offset-[2px]"
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                placeholder="Add supporting details"
              />
            </div>

            <label className="flex items-start gap-2 rounded-[8px] border border-input bg-page p-3">
              <input
                type="checkbox"
                checked={reviewed}
                onChange={(event) => {
                  setReviewed(event.target.checked)
                  setErrors((current) => ({ ...current, review: '' }))
                }}
                className="mt-1 focus-visible:outline-2 focus-visible:outline-primary focus-visible:outline-offset-[2px]"
              />
              <span className="text-[10px] text-body">
                I reviewed the return and confirm the negligence issue was verified.
              </span>
            </label>
            {errors.review && <p className="text-[10px] text-danger">{errors.review}</p>}

            {saveError && <p role="alert" className="text-[10px] text-danger">{saveError}</p>}
            {isSaved && <p role="status" className="text-[10px] text-success">Damage flag recorded.</p>}
          </div>
          <div className="flex shrink-0 justify-end gap-2 border-t border-line bg-page px-[22px] py-[15px] max-[520px]:[&>button]:flex-1">
            <button
              type="button"
              disabled={isSaving}
              className="inline-flex min-h-[38px] items-center justify-center gap-[7px] whitespace-nowrap rounded-lg border border-input bg-white px-[15px] text-[12px] font-[650] text-body focus-visible:outline-2 focus-visible:outline-primary focus-visible:outline-offset-[3px] disabled:cursor-not-allowed disabled:opacity-45"
              onClick={onCancel}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving || isSaved}
              className="inline-flex min-h-[38px] items-center justify-center gap-[7px] whitespace-nowrap rounded-lg border border-primary bg-primary px-[15px] text-[12px] font-[650] text-white focus-visible:outline-2 focus-visible:outline-primary focus-visible:outline-offset-[3px] disabled:cursor-not-allowed disabled:opacity-45"
            >
              {isSaving ? 'Saving…' : isSaved ? 'Saved' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
