// @vitest-environment jsdom

import { useState, useRef, type MouseEvent, type FormEvent } from 'react'
import Badge from '../../../components/ui/Badge'
import useModalAccessibility from '../hooks/useModalAccessibility'
import type { BorrowerDetailsLoadState, BorrowerDetailsViewModel } from '../types'
import BorrowerDamageWarningBadge from './BorrowerDamageWarningBadge'

interface BorrowerDetailsModalProps {
  borrower: BorrowerDetailsViewModel
  onClose: () => void
  onViewBorrowingRecords?: (borrowerId: number) => void
  onManageDamageFlags: (borrowerId: number) => void
  detailsLoadState?: BorrowerDetailsLoadState
  onRetryDetails?: () => void
  restoreFocusOnUnmount?: boolean
  onSave?: (updatedData: { first_name: string }) => Promise<void> | void
}

export default function BorrowerDetailsModal({
  borrower,
  onClose,
  onViewBorrowingRecords,
  onManageDamageFlags,
  detailsLoadState,
  onRetryDetails,
  restoreFocusOnUnmount = true,
  onSave,
}: BorrowerDetailsModalProps) {
  const dialogRef = useRef<HTMLDivElement | null>(null)

  useModalAccessibility(dialogRef, onClose, restoreFocusOnUnmount)

  const initialFirstName = borrower.borrower_name.split(' ')[0] || borrower.borrower_name
  const lastName = borrower.borrower_name.split(' ').slice(1).join(' ')

  const [firstName, setFirstName] = useState(initialFirstName)
  const [isSaving, setIsSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  const currentFullName = [firstName.trim(), lastName].filter(Boolean).join(' ')
  const hasChanges = firstName.trim() !== initialFirstName

  const closeOnBackdropClick = (event: MouseEvent<HTMLDivElement>) => {
    if (event.target === event.currentTarget) onClose()
  }

  const handleSave = async (e: FormEvent) => {
    e.preventDefault()
    const trimmed = firstName.trim()
    if (!trimmed) {
      setSaveError('Enter a first name.')
      return
    }
    if (trimmed.length > 255) {
      setSaveError('First name must be 255 characters or fewer.')
      return
    }

    setSaveError(null)
    setIsSaving(true)
    setSuccessMessage(null)

    try {
      if (onSave) {
        await onSave({ first_name: trimmed })
      }
      setSuccessMessage('Borrower updated successfully.')
    } catch (err: unknown) {
      if (err instanceof Error && err.message) {
        setSaveError(err.message)
      } else {
        setSaveError('Could not save borrower changes.')
      }
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
            <div className="flex flex-wrap items-center gap-2 mb-[7px]">
              <p className="m-0 text-[11px] font-[750] uppercase tracking-[0.11em] text-primary">
                Borrower details · UNB ID {borrower.unb_id}
              </p>
              {borrower.is_manual_enrollment && (
                <span className="inline-flex items-center rounded-full bg-[#eef2f7] px-2.5 py-0.5 text-[11px] font-[650] text-[#637083]">
                  Manually added
                </span>
              )}
            </div>
            <h2
              id="borrower-details-title"
              className="m-0 text-[14px] font-[650] tracking-[-0.01em] text-[#202a38]"
            >
              {currentFullName}
            </h2>
          </div>
          <button
            type="button"
            aria-label="Close borrower details"
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

        <form onSubmit={handleSave} className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <div className="min-h-0 flex-1 overflow-y-auto px-[22px] py-[21px]">
            {successMessage && (
              <div
                role="status"
                aria-live="polite"
                className="mb-4 rounded-lg border border-success/20 bg-success-soft px-4 py-3 text-[11px] text-success"
              >
                <p className="font-bold">Borrower updated</p>
                <p className="m-0 mt-0.5">Your changes have been saved successfully.</p>
              </div>
            )}
            {detailsLoadState?.status === 'loading' && (
              <p role="status" className="mb-4 rounded-lg border border-primary/20 bg-primary-soft px-3 py-2 text-[11px] text-primary">
                Loading borrower details…
              </p>
            )}
            {isSaving && (
              <p role="status" className="mb-4 rounded-lg border border-primary/20 bg-primary-soft px-3 py-2 text-[11px] text-primary">
                Saving borrower changes…
              </p>
            )}
            {(detailsLoadState?.status === 'error' || saveError) && (
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-danger/20 bg-danger-soft px-3 py-2">
                <p role="alert" className="m-0 text-[11px] text-danger">
                  {saveError || `Unable to load borrower details. ${(detailsLoadState as any)?.message ?? ''}`}
                </p>
                {detailsLoadState?.status === 'error' && onRetryDetails && (
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
            <div className="mb-5 flex items-center gap-[9px] text-[10px] text-muted" aria-label="Borrower standing">
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
            </div>

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

              <div className="min-w-0">
                <label htmlFor="borrower-first-name" className="mb-[6px] block text-[10px] font-[650] text-body">
                  First name *
                </label>
                <input
                  id="borrower-first-name"
                  type="text"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  maxLength={255}
                  required
                  className="w-full rounded-lg border border-input bg-white px-[11px] py-[10px] text-[12px] text-body outline-none focus:border-primary focus:shadow-[0_0_0_3px_var(--color-primary-soft)]"
                />
              </div>

              <div className="min-w-0">
                <dt className="mb-[6px] text-[10px] font-[650] text-body">Last name · Read only</dt>
                <dd className="m-0 rounded-lg border border-input bg-page px-[11px] py-[10px] text-[12px] text-muted">
                  {lastName || '—'}
                </dd>
              </div>

              <div className="min-w-0">
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
                <dt className="mb-[6px] text-[10px] font-[650] text-body">Eligibility Status *</dt>
                <dd className="m-0 rounded-lg border border-input bg-page px-[11px] py-[10px] text-[12px] text-muted">
                  Eligible information unavailable.
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

            <button
              type="button"
              disabled={!onViewBorrowingRecords}
              aria-describedby={!onViewBorrowingRecords ? 'borrowing-records-unavailable' : undefined}
              onClick={() => onViewBorrowingRecords?.(borrower.borrower_id)}
              className="mt-5 flex w-full items-center justify-between gap-3 rounded-lg border border-primary/25 bg-primary-soft p-[13px] text-left text-[10px] font-[650] text-primary hover:bg-primary-soft focus-visible:outline-2 focus-visible:outline-primary focus-visible:outline-offset-[3px] disabled:cursor-not-allowed disabled:opacity-55"
            >
              View Borrowing Records
              <span aria-hidden="true">›</span>
            </button>
            {!onViewBorrowingRecords && (
              <p id="borrowing-records-unavailable" className="mt-2 text-[10px] text-muted">
                Borrowing records are unavailable until the Lending page is implemented.
              </p>
            )}
          </div>

          <footer className="flex min-h-[70px] shrink-0 items-center gap-[9px] border-t border-[#e8ebf0] bg-[#fafbfc] px-[22px] py-[15px] max-[520px]:flex-wrap">
            <button
              type="button"
              onClick={() => onManageDamageFlags(borrower.borrower_id)}
              className="inline-flex min-h-[38px] items-center justify-center gap-[7px] whitespace-nowrap rounded-lg border border-input bg-white px-[15px] text-[12px] font-[650] text-body focus-visible:outline-2 focus-visible:outline-primary focus-visible:outline-offset-[3px] max-[520px]:flex-1"
            >
              Manage Damage Flags
            </button>
            <span className="flex-1 max-[520px]:hidden" />
            <button
              type="submit"
              disabled={isSaving || !hasChanges}
              className="inline-flex min-h-[38px] items-center justify-center gap-[7px] whitespace-nowrap rounded-lg border border-primary bg-primary px-[15px] text-[12px] font-[650] text-white shadow-[0_4px_10px_rgb(47_111_237_/_22%)] hover:bg-primary-hover focus-visible:outline-2 focus-visible:outline-offset-[3px] focus-visible:outline-primary disabled:opacity-50 disabled:cursor-not-allowed max-[520px]:flex-1"
            >
              {isSaving ? 'Saving…' : 'Save Changes'}
            </button>
          </footer>
        </form>
      </section>
    </div>
  )
}
