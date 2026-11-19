import type { AvailabilityRow, LendingReport, Report } from './api'

const segments = [
  { key: 'available', label: 'Available', color: 'bg-chart-available' },
  { key: 'on_loan', label: 'On loan', color: 'bg-primary' },
  { key: 'under_maintenance', label: 'Under maintenance', color: 'bg-chart-maintenance' },
  { key: 'retired', label: 'Retired', color: 'bg-chart-retired' },
] as const

export default function AnalyticsChart({ report, availability, lending }: {
  report: Report; availability: AvailabilityRow[]; lending: LendingReport
}) {
  const rows = report === 'availability' ? availability : lending.rows
  const max = Math.max(1, ...lending.rows.map(row => row.value))
  const unit = report === 'utilization' ? 'loan days' : report === 'borrowers' ? 'borrowers' : 'loans'
  if (!rows.length || (report !== 'availability' && !lending.summary.transactions)) {
    return <p className="p-8 text-center text-sm text-muted">No data matches these filters.</p>
  }
  return (
    <div className="p-6">
      {report === 'availability' && <ul className="mb-6 flex flex-wrap gap-4 text-[11px] text-muted" aria-label="Asset status legend">
        {segments.map(segment => <li key={segment.key} className="flex items-center gap-2">
          <span className={`h-2.5 w-2.5 rounded-sm ${segment.color}`} />{segment.label}
        </li>)}
      </ul>}
      <div className="grid gap-5">
        {report === 'availability' ? availability.map(row => (
          <div key={row.label} className="grid grid-cols-[120px_1fr] items-center gap-4 max-[520px]:grid-cols-1">
            <span className="text-[11px] text-muted">{row.label}</span>
            <div>
              <div className="flex h-[22px] overflow-hidden rounded-[5px] bg-neutral-soft" aria-hidden="true">
                {segments.map(segment => <span key={segment.key} className={segment.color}
                  style={{ width: `${100 * row[segment.key] / Math.max(row.total, 1)}%` }} />)}
              </div>
              <p className="mt-1 text-[10px] text-muted">
                {segments.map(segment => `${segment.label}: ${row[segment.key]}`).join(' · ')}
              </p>
            </div>
          </div>
        )) : lending.rows.map(row => (
          <div key={row.label} className="grid grid-cols-[120px_1fr_90px] items-center gap-4 max-[520px]:grid-cols-[70px_1fr_70px]">
            <span className="text-[11px] text-muted">{row.label}</span>
            <div className="h-[22px] overflow-hidden rounded-[5px] bg-neutral-soft" aria-hidden="true">
              <div className="h-full rounded-[5px] bg-primary" style={{ width: `${100 * row.value / max}%` }} />
            </div>
            <span className="text-right text-[11px] text-body">{row.value.toLocaleString()} {unit}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
