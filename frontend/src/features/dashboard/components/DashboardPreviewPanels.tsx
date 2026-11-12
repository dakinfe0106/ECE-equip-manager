import { Link } from 'react-router'
import Badge from '../../../components/ui/Badge'
import Panel from '../../../components/ui/Panel'

// Synthetic preview content only. These are not server records.
const sampleLoans = [
  { asset: 'Demo Laptop', borrower: 'Demo Borrower 1', checkoutDaysAgo: 10, dueInDays: 1, status: 'Active' },
  { asset: 'Demo Spectrum Analyzer', borrower: 'Demo Borrower 2', checkoutDaysAgo: 14, dueInDays: 3, status: 'Active' },
  { asset: 'Demo Thermal Camera', borrower: 'Demo Borrower 3', checkoutDaysAgo: 20, dueInDays: -2, status: 'Overdue' },
  { asset: 'Demo Network Tester', borrower: 'Demo Borrower 4', checkoutDaysAgo: 30, dueInDays: -7, status: 'Completed' },
] as const

function sampleDate(daysFromToday: number) {
  const today = new Date()
  const date = new Date(today.getFullYear(), today.getMonth(), today.getDate() + daysFromToday)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

export function SampleDataBadge() {
  return <span className="shrink-0 rounded-full bg-neutral-soft px-2 py-1 text-[9px] font-semibold text-neutral">Sample data</span>
}

export function UpcomingReturnsPreview() {
  return (
    <Panel label="Upcoming returns" className="min-w-0 overflow-hidden">
      <div className="flex min-h-[80px] items-start justify-between gap-3 border-b border-divider px-5 py-[18px]">
        <div>
          <h2 className="text-sm font-semibold text-heading">Upcoming returns</h2>
          <p className="mt-1 text-[11px] text-subtle">Example loans due within seven days.</p>
        </div>
        <SampleDataBadge />
      </div>
      <ul className="divide-y divide-divider">
        {sampleLoans.filter((loan) => loan.status === 'Active').map((loan) => (
          <li key={loan.asset} className="flex items-start justify-between gap-4 px-[18px] py-4">
            <div className="min-w-0">
              <p className="text-xs font-bold text-body">{loan.asset}</p>
              <p className="mt-1 text-[10px] text-subtle">{loan.borrower}</p>
            </div>
            <div className="shrink-0 text-right text-[10px] font-semibold">
              <time dateTime={sampleDate(loan.dueInDays)} className="text-body">{sampleDate(loan.dueInDays)}</time>
              <p className="mt-1 text-primary">{loan.dueInDays === 1 ? 'Tomorrow' : `In ${loan.dueInDays} days`}</p>
            </div>
          </li>
        ))}
      </ul>
      <p className="px-[18px] py-4 text-[10px] text-subtle">Preview only. Lending records are not connected yet.</p>
    </Panel>
  )
}

export function RecentLendingPreview() {
  return (
    <Panel label="Recent lending activity" className="mt-[17px] overflow-hidden">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-divider px-5 py-[18px]">
        <div>
          <h2 className="text-sm font-semibold text-heading">Recent lending activity</h2>
          <p className="mt-1 text-[11px] text-subtle">Example transactions. Record details are still in progress.</p>
        </div>
        <div className="flex items-center gap-4">
          <SampleDataBadge />
          <Link to="/loans" title="Open Lending (in progress)" className="text-[11px] font-semibold text-primary hover:text-primary-hover">View all <span aria-hidden="true">›</span></Link>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] border-collapse text-left">
          <caption className="sr-only">Sample lending transactions, not live records</caption>
          <thead className="bg-page text-[9px] font-bold text-subtle uppercase">
            <tr>{['Asset', 'Borrower', 'Checkout date', 'Expected return', 'Status'].map((label) => <th key={label} scope="col" className="px-[18px] py-[13px]">{label}</th>)}</tr>
          </thead>
          <tbody className="divide-y divide-divider border-t border-divider text-[11px]">
            {sampleLoans.map((loan) => (
              <tr key={loan.asset}>
                <th scope="row" className="px-[18px] py-4 font-bold text-body">{loan.asset}</th>
                <td className="px-[18px] py-4 text-muted">{loan.borrower}</td>
                <td className="px-[18px] py-4 text-muted"><time dateTime={sampleDate(-loan.checkoutDaysAgo)}>{sampleDate(-loan.checkoutDaysAgo)}</time></td>
                <td className="px-[18px] py-4 text-muted"><time dateTime={sampleDate(loan.dueInDays)}>{sampleDate(loan.dueInDays)}</time></td>
                <td className="px-[18px] py-4"><Badge tone={loan.status === 'Active' ? 'success' : loan.status === 'Overdue' ? 'danger' : 'neutral'}>{loan.status}</Badge></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Panel>
  )
}
