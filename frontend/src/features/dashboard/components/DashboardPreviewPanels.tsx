import { Link } from 'react-router'
import LoanStatusBadge from '../../lending/components/LoanStatusBadge'
import type { LoanRecord } from '../../lending/types'
import Panel from '../../../components/ui/Panel'

interface LendingPreviewProps {
  loans: LoanRecord[]
  isLoading: boolean
  errorMessage: string
}

function localDate(date: Date) {
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${date.getFullYear()}-${month}-${day}`
}

export function UpcomingReturnsPreview({ loans, isLoading, errorMessage }: LendingPreviewProps) {
  const today = new Date()
  const lastDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 7)
  const from = localDate(today)
  const through = localDate(lastDay)
  const upcoming = loans
    .filter((loan) => loan.status === 'on_loan' && loan.actual_return_date === null
      && loan.expected_return_date >= from && loan.expected_return_date <= through)
    .sort((a, b) => a.expected_return_date.localeCompare(b.expected_return_date))
    .slice(0, 4)

  const message = isLoading ? 'Loading upcoming returns…'
    : errorMessage ? 'Upcoming returns are unavailable.'
      : upcoming.length === 0 ? 'No upcoming returns in the next 7 days.' : ''

  return (
    <Panel label="Upcoming returns" className="min-w-0 overflow-hidden">
      <div className="flex min-h-[80px] items-start justify-between gap-3 border-b border-divider px-5 py-[18px]">
        <div>
          <h2 className="text-sm font-semibold text-heading">Upcoming returns</h2>
          <p className="mt-1 text-[11px] text-subtle">Active loans due within seven days.</p>
        </div>
      </div>
      {message ? (
        <p className="px-[18px] py-4 text-xs text-muted">{message}</p>
      ) : (
        <ul className="divide-y divide-divider">
          {upcoming.map((loan) => (
            <li key={loan.loan_id} className="flex items-start justify-between gap-4 px-[18px] py-4">
              <div className="min-w-0">
                <p className="text-xs font-bold text-body">{loan.asset_identifier}</p>
                <p className="mt-1 text-[10px] text-subtle">{loan.borrower_name}</p>
              </div>
              <div className="shrink-0 text-right text-[10px] font-semibold">
                <time dateTime={loan.expected_return_date} className="text-body">{loan.expected_return_date}</time>
              </div>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  )
}

export function RecentLendingPreview({ loans, isLoading, errorMessage }: LendingPreviewProps) {
  // The Lending API returns rows in ascending loan ID order.
  const recent = loans.slice(-4).reverse()
  const message = isLoading ? 'Loading recent lending activity…'
    : errorMessage ? 'Recent lending activity is unavailable.'
      : recent.length === 0 ? 'No lending activity yet.' : ''

  return (
    <Panel label="Recent lending activity" className="mt-[17px] overflow-hidden">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-divider px-5 py-[18px]">
        <h2 className="text-sm font-semibold text-heading">Recent lending activity</h2>
        <Link to="/loans" className="text-[11px] font-semibold text-primary hover:text-primary-hover">View all <span aria-hidden="true">›</span></Link>
      </div>
      {message ? (
        <p className="px-[18px] py-4 text-xs text-muted">{message}</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] border-collapse text-left">
            <caption className="sr-only">Recent lending records</caption>
            <thead className="bg-page text-[9px] font-bold text-subtle uppercase">
              <tr>{['Asset', 'Borrower', 'Checkout date', 'Expected return', 'Status'].map((label) => <th key={label} scope="col" className="px-[18px] py-[13px]">{label}</th>)}</tr>
            </thead>
            <tbody className="divide-y divide-divider border-t border-divider text-[11px]">
              {recent.map((loan) => (
                <tr key={loan.loan_id}>
                  <th scope="row" className="px-[18px] py-4 font-bold text-body">{loan.asset_identifier}</th>
                  <td className="px-[18px] py-4 text-muted">{loan.borrower_name}</td>
                  <td className="px-[18px] py-4 text-muted"><time dateTime={loan.checkout_date}>{loan.checkout_date}</time></td>
                  <td className="px-[18px] py-4 text-muted"><time dateTime={loan.expected_return_date}>{loan.expected_return_date}</time></td>
                  <td className="px-[18px] py-4"><LoanStatusBadge status={loan.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Panel>
  )
}
