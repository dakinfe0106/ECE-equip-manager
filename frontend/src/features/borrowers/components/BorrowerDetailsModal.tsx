import { useRef, type MouseEvent } from 'react'
import Badge from '../../../components/ui/Badge'
import useModalAccessibility from '../hooks/useModalAccessibility'
import type { BorrowerDetailsViewModel } from '../types'

interface BorrowerDetailsModalProps {
  borrower: BorrowerDetailsViewModel
  onClose: () => void
  onViewBorrowingRecords: (borrowerId: number) => void
  onManageDamageFlags: (borrowerId: number) => void
  restoreFocusOnUnmount?: boolean
}

export default function BorrowerDetailsModal({
  borrower,
  onClose,
  onViewBorrowingRecords,
  onManageDamageFlags,
  restoreFocusOnUnmount = true,
}: BorrowerDetailsModalProps) {
  const dialogRef = useRef<HTMLDivElement | null>(null)

  useModalAccessibility(dialogRef, onClose, restoreFocusOnUnmount)

  const closeOnBackdropClick = (event: MouseEvent<HTMLDivElement>) => {
    if (event.target === event.currentTarget) onClose()
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

        <div className="min-h-0 flex-1 overflow-y-auto px-[22px] py-[21px]">
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

            <div className="min-w-0 sm:col-span-2">
              <dt className="mb-[6px] text-[10px] font-[650] text-body">Negligent damage flag · Read only</dt>
              <dd className="m-0">
            {borrower.negligent_damage_flag === undefined ? (
                  <p className="m-0 rounded-lg border border-input bg-page px-[11px] py-[10px] text-[11px] text-muted">
                    Damage flag information unavailable.
                  </p>
            ) : (
                  <p className="m-0 rounded-lg border border-input bg-page px-[11px] py-[10px] text-[11px] text-body">
                {borrower.negligent_damage_flag ? 'Flag recorded' : 'No flag recorded'}
                  </p>
            )}
              </dd>
            </div>
          </dl>

          <button
            type="button"
            onClick={() => onViewBorrowingRecords(borrower.borrower_id)}
            className="mt-5 flex w-full items-center justify-between gap-3 rounded-lg border border-primary/20 bg-primary-soft p-[13px] text-left text-[10px] font-[650] text-primary hover:bg-primary-soft focus-visible:outline-2 focus-visible:outline-primary focus-visible:outline-offset-[3px]"
          >
            View Borrowing Records
            <span aria-hidden="true">›</span>
          </button>
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
            type="button"
            onClick={onClose}
            className="inline-flex min-h-[38px] items-center justify-center gap-[7px] whitespace-nowrap rounded-lg border border-input bg-white px-[15px] text-[12px] font-[650] text-body focus-visible:outline-2 focus-visible:outline-primary focus-visible:outline-offset-[3px] max-[520px]:flex-1"
          >
            Cancel
          </button>
        </footer>
      </section>
    </div>
  )
}
