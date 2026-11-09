import { useMemo, useRef, useState } from 'react'
import DamageFlagList from './DamageFlagList'
import BorrowerStandingBadge from './BorrowerStandingBadge'
import useModalAccessibility from '../hooks/useModalAccessibility'
import type { BorrowerIdentity, DamageFlag } from '../types'

interface ManageDamageFlagsModalProps {
  borrower: BorrowerIdentity
  flags: DamageFlag[]
  unresolvedCount: number
  onClose: () => void
  onResolveFlag?: (flagId: string) => void | Promise<void>
  onSelectFlag?: (flagId: string) => void
  onRecordDamageFlag?: () => void
}

export default function ManageDamageFlagsModal({
  borrower,
  flags,
  unresolvedCount,
  onClose,
  onResolveFlag,
  onSelectFlag,
  onRecordDamageFlag,
}: ManageDamageFlagsModalProps) {
  const dialogRef = useRef<HTMLDivElement | null>(null)
  const savingRef = useRef(false)
  const [selectedFlagId, setSelectedFlagId] = useState<string | undefined>(undefined)
  const [pendingResolutionId, setPendingResolutionId] = useState<string | undefined>(undefined)
  const [resolvedFlagIds, setResolvedFlagIds] = useState<string[]>([])
  const [isSaving, setIsSaving] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [successMessage, setSuccessMessage] = useState('')

  const selectedFlag = useMemo(
    () => flags.find(
      (flag) => flag.id === selectedFlagId
        && flag.status === 'unresolved'
        && !resolvedFlagIds.includes(flag.id),
    ),
    [flags, resolvedFlagIds, selectedFlagId],
  )
  const displayedFlags = useMemo(
    () => flags.map((flag) => (
      resolvedFlagIds.includes(flag.id) ? { ...flag, status: 'resolved' as const } : flag
    )),
    [flags, resolvedFlagIds],
  )
  const displayedUnresolvedCount = Math.max(
    0,
    unresolvedCount - resolvedFlagIds.filter(
      (flagId) => flags.some((flag) => flag.id === flagId && flag.status === 'unresolved'),
    ).length,
  )

  useModalAccessibility(dialogRef, () => {
    if (!savingRef.current) onClose()
  })

  const handleSelectFlag = (flagId: string) => {
    if (!flags.some((flag) => flag.id === flagId && flag.status === 'unresolved')) return

    setErrorMessage('')
    setSuccessMessage('')
    setSelectedFlagId(flagId)
    setPendingResolutionId(undefined)
    onSelectFlag?.(flagId)
  }

  const handleRequestResolution = () => {
    if (!selectedFlag) {
      setErrorMessage('Select an unresolved incident before resolving it.')
      return
    }

    setPendingResolutionId(selectedFlag.id)
    setErrorMessage('')
    setSuccessMessage('Selected incident marked for resolution. Save Changes to confirm.')
  }

  const handleSaveChanges = async () => {
    if (
      !selectedFlag ||
      !pendingResolutionId ||
      pendingResolutionId !== selectedFlag.id
    ) {
      setErrorMessage('Select an unresolved incident and mark it for resolution before saving.')
      return
    }

    if (!onResolveFlag) {
      setErrorMessage('Damage flag resolution is unavailable.')
      return
    }

    if (savingRef.current) return

    savingRef.current = true
    setIsSaving(true)
    setErrorMessage('')
    setSuccessMessage('')
    try {
      await onResolveFlag(pendingResolutionId)
      setResolvedFlagIds((current) => [...new Set([...current, pendingResolutionId])])
      setSelectedFlagId(undefined)
      setPendingResolutionId(undefined)
      setSuccessMessage('Damage flag resolved. The incident remains in history.')
    } catch (error: unknown) {
      setErrorMessage(
        error instanceof Error ? error.message : 'Could not save the selected damage flag resolution.',
      )
    } finally {
      savingRef.current = false
      setIsSaving(false)
    }
  }

  const canSave = Boolean(
    selectedFlag && pendingResolutionId && pendingResolutionId === selectedFlag.id && !isSaving,
  )

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-sidebar/50 p-4">
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="manage-damage-flags-title"
        tabIndex={-1}
        className="w-full max-w-[620px] rounded-[10px] border border-line bg-white shadow-[0_18px_48px_rgb(15_27_45_/_28%)]"
      >
        <header className="flex items-start justify-between gap-3 border-b border-line px-[18px] pb-3 pt-4">
          <div>
            <p className="mb-1 text-[9px] font-bold tracking-[1px] text-subtle">BORROWER RESTRICTION</p>
            <h2 id="manage-damage-flags-title" className="m-0 text-[15px] font-[650] text-heading">
              Manage damage flags
            </h2>
          </div>
          <button
            type="button"
            aria-label="Close damage flag management"
            disabled={isSaving}
            onClick={onClose}
            className="rounded-[5px] border border-input bg-white px-[10px] py-[6px] text-[10px] text-muted focus-visible:outline-2 focus-visible:outline-primary focus-visible:outline-offset-[3px]"
          >
            ×
          </button>
        </header>

        <div className="px-[18px] py-[18px]">
          <div className="mb-4 rounded-[8px] border border-line bg-page p-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.25px] text-muted">Borrower</p>
                <p className="mt-1 text-[13px] font-semibold text-heading">{borrower.borrower_name}</p>
              </div>
              <div className="text-right">
                <p className="text-[10px] font-semibold uppercase tracking-[0.25px] text-muted">Unresolved</p>
                <p className="mt-1 text-[13px] font-semibold text-heading">{displayedUnresolvedCount}</p>
              </div>
            </div>
            <div className="mt-3">
              <BorrowerStandingBadge
                standing={borrower.standing}
                isEligible={borrower.is_eligible}
              />
            </div>
          </div>

          <p className="mb-4 rounded-[8px] border border-warning bg-warning-soft px-3 py-2 text-[10px] text-warning">
            A damaged return is not automatically negligent. Record a flag only after the incident has been reviewed.
          </p>

          <div className="mb-2 flex flex-wrap gap-2">
            <button
              type="button"
              disabled={isSaving}
              className="rounded-[5px] border border-primary bg-primary px-[10px] py-[6px] text-[10px] text-white focus-visible:outline-2 focus-visible:outline-primary focus-visible:outline-offset-[3px] disabled:cursor-not-allowed disabled:opacity-60"
              onClick={onRecordDamageFlag}
            >
              Record Damage Flag
            </button>
            <button
              type="button"
              disabled={!selectedFlag || !onResolveFlag || isSaving}
              aria-disabled={!selectedFlag || !onResolveFlag || isSaving}
              className="rounded-[5px] border border-input bg-white px-[10px] py-[6px] text-[10px] text-muted disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-primary focus-visible:outline-offset-[3px]"
              onClick={handleRequestResolution}
            >
              Resolve Existing Flag
            </button>
          </div>

          <p className="mb-4 text-[10px] text-muted" aria-live="polite">
            Select an unresolved incident, choose Resolve Existing Flag, then Save Changes to confirm.
          </p>

          <div className="mb-4 rounded-[8px] border border-line bg-page p-3" aria-live="polite">
            <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.25px] text-muted">
              Selected incident
            </p>
            {selectedFlag ? (
              <div className="space-y-1 text-[11px] text-body">
                <p className="font-semibold">{selectedFlag.equipment_name ?? 'Unknown equipment'}</p>
                <p>{selectedFlag.reason}</p>
                <p className="text-muted">
                  {selectedFlag.incident_date} • {selectedFlag.reviewed ? 'Reviewed' : 'Pending review'}
                </p>
              </div>
            ) : (
              <p className="text-[11px] text-muted">
                No unresolved incident selected.
              </p>
            )}
          </div>

          <DamageFlagList
            flags={displayedFlags}
            selectedFlagId={selectedFlagId}
            onSelectFlag={handleSelectFlag}
          />
        </div>

        {errorMessage && (
          <p role="alert" className="px-[18px] pb-2 text-[10px] text-danger">
            {errorMessage}
          </p>
        )}
        {successMessage && (
          <p role="status" className="px-[18px] pb-2 text-[10px] text-success">
            {successMessage}
          </p>
        )}

        <footer className="flex justify-end gap-2 border-t border-line px-[18px] py-3">
          <button
            type="button"
            disabled={isSaving}
            className="rounded-[5px] border border-input bg-white px-[10px] py-[6px] text-[10px] text-muted focus-visible:outline-2 focus-visible:outline-primary focus-visible:outline-offset-[3px] disabled:cursor-not-allowed disabled:opacity-60"
            onClick={onClose}
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={!canSave}
            aria-label="Save selected flag resolution"
            title="Save the selected incident resolution"
            className="rounded-[5px] border border-primary bg-primary px-[10px] py-[6px] text-[10px] text-white disabled:cursor-not-allowed disabled:opacity-70 focus-visible:outline-2 focus-visible:outline-primary focus-visible:outline-offset-[3px]"
            onClick={handleSaveChanges}
          >
            {isSaving ? 'Saving…' : 'Save Changes'}
          </button>
        </footer>
      </div>
    </div>
  )
}
