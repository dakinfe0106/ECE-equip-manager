import { useMemo, useState } from 'react'
import DamageFlagList from './DamageFlagList'
import BorrowerStandingBadge from './BorrowerStandingBadge'
import type { BorrowerIdentity, DamageFlag } from '../types'

interface ManageDamageFlagsModalProps {
  borrower: BorrowerIdentity
  flags: DamageFlag[]
  unresolvedCount: number
  onClose: () => void
  onSaveChanges?: () => void
  onResolveFlag?: (flagId: string) => void
  onSelectFlag?: (flagId: string) => void
  onRecordDamageFlag?: () => void
}

export default function ManageDamageFlagsModal({
  borrower,
  flags,
  unresolvedCount,
  onClose,
  onSaveChanges,
  onResolveFlag,
  onSelectFlag,
  onRecordDamageFlag,
}: ManageDamageFlagsModalProps) {
  const [selectedFlagId, setSelectedFlagId] = useState<string | undefined>(undefined)
  const [pendingResolutionId, setPendingResolutionId] = useState<string | undefined>(undefined)
  const [isSaving, setIsSaving] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')

  const selectedFlag = useMemo(
    () => flags.find((flag) => flag.id === selectedFlagId && flag.status === 'unresolved'),
    [flags, selectedFlagId],
  )

  const hasSelectedFlag = Boolean(selectedFlagId)

  const handleSelectFlag = (flagId: string) => {
    setErrorMessage('')
    setSelectedFlagId(flagId)
    setPendingResolutionId(flagId)
    onSelectFlag?.(flagId)
  }

  const handleResolveSelectedFlag = () => {
    if (!selectedFlagId) {
      setErrorMessage('Select an unresolved incident before resolving it.')
      return
    }

    setPendingResolutionId(selectedFlagId)
    setErrorMessage('')
    onResolveFlag?.(selectedFlagId)
  }

  const handleSaveChanges = () => {
    if (!pendingResolutionId) {
      setErrorMessage('Select an unresolved incident to resolve before saving.')
      return
    }

    if (isSaving) return

    setIsSaving(true)
    setErrorMessage('')
    try {
      onSaveChanges?.()
    } catch {
      setErrorMessage('Could not save the selected damage flag resolution.')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0f1b2d]/50 p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="manage-damage-flags-title"
        className="w-full max-w-[620px] rounded-[10px] border border-[#e0e6ef] bg-white shadow-[0_18px_48px_rgb(15_27_45_/_28%)]"
      >
        <header className="flex items-start justify-between gap-3 border-b border-[#e8edf3] px-[18px] pb-3 pt-4">
          <div>
            <p className="mb-1 text-[9px] font-bold tracking-[1px] text-[#8491a4]">BORROWER RESTRICTION</p>
            <h2 id="manage-damage-flags-title" className="m-0 text-[15px] font-[650] text-[#26344a]">
              Manage damage flags
            </h2>
          </div>
          <button
            type="button"
            aria-label="Close damage flag management"
            onClick={onClose}
            className="rounded-[5px] border border-[#dce3ed] bg-white px-[10px] py-[6px] text-[10px] text-[#59677a] focus-visible:outline-2 focus-visible:outline-[#347ee9] focus-visible:outline-offset-[3px]"
          >
            ×
          </button>
        </header>

        <div className="px-[18px] py-[18px]">
          <div className="mb-4 rounded-[8px] border border-[#e8edf3] bg-[#f7f9fb] p-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.25px] text-[#7b8796]">Borrower</p>
                <p className="mt-1 text-[13px] font-semibold text-[#26344a]">{borrower.borrower_name}</p>
              </div>
              <div className="text-right">
                <p className="text-[10px] font-semibold uppercase tracking-[0.25px] text-[#7b8796]">Unresolved</p>
                <p className="mt-1 text-[13px] font-semibold text-[#26344a]">{unresolvedCount}</p>
              </div>
            </div>
            <div className="mt-3">
              <BorrowerStandingBadge
                standing={borrower.standing ?? 'normal'}
                isEligible={borrower.is_eligible ?? undefined}
              />
            </div>
          </div>

          <p className="mb-4 rounded-[8px] border border-[#f1d97d] bg-[#fff9e9] px-3 py-2 text-[10px] text-[#7a5a1d]">
            A damaged return is not automatically negligent. Record a flag only after the incident has been reviewed.
          </p>

          <div className="mb-4 flex flex-wrap gap-2">
            <button
              type="button"
              className="rounded-[5px] border border-[#2672e8] bg-[#2672e8] px-[10px] py-[6px] text-[10px] text-white focus-visible:outline-2 focus-visible:outline-[#347ee9] focus-visible:outline-offset-[3px]"
              onClick={onRecordDamageFlag}
            >
              Record Damage Flag
            </button>
            <button
              type="button"
              disabled={!hasSelectedFlag || isSaving}
              aria-disabled={!hasSelectedFlag || isSaving}
              className="rounded-[5px] border border-[#dce3ed] bg-white px-[10px] py-[6px] text-[10px] text-[#59677a] disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-[#347ee9] focus-visible:outline-offset-[3px]"
              onClick={handleResolveSelectedFlag}
            >
              Resolve Existing Flag
            </button>
          </div>

          <div className="mb-4 rounded-[8px] border border-[#e8edf3] bg-[#f8fafc] p-3" aria-live="polite">
            <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.25px] text-[#7b8796]">
              Selected incident
            </p>
            {selectedFlag ? (
              <div className="space-y-1 text-[11px] text-[#39465a]">
                <p className="font-semibold">{selectedFlag.equipment_name ?? 'Unknown equipment'}</p>
                <p>{selectedFlag.reason}</p>
                <p className="text-[#59677a]">
                  {selectedFlag.incident_date} • {selectedFlag.reviewed ? 'Reviewed' : 'Pending review'}
                </p>
              </div>
            ) : (
              <p className="text-[11px] text-[#59677a]">
                No incident selected. Choose an unresolved incident to review before confirming resolution.
              </p>
            )}
          </div>

          <DamageFlagList
            flags={flags}
            selectedFlagId={selectedFlagId}
            onSelectFlag={handleSelectFlag}
            onResolveFlag={handleResolveSelectedFlag}
          />
        </div>

        {errorMessage && (
          <p role="alert" className="px-[18px] pb-2 text-[10px] text-[#b42332]">
            {errorMessage}
          </p>
        )}

        <footer className="flex justify-end gap-2 border-t border-[#e8edf3] px-[18px] py-3">
          <button
            type="button"
            className="rounded-[5px] border border-[#dce3ed] bg-white px-[10px] py-[6px] text-[10px] text-[#59677a] focus-visible:outline-2 focus-visible:outline-[#347ee9] focus-visible:outline-offset-[3px]"
            onClick={onClose}
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={!pendingResolutionId || isSaving}
            aria-label="Save selected flag resolution"
            title="Save the selected incident resolution"
            className="rounded-[5px] border border-[#2672e8] bg-[#2672e8] px-[10px] py-[6px] text-[10px] text-white disabled:cursor-not-allowed disabled:opacity-70 focus-visible:outline-2 focus-visible:outline-[#347ee9] focus-visible:outline-offset-[3px]"
            onClick={handleSaveChanges}
          >
            {isSaving ? 'Saving…' : 'Save Changes'}
          </button>
        </footer>
      </div>
    </div>
  )
}
