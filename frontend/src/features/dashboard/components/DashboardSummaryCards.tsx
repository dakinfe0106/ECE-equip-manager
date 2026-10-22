import type { DashboardSummary } from '../api'

interface DashboardSummaryCardsProps {
  summary: DashboardSummary
}

const cards = [
  {
    key: 'total_assets',
    label: 'Total Assets',
  },
  {
    key: 'available_assets',
    label: 'Available Assets',
  },
  {
    key: 'on_loan_assets',
    label: 'Assets On Loan',
  },
  {
    key: 'under_maintenance_assets',
    label: 'Under Maintenance',
  },
] as const

export default function DashboardSummaryCards({
  summary,
}: DashboardSummaryCardsProps) {
  return (
    <section
      className="grid grid-cols-4 gap-4 max-[1100px]:grid-cols-2 max-[700px]:grid-cols-1"
      aria-label="Equipment summary"
    >
      {cards.map((card) => (
        <article
          key={card.key}
          className="rounded-[10px] border border-[#e0e6ef] bg-white px-5 py-5 shadow-[0_3px_12px_rgb(29_49_77_/_4%)]"
        >
          <p className="m-0 text-[12px] font-[600] text-[#758196]">
            {card.label}
          </p>
          <p className="mb-0 mt-3 text-[30px] font-[700] leading-none text-[#1f2b3e]">
            {summary[card.key]}
          </p>
        </article>
      ))}
    </section>
  )
}