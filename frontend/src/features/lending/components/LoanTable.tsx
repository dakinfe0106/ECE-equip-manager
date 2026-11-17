import type { LoanRecord } from '../types'
import LoanStatusBadge from './LoanStatusBadge'

interface LoanTableProps {
  loans: LoanRecord[]
  onSelectLoan: (loan: LoanRecord) => void
}

const headerClassName =
  'border-b border-line bg-page px-[17px] py-[11px] text-left text-[9px] font-bold uppercase tracking-[0.04em] text-muted'

const cellClassName =
  'border-b border-divider px-[17px] py-[13px] text-[11px] text-muted'

export default function LoanTable({
  loans,
  onSelectLoan,
}: LoanTableProps) {
  return (
    <div className="min-h-0 flex-1 overflow-auto">
      <table className="w-full border-collapse text-left whitespace-nowrap">
        <thead>
          <tr>
            <th className={headerClassName} scope="col">
              Asset
            </th>
            <th className={headerClassName} scope="col">
              Borrower
            </th>
            <th className={headerClassName} scope="col">
              Checkout Date
            </th>
            <th className={headerClassName} scope="col">
              Expected Return
            </th>
            <th className={headerClassName} scope="col">
              Status
            </th>
          </tr>
        </thead>

        <tbody>
          {loans.map((loan) => (
            <tr key={loan.loan_id} className="hover:bg-page">
              <td className={cellClassName}>
                <button
                  type="button"
                  onClick={() => onSelectLoan(loan)}
                  className="font-[650] text-body hover:underline focus-visible:outline-2 focus-visible:outline-offset-[3px] focus-visible:outline-primary"
                >
                  {loan.equipment_name}
                </button>
              </td>

              <td className={`${cellClassName} font-[650] text-body`}>
                {loan.borrower_name}
              </td>

              <td className={cellClassName}>
                {loan.checkout_date}
              </td>

              <td className={cellClassName}>
                {loan.expected_return_date}
              </td>

              <td className={cellClassName}>
                <LoanStatusBadge status={loan.status} />
              </td>
            </tr>
          ))}

          {loans.length === 0 && (
            <tr>
              <td
                colSpan={5}
                className="h-[116px] px-[17px] text-center text-[11px] text-subtle whitespace-normal"
              >
                No loans found.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  )
}