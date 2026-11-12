import Panel from '../../../components/ui/Panel'
import type { DashboardSummary } from '../api'

interface EquipmentAvailabilityProps {
  summary: DashboardSummary | null
  isLoading: boolean
}

export default function EquipmentAvailability({ summary, isLoading }: EquipmentAvailabilityProps) {
  const retired = summary ? Math.max(0, summary.total_assets - summary.available_assets - summary.on_loan_assets - summary.under_maintenance_assets) : 0
  const statuses = [
    { label: 'Available', count: summary?.available_assets ?? 0, color: 'var(--color-chart-available)' },
    { label: 'On Loan', count: summary?.on_loan_assets ?? 0, color: 'var(--color-primary)' },
    { label: 'Maintenance', count: summary?.under_maintenance_assets ?? 0, color: 'var(--color-chart-maintenance)' },
    { label: 'Retired', count: retired, color: 'var(--color-chart-retired)' },
  ]
  let end = 0
  const segments = statuses.map((status) => {
    const start = end
    end += summary?.total_assets ? status.count / summary.total_assets * 100 : 0
    return `${status.color} ${start}% ${end}%`
  })
  const background = summary?.total_assets ? `conic-gradient(${segments.join(', ')})` : 'var(--color-neutral-soft)'

  return (
    <Panel label="Equipment availability" className="min-w-0 overflow-hidden">
      <div className="min-h-[80px] border-b border-divider px-5 py-[18px]">
        <h2 className="text-sm font-semibold text-heading">Equipment availability</h2>
        <p className="mt-1 text-[11px] text-subtle">Current status distribution from inventory.</p>
      </div>
      {summary ? (
        <div className="flex min-h-[240px] flex-wrap items-center gap-8 px-7 py-6">
          <div role="img" aria-label={`Equipment availability: ${summary.total_assets} assets`} className="grid size-[144px] shrink-0 place-items-center rounded-full" style={{ background }}>
            <div aria-hidden="true" className="flex size-[104px] flex-col items-center justify-center rounded-full bg-white">
              <strong className="text-[24px] font-bold text-heading">{summary.total_assets}</strong>
              <span className="mt-1 text-[10px] text-subtle">assets</span>
            </div>
          </div>
          <dl className="min-w-[160px] flex-1 space-y-4 text-[11px]">
            {statuses.map((status) => (
              <div key={status.label} className="flex items-center justify-between gap-8">
                <dt className="flex items-center gap-[10px] text-muted"><span aria-hidden="true" className="size-[7px] rounded-xs" style={{ background: status.color }} />{status.label}</dt>
                <dd className="font-bold text-body">{status.count}</dd>
              </div>
            ))}
          </dl>
          {summary.total_assets === 0 && <p className="w-full text-[11px] text-subtle">No assets to display.</p>}
        </div>
      ) : (
        <p className="flex min-h-[240px] items-center justify-center px-5 text-xs text-muted">{isLoading ? 'Loading availability...' : 'Availability data is unavailable.'}</p>
      )}
    </Panel>
  )
}
