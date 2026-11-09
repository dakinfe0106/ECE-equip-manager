import { useMemo, useState, type FormEvent } from 'react'
import type { BorrowerIdentity, DamageFlagCreateInput } from '../types'

interface EquipmentOption {
  id: number
  name: string
}

interface RecordDamageFlagModalProps {
  borrower: BorrowerIdentity
  equipmentOptions: EquipmentOption[]
  onCancel: () => void
  onSave: (payload: DamageFlagCreateInput) => void
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
}: RecordDamageFlagModalProps) {
  const [equipmentId, setEquipmentId] = useState<number | ''>('')
  const [incidentDate, setIncidentDate] = useState('')
  const [reason, setReason] = useState('')
  const [notes, setNotes] = useState('')
  const [reviewed, setReviewed] = useState(false)
  const [errors, setErrors] = useState(emptyErrors)

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

  const handleSave = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!validate()) return

    onSave({
      borrower_id: borrower.borrower_id,
      borrower_name: borrower.borrower_name,
      equipment_id: Number(equipmentId),
      equipment_name: selectedEquipment?.name,
      incident_date: incidentDate,
      reason,
      notes,
      reviewed,
      reviewed_by: 'technician',
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0f1b2d]/50 p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="record-damage-flag-title"
        className="w-full max-w-[520px] rounded-[10px] border border-[#e0e6ef] bg-white shadow-[0_18px_48px_rgb(15_27_45_/_28%)]"
      >
        <div className="flex items-start justify-between gap-3 border-b border-[#e8edf3] px-[18px] pb-3 pt-4">
          <div>
            <p className="mb-1 text-[9px] font-bold tracking-[1px] text-[#8491a4]">BORROWER RESTRICTION</p>
            <h2 id="record-damage-flag-title" className="m-0 text-[15px] font-[650] text-[#26344a]">
              Record damage flag
            </h2>
          </div>
          <button
            type="button"
            onClick={onCancel}
            className="rounded-[5px] border border-[#dce3ed] bg-white px-[10px] py-[6px] text-[10px] text-[#59677a]"
          >
            ×
          </button>
        </div>

        <form className="space-y-4 px-[18px] py-[18px]" onSubmit={handleSave}>
          <div>
            <p className="text-[11px] font-semibold text-[#39465a]">Borrower</p>
            <p className="mt-1 text-[11px] text-[#59677a]">{borrower.borrower_name}</p>
          </div>

          <div>
            <label className="mb-1 block text-[9px] font-[650] uppercase tracking-[0.25px] text-[#8792a2]">
              Equipment
            </label>
            <select
              aria-label="Equipment"
              className="w-full rounded-[5px] border border-[#dce3ed] bg-white px-[9px] py-2 text-[11px] text-[#39465a]"
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
            {errors.equipment && <p className="mt-1 text-[10px] text-[#b42332]">{errors.equipment}</p>}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label
                htmlFor="incident-date"
                className="mb-1 block text-[9px] font-[650] uppercase tracking-[0.25px] text-[#8792a2]"
              >
                Incident date
              </label>
              <input
                id="incident-date"
                type="date"
                className="w-full rounded-[5px] border border-[#dce3ed] bg-white px-[9px] py-2 text-[11px] text-[#39465a]"
                value={incidentDate}
                onChange={(event) => {
                  setIncidentDate(event.target.value)
                  setErrors((current) => ({ ...current, date: '' }))
                }}
              />
              {errors.date && <p className="mt-1 text-[10px] text-[#b42332]">{errors.date}</p>}
            </div>
          </div>

          <div>
            <label
              htmlFor="damage-flag-reason"
              className="mb-1 block text-[9px] font-[650] uppercase tracking-[0.25px] text-[#8792a2]"
            >
              Reason
            </label>
            <textarea
              id="damage-flag-reason"
              className="min-h-[72px] w-full rounded-[5px] border border-[#dce3ed] bg-white px-[9px] py-2 text-[11px] text-[#39465a]"
              value={reason}
              onChange={(event) => {
                setReason(event.target.value)
                setErrors((current) => ({ ...current, reason: '' }))
              }}
              placeholder="Describe the negligent-damage incident"
            />
            {errors.reason && <p className="mt-1 text-[10px] text-[#b42332]">{errors.reason}</p>}
          </div>

          <div>
            <label
              htmlFor="damage-flag-notes"
              className="mb-1 block text-[9px] font-[650] uppercase tracking-[0.25px] text-[#8792a2]"
            >
              Notes (optional)
            </label>
            <textarea
              id="damage-flag-notes"
              className="min-h-[64px] w-full rounded-[5px] border border-[#dce3ed] bg-white px-[9px] py-2 text-[11px] text-[#39465a]"
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              placeholder="Add supporting details"
            />
          </div>

          <label className="flex items-start gap-2 rounded-[8px] border border-[#dce3ed] bg-[#f9fbfe] p-3">
            <input
              type="checkbox"
              checked={reviewed}
              onChange={(event) => {
                setReviewed(event.target.checked)
                setErrors((current) => ({ ...current, review: '' }))
              }}
              className="mt-1"
            />
            <span className="text-[10px] text-[#465469]">
              I reviewed the return and confirm the negligence issue was verified.
            </span>
          </label>
          {errors.review && <p className="text-[10px] text-[#b42332]">{errors.review}</p>}

          <div className="flex justify-end gap-2 border-t border-[#e8edf3] pt-4">
            <button
              type="button"
              className="rounded-[5px] border border-[#dce3ed] bg-white px-[10px] py-[6px] text-[10px] text-[#59677a]"
              onClick={onCancel}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="rounded-[5px] border border-[#2672e8] bg-[#2672e8] px-[10px] py-[6px] text-[10px] text-white"
            >
              Save
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
