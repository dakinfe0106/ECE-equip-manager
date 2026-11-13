
import type { LoanRecord } from '../types'
import LoanStatusBadge from './LoanStatusBadge'

interface LoanDetailsModalProps {
  loan: LoanRecord | null
  onClose: () => void
  onProcessReturn?: (loan: LoanRecord) => void
}

export default function LoanDetailsModal({
  loan,
  onClose,
  onProcessReturn,
}: LoanDetailsModalProps) {
  if (!loan) return null

  const isReturned = loan.status === 'returned'

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 py-6"
      onClick={onClose}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="loan-details-title"
        className="w-full max-w-xl overflow-hidden rounded-xl border border-border bg-white shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between border-b border-border px-6 py-5">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-accent">
              {`Asset ${loan.asset_id} · Loan Record`}
            </p>

            <h2
              id="loan-details-title"
              className="mt-2 text-base font-semibold text-primary"
            >
              {loan.equipment_name}
            </h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close loan details"
            className="text-xl text-secondary hover:text-primary"
          >
            ×
          </button>
        </div>

        {/* Loan details */}
        <div className="space-y-5 px-6 py-6">
          <LoanStatusBadge status={loan.status} />

          <div className="divide-y divide-border">
            <DetailRow label="Borrower" value={loan.borrower_name} />

            <DetailRow
              label="Borrower ID"
              value={String(loan.borrower_id)}
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

          <div className="rounded-lg border border-accent/20 bg-accent/5 p-4">
            <p className="text-xs font-semibold text-primary">
              Permanent transaction record
            </p>

            <p className="mt-1 text-xs text-secondary">
              This loan remains in history after the equipment is returned.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end border-t border-border bg-surface-muted px-6 py-4">
          {!isReturned && (
            <button
              type="button"
              onClick={() => onProcessReturn?.(loan)}
              className="rounded-lg bg-accent px-4 py-2.5 text-xs font-semibold text-white shadow-sm hover:opacity-90"
            >
              Process Return
            </button>
          )}
        </div>
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
      <span className="text-xs text-secondary">{label}</span>

      <span className="text-right text-xs font-medium text-primary">
        {value}
      </span>
    </div>
  )
}
