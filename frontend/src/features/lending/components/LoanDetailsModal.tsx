
import type { LoanRecord } from '../types'
import LoanStatusBadge from './LoanStatusBadge'

interface LoanDetailsModalProps {
  loan: LoanRecord | null
  onClose: () => void
  onExtendLoan?: (loan: LoanRecord) => void
  onProcessReturn?: (loan: LoanRecord) => void
  onCreateMaintenance?: (loan: LoanRecord) => void
}

export default function LoanDetailsModal({
  loan,
  onClose,
  onExtendLoan,
  onProcessReturn,
  onCreateMaintenance,
}: LoanDetailsModalProps) {
  if (!loan) return null

  const isReturned = loan.status === 'returned'
  const canCreateMaintenance =
    isReturned &&
    loan.return_condition === 'Damaged' &&
    Boolean(onCreateMaintenance)
  const isActive = loan.status === 'on_loan' || loan.status === 'overdue'

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 py-6"
      onClick={onClose}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="loan-details-title"
        className="w-full max-w-xl overflow-hidden rounded-[10px] border border-line bg-white shadow-[0_24px_60px_rgb(15_27_45_/_28%)]"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="flex items-start justify-between gap-3 border-b border-divider px-6 py-5">
          <div>
            <p className="mb-[6px] text-[9px] font-bold uppercase tracking-[1px] text-muted">
              {`${loan.asset_identifier} · Loan Record`}
            </p>

            <h2
              id="loan-details-title"
              className="m-0 text-[15px] font-[650] text-heading"
            >
              {loan.equipment_name}
            </h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close loan details"
            className="rounded px-2 py-1 text-[18px] text-muted hover:bg-page hover:text-body focus-visible:outline-2 focus-visible:outline-primary"
          >
            ×
          </button>
        </header>

        <div className="px-6 py-5">
          <div className="mb-4">
            <LoanStatusBadge status={loan.status} />
          </div>

          <div className="divide-y divide-divider">
            <DetailRow
              label="Borrower"
              value={loan.borrower_name}
            />

            <DetailRow
              label="UNB ID"
              value={loan.borrower_unb_id}
            />

            <DetailRow
              label="Checkout date"
              value={loan.checkout_date}
            />

            <DetailRow
              label="Expected return"
              value={loan.expected_return_date}
            />

            {isReturned && (
              <>
                <DetailRow
                  label="Actual return date"
                  value={loan.actual_return_date ?? 'Not recorded'}
                />

                <DetailRow
                  label="Return condition"
                  value={loan.return_condition ?? 'Not recorded'}
                />
              </>
            )}
          </div>
          <div className="mt-5 rounded-lg border border-line bg-page p-4">
            <p className="m-0 text-[11px] font-semibold text-body">
              Permanent transaction record
            </p>

            <p className="mt-1 mb-0 text-[11px] text-muted">
              This loan remains in history after the equipment is returned.
            </p>
          </div>
        </div>

        {isActive && (
          <footer className="flex flex-wrap justify-end gap-2 border-t border-divider px-6 py-4">
            {loan.status === 'on_loan' && onExtendLoan && (
              <button
                type="button"
                onClick={() => onExtendLoan(loan)}
                className="rounded-md border border-primary bg-white px-3 py-2 text-xs font-semibold text-primary hover:bg-page"
              >
                Extend Loan
              </button>
            )}

            <button
              type="button"
              onClick={() => onProcessReturn?.(loan)}
              disabled={!onProcessReturn}
              className="rounded-md bg-primary px-3 py-2 text-xs font-semibold text-white hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-50"
            >
              Process Return
            </button>
          </footer>
        )}

        {canCreateMaintenance && (
          <footer className="flex justify-end border-t border-divider px-6 py-4">
            <button
              type="button"
              onClick={() => onCreateMaintenance?.(loan)}
              className="rounded-md bg-primary px-3 py-2 text-xs font-semibold text-white hover:bg-primary-hover"
            >
              Create Maintenance Record
            </button>
          </footer>
        )}
      </section>
    </div>
  )
}

interface DetailRowProps {
  label: string
  value: string
}

function DetailRow({ label, value }: DetailRowProps) {
  return (
    <div className="flex items-center justify-between gap-4 py-3">
      <span className="text-[11px] text-muted">
        {label}
      </span>

      <span className="text-right text-[11px] font-[650] text-body">
        {value}
      </span>
    </div>
  )
}
