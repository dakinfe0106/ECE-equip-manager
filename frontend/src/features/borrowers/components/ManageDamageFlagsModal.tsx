import { useMemo, useRef, useState } from 'react'
import DamageFlagList from './DamageFlagList'
import BorrowerDamageWarningBadge from './BorrowerDamageWarningBadge'
import useModalAccessibility from '../hooks/useModalAccessibility'
import type {
  BorrowerIdentity,
  DamageFlag,
  DamageFlagLoadState,
  DamageFlagMutationResult,
  DamageFlagSummary,
} from '../types'

interface ManageDamageFlagsModalProps {
  borrower: BorrowerIdentity
  dataState: DamageFlagLoadState
  onClose: () => void
  onResolveFlag?: (
    flagId: string,
    resolutionReason: string,
  ) => DamageFlagMutationResult | DamageFlag | void
    | Promise<DamageFlagMutationResult | DamageFlag | void>
  onSelectFlag?: (flagId: string | undefined) => void
  onEditFlag?: (flagId: string) => void
  onRecordDamageFlag?: () => void
  onRetry?: () => void
  equipmentOptionsError?: string
  equipmentOptionsEmpty?: boolean
  onRetryEquipmentOptions?: () => void
  initialSelectedFlagId?: string
  restoreFocusOnUnmount?: boolean
}

