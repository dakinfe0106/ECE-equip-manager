import { Link } from 'react-router'
import type { DashboardSummary } from '../api'
import { SampleDataBadge } from './DashboardPreviewPanels'

interface DashboardSummaryCardsProps {
  summary: DashboardSummary | null
  showLendingPreview?: boolean
}

const cards = [
  { key: 'total_assets', label: 'Total Assets', canViewDetails: true, tone: 'bg-primary-soft text-primary', icon: 'M7 3h10v18H7z M10 7h4 M10 11h4' },
  { key: 'available_assets', label: 'Available Assets', canViewDetails: false, tone: 'bg-success-soft text-success', icon: 'M7 3h10v18H7z M10 7h4 M10 11h4' },
  { key: 'on_loan_assets', label: 'Assets On Loan', canViewDetails: false, tone: 'bg-violet-soft text-violet', icon: 'M3 8h18l-4-5H7z M5 12v9 M19 12v9 M2 21h20' },
  { key: 'under_maintenance_assets', label: 'Under Maintenance', canViewDetails: false, tone: 'bg-warning-soft text-warning', icon: 'm14.5 6.5-2 2 3 3 2-2a4 4 0 0 1-5 5L7 20l-3-3 5.5-5.5a4 4 0 0 1 5-5Z' },
] as const

export default function DashboardSummaryCards({ summary, showLendingPreview = false }: DashboardSummaryCardsProps) {
  return (
    <section aria-label="Equipment summary" className={`grid gap-[15px] ${showLendingPreview ? 'grid-cols-5 max-[1250px]:grid-cols-3' : 'grid-cols-4'} max-[1050px]:grid-cols-2 max-[620px]:grid-cols-1`}>
      {cards.map((card) => (
        <article key={card.key} aria-label={card.label} className="flex min-h-[115px] min-w-0 items-start gap-[13px] rounded-[11px] border border-line bg-white p-[18px] shadow-[0_1px_2px_rgb(16_24_40_/_2.5%)]">
          <div className={`grid size-[38px] shrink-0 place-items-center rounded-[10px] ${card.tone}`}>
            <svg className="size-5" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d={card.icon} /></svg>
          </div>
          <div className="flex min-w-0 flex-1 flex-col">
            <p className="min-h-[30px] text-[11px] leading-[15px] font-semibold text-muted">{card.label}</p>
            <strong className="mt-0.5 text-[24px] leading-[1.05] font-bold text-heading">{summary ? summary[card.key] : '—'}</strong>
            <div className="mt-auto pt-2 text-[10px] text-subtle">
              {card.canViewDetails ? (
                <Link to="/assets" className="hover:text-primary">View detailed records <span aria-hidden="true">→</span></Link>
              ) : (
                <span aria-disabled="true" title="Detailed view is not available yet">View detailed records <span aria-hidden="true">→</span></span>
              )}
            </div>
          </div>
        </article>
      ))}
      {showLendingPreview && (
        <article aria-label="Overdue Loans" className="flex min-h-[115px] min-w-0 items-start gap-[13px] rounded-[11px] border border-line bg-white p-[18px] shadow-[0_1px_2px_rgb(16_24_40_/_2.5%)]">
          <div className="grid size-[38px] shrink-0 place-items-center rounded-[10px] bg-danger-soft text-danger">
            <svg className="size-5" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M3 8h18l-4-5H7z M5 12v9 M19 12v9 M2 21h20" /></svg>
          </div>
          <div className="min-w-0 flex-1">
            <p className="min-h-[30px] text-[11px] leading-[15px] font-semibold text-muted">Overdue Loans</p>
            <strong className="mt-0.5 block text-[24px] leading-[1.05] font-bold text-heading">8</strong>
            <div className="mt-2"><SampleDataBadge /></div>
            <Link to="/loans" title="Open Lending (in progress)" className="mt-2 block text-[10px] text-subtle hover:text-primary">View detailed records <span aria-hidden="true">→</span></Link>
          </div>
        </article>
      )}
    </section>
  )
}
