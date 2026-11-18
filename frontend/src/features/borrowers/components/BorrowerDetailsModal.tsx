import { useEffect, useRef, useState, type FormEvent, type MouseEvent } from 'react'
import Badge from '../../../components/ui/Badge'
import useModalAccessibility from '../hooks/useModalAccessibility'
import type { BorrowerDetailsLoadState, BorrowerDetailsViewModel } from '../types'
import BorrowerDamageWarningBadge from './BorrowerDamageWarningBadge'
import { hasPermission } from '../../auth/api'
import { useAuth } from '../../auth/useAuth'

interface BorrowerDetailsModalProps {
  borrower: BorrowerDetailsViewModel
  onClose: () => void
  onViewBorrowingRecords?: (borrowerId: number) => void
  onManageDamageFlags: (borrowerId: number) => void
  detailsLoadState?: BorrowerDetailsLoadState
  onRetryDetails?: () => void
  onBorrowerUpdated?: (borrower: BorrowerDetailsViewModel) => void
  restoreFocusOnUnmount?: boolean
}

export default function BorrowerDetailsModal({
  borrower,
  onClose,
  onViewBorrowingRecords,
  onManageDamageFlags,
  detailsLoadState,
  onRetryDetails,
  onBorrowerUpdated,
  restoreFocusOnUnmount = true,
}: BorrowerDetailsModalProps) {
  const { user } = useAuth()
  const canChange = hasPermission(user, 'lending.change_borrower') ?? true
  const dialogRef = useRef<HTMLDivElement | null>(null)

  const [isEditing, setIsEditing] = useState(false)
  const [borrowerNameInput, setBorrowerNameInput] = useState(borrower.borrower_name)
  const [isSaving, setIsSaving] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [statusMessage, setStatusMessage] = useState('')
  const [showUnsavedWarning, setShowUnsavedWarning] = useState(false)

  const isDirty = borrowerNameInput.trim() !== borrower.borrower_name

  useModalAccessibility(dialogRef, () => {
    if (!isSaving) handleAttemptClose()
  }, restoreFocusOnUnmount)

  useEffect(() => {
    setBorrowerNameInput(borrower.borrower_name)
  }, [borrower.borrower_name])

  const handleAttemptClose = () => {
    if (isSaving) return
    if (isEditing && isDirty) {
      setShowUnsavedWarning(true)
      return
    }
    onClose()
  }

  const closeOnBackdropClick = (event: MouseEvent<HTMLDivElement>) => {
    if (event.target === event.currentTarget) handleAttemptClose()
  }

  const handleSave = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setErrorMessage('')
    setStatusMessage('')

    const trimmed = borrowerNameInput.trim()
    if (!trimmed) {
      setErrorMessage('Borrower Name cannot be empty or contain only spaces.')
      return
    }

    if (!isDirty) {
      setIsEditing(false)
      return
    }

    setIsSaving(true)
    try {
      const parts = trimmed.split(/\s+/)
      const first_name = parts[0]
      const last_name = parts.slice(1).join(' ')

      const updated = await import('../api').then((mod) =>
        mod.updateBorrower(borrower.borrower_id, { first_name, last_name }),
      )

      const updatedViewModel: BorrowerDetailsViewModel = {
        ...borrower,
        borrower_name: [updated.first_name, updated.last_name].filter(Boolean).join(' '),
        negligent_damage_flag: updated.negligent_damage_flag,
        unresolved_damage_flag_count: updated.unresolved_damage_flag_count,
        damage_warning_level: updated.damage_warning_level,
        damage_eligible: updated.damage_eligible,
        is_manual_enrollment: updated.is_manual_enrollment,
      }

      onBorrowerUpdated?.(updatedViewModel)
      setIsEditing(false)
      setShowUnsavedWarning(false)
      setStatusMessage('Borrower updated successfully.')
    } catch (error: unknown) {
      setErrorMessage(
        error instanceof Error ? error.message : 'Could not save borrower changes.',
      )
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[rgb(9_18_32_/_48%)] p-5 backdrop-blur-[2px]"
      onMouseDown={closeOnBackdropClick}
    >
      <section
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="borrower-details-title"
        tabIndex={-1}
        className="flex max-h-[min(780px,calc(100dvh-40px))] w-[min(650px,calc(100vw-40px))] flex-col overflow-hidden rounded-[13px] border border-line bg-white shadow-[0_24px_70px_rgb(10_20_35_/_25%)]"
      >
        <header className="flex shrink-0 items-start justify-between gap-3 border-b border-[#e8ebf0] px-[22px] py-5">
          <div>
            <p className="mb-[7px] text-[11px] font-[750] uppercase tracking-[0.11em] text-primary">
              Borrower details · UNB ID {borrower.unb_id}
            </p>
            <h2
              id="borrower-details-title"
              className="m-0 text-[14px] font-[650] tracking-[-0.01em] text-[#202a38]"
            >
              {borrower.borrower_name}
            </h2>
          </div>
          <div className="flex items-center gap-2">
            {!isEditing && canChange && (
              <button
                type="button"
                onClick={() => setIsEditing(true)}
                className="rounded-[5px] border border-primary bg-primary px-[10px] py-[6px] text-[10px] text-white hover:bg-primary-hover focus-visible:outline-2 focus-visible:outline-primary"
              >
                Edit information
              </button>
            )}
            <button
              type="button"
              aria-label="Close borrower details"
              onClick={handleAttemptClose}
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
          </div>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto px-[22px] py-[21px]">
          {detailsLoadState?.status === 'loading' && (
            <p role="status" className="mb-4 rounded-lg border border-primary/20 bg-primary-soft px-3 py-2 text-[11px] text-primary">
              Loading borrower details…
            </p>
          )}
          {detailsLoadState?.status === 'error' && (
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-danger/20 bg-danger-soft px-3 py-2">
              <p role="alert" className="m-0 text-[11px] text-danger">
                Unable to load borrower details. {detailsLoadState.message}
              </p>
              {onRetryDetails && (
                <button
                  type="button"
                  onClick={onRetryDetails}
                  className="rounded-md border border-danger/20 bg-white px-3 py-1.5 text-[11px] font-semibold text-danger focus-visible:outline-2 focus-visible:outline-danger focus-visible:outline-offset-2"
                >
                  Retry
                </button>
              )}
            </div>
          )}
          <div className="mb-5 flex flex-wrap items-center gap-[9px] text-[10px] text-muted" aria-label="Borrower standing">
            <span>Standing · System controlled</span>
            {borrower.standing ? (
              <Badge
                tone={borrower.standing === 'Good' ? 'success' : 'danger'}
              >
                {borrower.standing}
              </Badge>
            ) : (
              <span className="rounded-full bg-neutral-soft px-[7px] py-1 text-[9px] font-[650] text-neutral">
                Standing unavailable
              </span>
            )}
            {borrower.is_manual_enrollment && (
              <Badge tone="neutral">Manual</Badge>
            )}
          </div>

          {isEditing ? (
            <form id="borrower-edit-form" onSubmit={handleSave} className="space-y-4">
              <div className="grid grid-cols-1 gap-x-[15px] gap-y-[15px] sm:grid-cols-2">
                <div className="min-w-0">
                  <label className="mb-[6px] block text-[10px] font-[650] text-body" htmlFor="edit-unb-id">
                    UNB ID · Read only
                  </label>
                  <input
                    id="edit-unb-id"
                    value={borrower.unb_id}
                    readOnly
                    className="w-full rounded-lg border border-input bg-page px-[11px] py-[10px] font-mono text-[12px] text-muted"
                  />
                </div>
                <div className="min-w-0">
                  <label className="mb-[6px] block text-[10px] font-[650] text-body" htmlFor="edit-standing">
                    Standing · System controlled
                  </label>
                  <input
                    id="edit-standing"
                    value={borrower.standing ?? 'Standing unavailable'}
                    readOnly
                    className="w-full rounded-lg border border-input bg-page px-[11px] py-[10px] text-[12px] text-muted"
                  />
                </div>
                <div className="min-w-0 sm:col-span-2">
                  <label className="mb-[6px] block text-[10px] font-[650] text-body" htmlFor="borrower-name-input">
                    Borrower Name <span className="text-danger">*</span>
                  </label>
                  <input
                    id="borrower-name-input"
                    type="text"
                    required
                    maxLength={255}
                    value={borrowerNameInput}
                    onChange={(event) => {
                      setBorrowerNameInput(event.target.value)
                      setErrorMessage('')
                    }}
                    className="w-full rounded-lg border border-input bg-white px-[11px] py-[10px] text-[12px] text-body focus:border-primary focus:outline-none"
                  />
                </div>
              </div>
              {errorMessage && (
                <p role="alert" className="m-0 text-[11px] text-danger">
                  {errorMessage}
                </p>
              )}
            </form>
          ) : (
            <dl className="grid grid-cols-1 gap-x-[15px] gap-y-[15px] sm:grid-cols-2">
              <div className="min-w-0">
                <dt className="mb-[6px] text-[10px] font-[650] text-body">UNB ID · Read only</dt>
                <dd className="m-0 rounded-lg border border-input bg-page px-[11px] py-[10px] font-mono text-[12px] text-muted">
                  {borrower.unb_id}
                </dd>
              </div>
              <div className="min-w-0">
                <dt className="mb-[6px] text-[10px] font-[650] text-body">Standing · System controlled</dt>
                <dd className="m-0 rounded-lg border border-input bg-page px-[11px] py-[10px] text-[12px] text-muted">
                  {borrower.standing ?? 'Standing unavailable'}
                </dd>
              </div>

              <div className="min-w-0 sm:col-span-2">
                <dt className="mb-[6px] text-[10px] font-[650] text-body">Certifications</dt>
                <dd className="m-0">
              {borrower.certifications === undefined ? (
                    <p className="m-0 rounded-lg border border-input bg-page px-[11px] py-[10px] text-[11px] text-muted">
                      Certification information unavailable.
                    </p>
              ) : borrower.certifications.length === 0 ? (
                    <p className="m-0 rounded-lg border border-input bg-page px-[11px] py-[10px] text-[11px] text-muted">
                      No certifications recorded.
                    </p>
              ) : (
                    <div className="rounded-lg border border-input bg-page px-[11px] py-[10px] text-[11px] text-body">
                      {borrower.certifications.join(', ')}
                    </div>
              )}
                </dd>
              </div>

              <div className="min-w-0">
                <dt className="mb-[6px] text-[10px] font-[650] text-body">Active loans · Read only</dt>
                <dd className="m-0">
              {borrower.active_loans === undefined ? (
                    <p className="m-0 rounded-lg border border-input bg-page px-[11px] py-[10px] text-[11px] text-muted">
                      Active loan information unavailable.
                    </p>
              ) : borrower.active_loans.length === 0 ? (
                    <p className="m-0 rounded-lg border border-input bg-page px-[11px] py-[10px] text-[11px] text-muted">
                      No active loans.
                    </p>
              ) : (
                    <ul className="m-0 list-none space-y-2 rounded-lg border border-input bg-page p-[11px]">
                      {borrower.active_loans.map((loan) => (
                        <li key={loan.loan_id}>
                          <p className="m-0 text-[11px] font-semibold text-heading">
                            {loan.equipment_name}
                          </p>
                          {loan.asset_identifier && (
                            <p className="mt-1 font-mono text-[10px] text-muted">
                              {loan.asset_identifier}
                            </p>
                          )}
                          {loan.checkout_date && (
                            <p className="mt-1 text-[10px] text-muted">
                              Checkout date: <span className="text-body">{loan.checkout_date}</span>
                            </p>
                          )}
                          {loan.expected_return_date && (
                            <p className="mt-1 text-[10px] text-muted">
                              Expected return: <span className="text-body">{loan.expected_return_date}</span>
                            </p>
                          )}
                        </li>
                      ))}
                    </ul>
              )}
                </dd>
              </div>

              <div className="min-w-0">
                <dt className="mb-[6px] text-[10px] font-[650] text-body">Overdue equipment · Read only</dt>
                <dd className="m-0">
              {borrower.overdue_equipment === undefined ? (
                    <p className="m-0 rounded-lg border border-input bg-page px-[11px] py-[10px] text-[11px] text-muted">
                      Overdue equipment information unavailable.
                    </p>
              ) : borrower.overdue_equipment.length === 0 ? (
                    <p className="m-0 rounded-lg border border-input bg-page px-[11px] py-[10px] text-[11px] text-muted">
                      No overdue equipment.
                    </p>
              ) : (
                    <ul className="m-0 list-none space-y-2 rounded-lg border border-danger/20 bg-danger-soft p-[11px]">
                      {borrower.overdue_equipment.map((equipment, index) => (
                        <li key={`${equipment.asset_identifier ?? equipment.equipment_name}-${index}`}>
                          <p className="m-0 text-[11px] font-semibold text-heading">
                            {equipment.equipment_name}
                          </p>
                          {equipment.asset_identifier && (
                            <p className="mt-1 font-mono text-[10px] text-muted">
                              {equipment.asset_identifier}
                            </p>
                          )}
                          {equipment.expected_return_date && (
                            <p className="mt-1 text-[10px] text-muted">
                              Expected return: <span className="text-body">{equipment.expected_return_date}</span>
                            </p>
                          )}
                        </li>
                      ))}
                    </ul>
              )}
                </dd>
              </div>

              <div className="min-w-0">
                <dt className="mb-[6px] text-[10px] font-[650] text-body">
                  Unresolved reviewed damage incidents · System calculated
                </dt>
                <dd className="m-0">
                  {borrower.unresolved_damage_flag_count === undefined ? (
                    <p className="m-0 rounded-lg border border-input bg-page px-[11px] py-[10px] text-[11px] text-muted">
                      Damage incident count unavailable.
                    </p>
                  ) : (
                    <div className="space-y-2 rounded-lg border border-input bg-page px-[11px] py-[10px] text-[11px] text-body">
                      <p className="m-0">
                        {borrower.unresolved_damage_flag_count}
                        {' '}
                        {borrower.unresolved_damage_flag_count === 1 ? 'unresolved incident' : 'unresolved incidents'}
                      </p>
                      <BorrowerDamageWarningBadge warningLevel={borrower.damage_warning_level} />
                      {borrower.damage_eligible !== undefined && (
                        <p className="m-0 text-[10px] text-muted">
                          Damage-based checkout status:{' '}
                          {borrower.damage_eligible ? 'Eligible' : 'Ineligible'}
                        </p>
                      )}
                    </div>
                  )}
                </dd>
              </div>

              <div className="min-w-0 sm:col-span-2">
                <dt className="mb-[6px] text-[10px] font-[650] text-body">
                  Legacy negligent damage indicator · Read only
                </dt>
                <dd className="m-0">
                  {borrower.negligent_damage_flag === undefined ? (
                    <p className="m-0 rounded-lg border border-input bg-page px-[11px] py-[10px] text-[11px] text-muted">
                      Legacy indicator unavailable.
                    </p>
                  ) : (
                    <div className="rounded-lg border border-input bg-page px-[11px] py-[10px] text-[11px] text-body">
                      <p className="m-0">
                        {borrower.negligent_damage_flag ? 'Flag recorded' : 'No flag recorded'}
                      </p>
                      <p className="mb-0 mt-1 text-[10px] text-muted">
                        This stored indicator is separate from incident history and does not affect warning calculations.
                      </p>
                    </div>
                  )}
                </dd>
              </div>
            </dl>
          )}

          <button
            type="button"
            disabled={!onViewBorrowingRecords}
            aria-describedby={!onViewBorrowingRecords ? 'borrowing-records-unavailable' : undefined}
            onClick={() => onViewBorrowingRecords?.(borrower.borrower_id)}
            className="mt-5 flex w-full items-center justify-between gap-3 rounded-lg border border-primary/20 bg-primary-soft p-[13px] text-left text-[10px] font-[650] text-primary hover:bg-primary-soft focus-visible:outline-2 focus-visible:outline-primary focus-visible:outline-offset-[3px] disabled:cursor-not-allowed disabled:opacity-55"
          >
            View Borrowing Records
            <span aria-hidden="true">›</span>
          </button>
          {!onViewBorrowingRecords && (
            <p id="borrowing-records-unavailable" className="mt-2 text-[10px] text-muted">
              Borrowing records are unavailable until the Lending page is implemented.
            </p>
          )}

          {statusMessage && (
            <p role="status" className="mt-3 text-[11px] text-success">
              {statusMessage}
            </p>
          )}
        </div>

        {showUnsavedWarning && (
          <section
            className="m-4 rounded-[7px] border border-[#f0c978] bg-[#fff9eb] p-4"
            role="alertdialog"
            aria-labelledby="unsaved-warning-title"
            aria-describedby="unsaved-warning-description"
          >
            <h3 id="unsaved-warning-title" className="mb-1 text-[12px] font-bold text-[#805500]">
              Unsaved changes
            </h3>
            <p id="unsaved-warning-description" className="mb-3 text-[11px] text-[#805500]">
              You have changes that haven&apos;t been saved. Do you want to discard them?
            </p>
            <div className="flex flex-wrap justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowUnsavedWarning(false)}
                className="rounded-[5px] border border-input bg-white px-3 py-1.5 text-[10px] font-semibold text-body"
              >
                Keep editing
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowUnsavedWarning(false)
                  onClose()
                }}
                className="rounded-[5px] bg-danger px-3 py-1.5 text-[10px] font-semibold text-white"
              >
                Discard changes
              </button>
            </div>
          </section>
        )}

        <footer className="flex min-h-[70px] shrink-0 items-center gap-[9px] border-t border-[#e8edf3] bg-[#fafbfc] px-[22px] py-[15px] max-[520px]:flex-wrap">
          <button
            type="button"
            onClick={() => onManageDamageFlags(borrower.borrower_id)}
            className="inline-flex min-h-[38px] items-center justify-center gap-[7px] whitespace-nowrap rounded-lg border border-input bg-white px-[15px] text-[12px] font-[650] text-body focus-visible:outline-2 focus-visible:outline-primary focus-visible:outline-offset-[3px] max-[520px]:flex-1"
          >
            Manage Damage Flags
          </button>
          <span className="flex-1 max-[520px]:hidden" />
          {isEditing ? (
            <>
              <button
                type="button"
                disabled={isSaving}
                onClick={() => {
                  setBorrowerNameInput(borrower.borrower_name)
                  setErrorMessage('')
                  setIsEditing(false)
                }}
                className="inline-flex min-h-[38px] items-center justify-center gap-[7px] whitespace-nowrap rounded-lg border border-input bg-white px-[15px] text-[12px] font-[650] text-body focus-visible:outline-2 focus-visible:outline-primary focus-visible:outline-offset-[3px]"
              >
                Cancel
              </button>
              <button
                type="submit"
                form="borrower-edit-form"
                disabled={isSaving || !isDirty}
                className="inline-flex min-h-[38px] items-center justify-center gap-[7px] whitespace-nowrap rounded-lg border border-primary bg-primary px-[15px] text-[12px] font-[650] text-white disabled:cursor-not-allowed disabled:opacity-45 focus-visible:outline-2 focus-visible:outline-primary focus-visible:outline-offset-[3px]"
              >
                {isSaving ? 'Saving…' : 'Save Changes'}
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={handleAttemptClose}
              className="inline-flex min-h-[38px] items-center justify-center gap-[7px] whitespace-nowrap rounded-lg border border-input bg-white px-[15px] text-[12px] font-[650] text-body focus-visible:outline-2 focus-visible:outline-primary focus-visible:outline-offset-[3px] max-[520px]:flex-1"
            >
              Cancel
            </button>
          )}
        </footer>
      </section>
    </div>
  )
}