export default function ManageDamageFlagsModal({
  borrower,
  dataState,
  onClose,
  onResolveFlag,
  onSelectFlag,
  onEditFlag,
  onRecordDamageFlag,
  onRetry,
  equipmentOptionsError,
  equipmentOptionsEmpty,
  onRetryEquipmentOptions,
  initialSelectedFlagId,
  restoreFocusOnUnmount = true,
}: ManageDamageFlagsModalProps) {
  const dialogRef = useRef<HTMLDivElement | null>(null)
  const savingRef = useRef(false)
  const [selectedFlagId, setSelectedFlagId] = useState(initialSelectedFlagId)
  const [pendingResolutionId, setPendingResolutionId] = useState<string | undefined>(undefined)
  const [resolutionReason, setResolutionReason] = useState('')
  const [summaryOverride, setSummaryOverride] = useState<DamageFlagSummary | undefined>()
  const [resolvedFlagIds, setResolvedFlagIds] = useState<string[]>([])
  const [isSaving, setIsSaving] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [successMessage, setSuccessMessage] = useState('')

  const flags = useMemo(
    () => dataState.status === 'loaded' ? dataState.flags : [],
    [dataState],
  )
  const selectedIncident = useMemo(
    () => flags.find((flag) => flag.id === selectedFlagId),
    [flags, selectedFlagId],
  )
  const selectedUnresolvedFlag = useMemo(
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
  const calculatedUnresolvedCount = dataState.status === 'loaded'
    ? Math.max(
      0,
      flags.filter((flag) => flag.status === 'unresolved').length
        - resolvedFlagIds.filter(
          (flagId) => flags.some((flag) => flag.id === flagId && flag.status === 'unresolved'),
        ).length,
    )
    : undefined
  const displayedUnresolvedCount = summaryOverride?.unresolved_count
    ?? (dataState.status === 'loaded' && resolvedFlagIds.length === 0
      ? dataState.summary.unresolved_count
      : calculatedUnresolvedCount)

  useModalAccessibility(dialogRef, () => {
    if (!savingRef.current) onClose()
  }, restoreFocusOnUnmount)

  const handleSelectFlag = (flagId: string) => {
    if (!flags.some((flag) => flag.id === flagId)) return

    setErrorMessage('')
    setSuccessMessage('')
    setSelectedFlagId(flagId)
    setPendingResolutionId(undefined)
    setResolutionReason('')
    onSelectFlag?.(flagId)
  }

  const handleRequestResolution = () => {
    if (!selectedUnresolvedFlag) {
      setErrorMessage('Select an unresolved incident before resolving it.')
      return
    }

    setPendingResolutionId(selectedUnresolvedFlag.id)
    setResolutionReason('')
    setErrorMessage('')
    setSuccessMessage('Selected incident marked for resolution. Save Changes to confirm.')
  }

  const handleSaveChanges = async () => {
    if (
      !selectedUnresolvedFlag ||
      !pendingResolutionId ||
      pendingResolutionId !== selectedUnresolvedFlag.id
    ) {
      setErrorMessage('Select an unresolved incident and mark it for resolution before saving.')
      return
    }

    if (!resolutionReason.trim()) {
      setErrorMessage('A resolution reason is required.')
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
      const result = await onResolveFlag(pendingResolutionId, resolutionReason.trim())
      if (result && 'summary' in result) {
        setSummaryOverride(result.summary)
      }
      setResolvedFlagIds((current) => [...new Set([...current, pendingResolutionId])])
      setSelectedFlagId(undefined)
      onSelectFlag?.(undefined)
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
    dataState.status === 'loaded'
      && selectedUnresolvedFlag
      && pendingResolutionId
      && pendingResolutionId === selectedUnresolvedFlag.id
      && resolutionReason.trim()
      && !isSaving,
  )

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[rgb(9_18_32_/_48%)] p-5 backdrop-blur-[2px]">
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="manage-damage-flags-title"
        tabIndex={-1}
        className="flex max-h-[min(780px,calc(100dvh-40px))] w-[min(440px,calc(100vw-40px))] flex-col overflow-hidden rounded-[13px] border border-line bg-white shadow-[0_24px_70px_rgb(10_20_35_/_25%)]"
      >
        <header className="flex shrink-0 items-start justify-between gap-3 border-b border-[#e8ebf0] px-[22px] py-5">
          <div>
            <p className="mb-[7px] text-[11px] font-[750] uppercase tracking-[0.11em] text-primary">
              BORROWER RESTRICTION
            </p>
            <h2 id="manage-damage-flags-title" className="m-0 text-[14px] font-[650] tracking-[-0.01em] text-[#202a38]">
              Manage damage flags
            </h2>
          </div>
          <button
            type="button"
            aria-label="Close damage flag management"
            disabled={isSaving}
            onClick={onClose}
            className="grid place-items-center rounded-lg border-0 bg-transparent p-[7px] text-[#637083] hover:bg-[#eef2f7] focus-visible:outline-2 focus-visible:outline-primary focus-visible:outline-offset-[3px]"
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto px-[22px] py-[21px]">
          {dataState.status === 'loading' && (
            <p role="status" className="rounded-[8px] border border-line bg-page p-4 text-[11px] text-muted">
              Loading damage flag information…
            </p>
          )}
          {dataState.status === 'unavailable' && (
            <p role="status" className="rounded-[8px] border border-line bg-page p-4 text-[11px] text-muted">
              Damage flag information is unavailable because no data service was provided.
            </p>
          )}
          {dataState.status === 'error' && (
            <div className="space-y-3 rounded-[8px] border border-danger/20 bg-danger-soft p-4">
              <p role="alert" className="m-0 text-[11px] text-danger">
                Unable to load damage flags: {dataState.message}
              </p>
              {onRetry && (
                <button
                  type="button"
                  className="inline-flex min-h-[38px] items-center justify-center rounded-lg border border-input bg-white px-[15px] text-[12px] font-[650] text-body focus-visible:outline-2 focus-visible:outline-primary focus-visible:outline-offset-[3px]"
                  onClick={onRetry}
                >
                  Retry
                </button>
              )}
            </div>
          )}
          {dataState.status === 'loaded' && (
            <div className="space-y-4">
          {equipmentOptionsEmpty && (
            <p role="status" className="rounded-[8px] border border-line bg-page p-3 text-[10px] text-muted">
              No active equipment is available. Recording a new damage flag is disabled.
            </p>
          )}
          {equipmentOptionsError && (
            <div className="space-y-2 rounded-[8px] border border-danger/20 bg-danger-soft p-3">
              <p role="alert" className="m-0 text-[10px] text-danger">
                Unable to load equipment options. {equipmentOptionsError}
              </p>
              {onRetryEquipmentOptions && (
                <button
                  type="button"
                  className="inline-flex min-h-[34px] items-center justify-center rounded-lg border border-input bg-white px-3 text-[10px] font-[650] text-body focus-visible:outline-2 focus-visible:outline-primary focus-visible:outline-offset-[3px]"
                  onClick={onRetryEquipmentOptions}
                >
                  Retry equipment lookup
                </button>
              )}
            </div>
          )}
          <div className="rounded-[9px] border border-line bg-page px-[14px] py-1">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[10px] text-muted">Borrower</p>
                <p className="mt-1 text-[11px] font-semibold text-body">{borrower.borrower_name}</p>
              </div>
              <div className="text-right">
                <p className="text-[10px] text-muted">Unresolved negligent damage flags</p>
                <p className="mt-1 text-[11px] font-semibold text-body">{displayedUnresolvedCount}</p>
              </div>
            </div>
            <div className="border-t border-divider py-3">
              <BorrowerDamageWarningBadge
                warningLevel={
                  summaryOverride?.warning_level
                    ?? (dataState.status === 'loaded'
                      ? dataState.summary.warning_level
                      : borrower.damage_warning_level)
                }
              />
            </div>
          </div>

          <p className="m-0 rounded-[8px] border border-warning/20 bg-warning-soft px-3 py-2 text-[10px] leading-[1.55] text-warning">
            A damaged return is not automatically negligent. Record a flag only after the incident has been reviewed.
          </p>

          <div className="flag-controls flex justify-between gap-2 max-[760px]:flex-col max-[760px]:[&>button]:w-full">
            <button
              type="button"
              disabled={!selectedIncident || !onEditFlag || isSaving}
              aria-disabled={!selectedIncident || !onEditFlag || isSaving}
              className="inline-flex min-h-[38px] items-center justify-center gap-[7px] whitespace-nowrap rounded-lg border border-input bg-white px-[15px] text-[12px] font-[650] text-body disabled:cursor-not-allowed disabled:opacity-45 focus-visible:outline-2 focus-visible:outline-primary focus-visible:outline-offset-[3px]"
              onClick={() => {
                if (selectedIncident) onEditFlag?.(selectedIncident.id)
              }}
            >
              Edit Damage Flag
            </button>
            <button
              type="button"
              disabled={!selectedUnresolvedFlag || !onResolveFlag || isSaving}
              aria-disabled={!selectedUnresolvedFlag || !onResolveFlag || isSaving}
              className="inline-flex min-h-[38px] items-center justify-center gap-[7px] whitespace-nowrap rounded-lg border border-input bg-white px-[15px] text-[12px] font-[650] text-body disabled:cursor-not-allowed disabled:opacity-45 focus-visible:outline-2 focus-visible:outline-primary focus-visible:outline-offset-[3px]"
              onClick={handleRequestResolution}
            >
              Resolve Existing Flag
            </button>
            <button
              type="button"
              disabled={isSaving || !onRecordDamageFlag}
              title={!onRecordDamageFlag ? 'Recording damage flags is unavailable.' : undefined}
              className="inline-flex min-h-[38px] items-center justify-center gap-[7px] whitespace-nowrap rounded-lg border border-danger/20 bg-white px-[15px] text-[12px] font-[650] text-danger disabled:cursor-not-allowed disabled:opacity-45 focus-visible:outline-2 focus-visible:outline-danger focus-visible:outline-offset-[3px]"
              onClick={onRecordDamageFlag}
            >
              Record Damage Flag
            </button>
          </div>

          <p className="mb-4 text-[10px] text-muted" aria-live="polite">
            Select an incident to edit, or select an unresolved incident to resolve it.
          </p>

          {pendingResolutionId && (
            <div className="mb-4">
              <label
                htmlFor="damage-flag-resolution-reason"
                className="mb-1 block text-[9px] font-[650] uppercase tracking-[0.25px] text-muted"
              >
                Resolution reason
              </label>
              <textarea
                id="damage-flag-resolution-reason"
                className="min-h-[64px] w-full rounded-[5px] border border-input bg-white px-[9px] py-2 text-[11px] text-body focus-visible:outline-2 focus-visible:outline-primary focus-visible:outline-offset-[2px]"
                value={resolutionReason}
                onChange={(event) => {
                  setResolutionReason(event.target.value)
                  setErrorMessage('')
                }}
                aria-describedby="damage-flag-resolution-help"
              />
              <p id="damage-flag-resolution-help" className="mt-1 text-[9px] text-muted">
                Required to preserve why this incident was resolved.
              </p>
            </div>
          )}

          <div className="rounded-[8px] border border-line bg-page p-3" aria-live="polite">
            <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.25px] text-muted">
              Selected incident
            </p>
            {selectedIncident ? (
              <div className="space-y-1 text-[11px] text-body">
                <p className="font-semibold">{selectedIncident.equipment_name ?? 'Unknown equipment'}</p>
                <p>{selectedIncident.reason}</p>
                <p className="text-muted">
                  {selectedIncident.incident_date} • {selectedIncident.reviewed ? 'Reviewed' : 'Pending review'}
                </p>
              </div>
            ) : (
              <p className="text-[11px] text-muted">
                No incident selected.
              </p>
            )}
          </div>

          <DamageFlagList
            flags={displayedFlags}
            selectedFlagId={selectedFlagId}
            onSelectFlag={handleSelectFlag}
          />
            </div>
          )}
        </div>

        {dataState.status === 'loaded' && errorMessage && (
          <p role="alert" className="shrink-0 px-[22px] pb-2 text-[10px] text-danger">
            {errorMessage}
          </p>
        )}
        {dataState.status === 'loaded' && successMessage && (
          <p role="status" className="shrink-0 px-[22px] pb-2 text-[10px] text-success">
            {successMessage}
          </p>
        )}

        <footer className="flex shrink-0 items-center justify-end gap-[9px] border-t border-[#e8ebf0] bg-[#fafbfc] px-[22px] py-[15px]">
          <button
            type="button"
            disabled={isSaving}
            className="inline-flex min-h-[38px] items-center justify-center gap-[7px] whitespace-nowrap rounded-lg border border-input bg-white px-[15px] text-[12px] font-[650] text-body focus-visible:outline-2 focus-visible:outline-primary focus-visible:outline-offset-[3px] disabled:cursor-not-allowed disabled:opacity-45"
            onClick={onClose}
          >
            Cancel
          </button>
          {dataState.status === 'loaded' && <button
            type="button"
            disabled={!canSave}
            aria-label="Save selected flag resolution"
            title="Save the selected incident resolution"
            className="inline-flex min-h-[38px] items-center justify-center gap-[7px] whitespace-nowrap rounded-lg border border-primary bg-primary px-[15px] text-[12px] font-[650] text-white disabled:cursor-not-allowed disabled:opacity-45 focus-visible:outline-2 focus-visible:outline-primary focus-visible:outline-offset-[3px]"
            onClick={handleSaveChanges}
          >
            {isSaving ? 'Saving…' : 'Save Changes'}
          </button>}
        </footer>
      </div>
    </div>
  )
}
