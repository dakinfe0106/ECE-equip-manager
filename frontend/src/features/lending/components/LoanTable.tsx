
import type { LoanRecord } from '../types'
import LoanStatusBadge from './LoanStatusBadge'

interface LoanTableProps {
  loans: LoanRecord[]
  onSelectLoan: (loan: LoanRecord) => void
}

export default function LoanTable({
  loans,
  onSelectLoan,
}: LoanTableProps) {
  if (loans.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-white px-6 py-12 text-center">
        <h3 className="text-sm font-semibold text-primary">
          No loans found
        </h3>
        <p className="mt-1 text-xs text-secondary">
          There are no loan records to display.
        </p>
      </div>
    )
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-border bg-white">
      <table className="w-full border-collapse text-left">
        <thead>
          <tr className="border-b border-border bg-surface-muted">
            <th className="px-4 py-3 text-[10px] font-semibold uppercase tracking-wide text-secondary">
              Asset
            </th>
            <th className="px-4 py-3 text-[10px] font-semibold uppercase tracking-wide text-secondary">
              Borrower
            </th>
            <th className="px-4 py-3 text-[10px] font-semibold uppercase tracking-wide text-secondary">
              Checkout Date
            </th>
            <th className="px-4 py-3 text-[10px] font-semibold uppercase tracking-wide text-secondary">
              Expected Return
            </th>
            <th className="px-4 py-3 text-[10px] font-semibold uppercase tracking-wide text-secondary">
              Status
            </th>
          </tr>
        </thead>

        <tbody>
          {loans.map((loan) => (
            <tr
              key={loan.loan_id}
              className="border-b border-border last:border-b-0 transition-colors hover:bg-surface-muted"
            >
              <td className="px-4 py-4">
                <button
                  type="button"
                  onClick={() => onSelectLoan(loan)}
                  className="text-xs font-semibold text-primary hover:text-accent hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent"
                >
                  {loan.equipment_name}
                </button>
              </td>

              <td className="px-4 py-4 text-xs text-secondary">
                {loan.borrower_name}
              </td>

              <td className="px-4 py-4 text-xs text-secondary">
                {loan.checkout_date}
              </td>

              <td className="px-4 py-4 text-xs text-secondary">
                {loan.expected_return_date}
              </td>

              <td className="px-4 py-4">
                <LoanStatusBadge status={loan.status} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
