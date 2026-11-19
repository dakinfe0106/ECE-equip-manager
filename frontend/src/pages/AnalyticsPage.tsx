import { useState, type ComponentPropsWithoutRef } from 'react'
import { useSearchParams } from 'react-router'
import PageIntro from '../components/ui/PageIntro'
import AnalyticsChart from '../features/analytics/AnalyticsChart'
import ExportReportsDialog from '../features/analytics/ExportReportsDialog'
import type { Filters, Report } from '../features/analytics/api'
import useAnalytics from '../features/analytics/useAnalytics'

const reports: { id: Report; label: string; description: string }[] = [
  { id: 'availability', label: 'Equipment Availability', description: 'Current asset status by equipment type. Availability is a live snapshot and is not filtered by year.' },
  { id: 'utilization', label: 'Equipment Utilization', description: 'Elapsed loan days by equipment type for loans checked out in the selected year.' },
  { id: 'borrowing', label: 'Borrowing Activity', description: 'Monthly checkouts in the selected year.' },
  { id: 'borrowers', label: 'Borrower Activity', description: 'Borrowers grouped by number of loans checked out in the selected year.' },
]
const primary = 'rounded-lg bg-primary px-4 py-2.5 text-xs font-semibold text-white hover:bg-primary-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary'
const secondary = 'rounded-lg border border-input bg-white px-4 py-2.5 text-xs font-semibold text-body hover:bg-page focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary'

function FilterSelect({ children, ...props }: ComponentPropsWithoutRef<'select'>) {
  return <span className="relative mt-1 block rounded-lg border border-input bg-white shadow-[0_1px_2px_rgb(16_24_40_/_4%)] focus-within:border-primary focus-within:shadow-[0_0_0_3px_var(--color-primary-soft)]">
    <select {...props} className="min-h-10 w-full cursor-pointer appearance-none rounded-[7px] border-0 bg-white pr-9 pl-3 text-[11px] font-[650] text-body outline-none">
      {children}
    </select>
    <svg className="pointer-events-none absolute top-1/2 right-[10px] h-4 w-4 -translate-y-1/2 fill-none stroke-subtle stroke-[1.8] [stroke-linecap:round] [stroke-linejoin:round]"
      viewBox="0 0 24 24" aria-hidden="true">
      <path d="m6 9 6 6 6-6" />
    </svg>
  </span>
}

export default function AnalyticsPage() {
  const [params, setParams] = useSearchParams()
  const selected = reports.find(report => report.id === params.get('report')) ?? reports[0]
  const applied: Filters = {
    category_id: params.get('category_id') ?? '',
    equipment_type_id: params.get('equipment_type_id') ?? '',
    year: params.get('year') ?? String(new Date().getFullYear()),
  }
  // Remount the report state on URL changes, including browser back/forward.
  const [retry, setRetry] = useState(0)
  return <AnalyticsContent key={`${params.toString()}:${retry}`} selected={selected} applied={applied}
    onRetry={() => setRetry(value => value + 1)} onNavigate={next => setParams(next)} />
}

function AnalyticsContent({ selected, applied, onNavigate, onRetry }: {
  selected: typeof reports[number]; applied: Filters
  onNavigate: (next: URLSearchParams) => void
  onRetry: () => void
}) {
  const [draft, setDraft] = useState(applied)
  const [exportOpen, setExportOpen] = useState(false)
  const [exportMessage, setExportMessage] = useState('')
  const { options, data, loading, error } = useAnalytics(selected.id, applied)
  const navigate = (report: Report, filters: Filters) => {
    const next = new URLSearchParams({ report })
    for (const [key, value] of Object.entries(filters)) if (value) next.set(key, value)
    onNavigate(next)
  }
  const years = Array.from(new Set([Number(applied.year), ...(options?.years ?? [])]))
    .filter(year => Number.isInteger(year) && year >= 1 && year <= 9999).sort((a, b) => b - a)
  const summary = data?.lending.summary
  const metrics = summary ? [
    ['Transactions', summary.transactions.toLocaleString()],
    ['Total loan days', summary.total_loan_days.toLocaleString()],
    ['Average duration', `${summary.average_duration.toLocaleString()} days`],
    ['Overdue rate', `${summary.overdue_rate.toLocaleString()}%`],
  ] : []

  return (
    <section className="mx-auto w-full max-w-[1500px] px-[34px] pt-[34px] pb-[50px] max-[760px]:px-4 max-[760px]:pt-6" aria-labelledby="page-title">
      <p className="mb-[7px] text-[11px] font-bold tracking-[0.11em] text-primary uppercase">Reporting</p>
      <PageIntro title="Analytics" description="Understand availability, utilization, lending trends, and borrower activity."
        actions={<>
          <button type="button" className={secondary} onClick={() => navigate(selected.id, { category_id: '', equipment_type_id: '', year: String(new Date().getFullYear()) })}>Reset Filters</button>
          <button type="button" className={`${primary} disabled:cursor-not-allowed disabled:opacity-60`}
            disabled={loading || !!error} onClick={() => { setExportMessage(''); setExportOpen(true) }}>Export to Excel</button>
        </>} />
      {exportMessage && <p role="status" className="mb-4 text-sm text-success">{exportMessage}</p>}
      {exportOpen && <ExportReportsDialog currentReport={selected.id} choices={reports} filters={applied} options={options}
        onClose={() => setExportOpen(false)} onDownloaded={() => { setExportOpen(false); setExportMessage('Excel download started.') }} />}
      <nav className="mb-5 flex gap-6 overflow-x-auto border-b border-line" aria-label="Analytics reports">
        {reports.map(report => <button key={report.id} type="button" aria-pressed={selected.id === report.id}
          className={`shrink-0 border-b-2 px-1 py-3 text-xs font-semibold focus-visible:outline-2 focus-visible:outline-primary ${selected.id === report.id ? 'border-primary text-primary' : 'border-transparent text-muted hover:text-body'}`}
          onClick={() => navigate(report.id, applied)}>{report.label}</button>)}
      </nav>
      <section className="overflow-hidden rounded-[11px] border border-line bg-white" aria-labelledby="report-title" aria-busy={loading}>
        <form className="flex flex-wrap items-end gap-3 border-b border-divider p-5" onSubmit={event => {
          event.preventDefault()
          navigate(selected.id, draft)
        }}>
          <label className="min-w-40 flex-1 text-[10px] font-semibold text-muted">Category
            <FilterSelect value={draft.category_id} onChange={event => setDraft({ ...draft, category_id: event.target.value, equipment_type_id: '' })}>
              <option value="">All categories</option>
              {options?.categories.map(category => <option key={category.category_id} value={category.category_id}>{category.name}{category.is_deleted ? ' (archived)' : ''}</option>)}
            </FilterSelect>
          </label>
          <label className="min-w-40 flex-1 text-[10px] font-semibold text-muted">Equipment type
            <FilterSelect value={draft.equipment_type_id} onChange={event => setDraft({ ...draft, equipment_type_id: event.target.value })}>
              <option value="">All equipment types</option>
              {options?.equipment_types.filter(type => !draft.category_id || String(type.category_id) === draft.category_id).map(type => <option key={type.type_id} value={type.type_id}>{type.name}{type.is_deleted ? ' (archived)' : ''}</option>)}
            </FilterSelect>
          </label>
          <label className="w-28 text-[10px] font-semibold text-muted">Checkout year
            <FilterSelect value={draft.year} onChange={event => setDraft({ ...draft, year: event.target.value })}>
              {years.map(year => <option key={year} value={year}>{year}</option>)}
            </FilterSelect>
          </label>
          <button type="submit" className={primary}>Apply Filters</button>
        </form>
        <div className="px-6 pt-5">
          <h2 id="report-title" className="text-sm font-semibold text-heading">{selected.label}</h2>
          <p className="mt-1 text-xs text-muted">{selected.description}</p>
        </div>
        {loading ? <p role="status" className="p-8 text-sm text-muted">Loading analytics…</p>
          : error ? <div className="p-6"><p role="alert" className="mb-3 text-sm text-danger">{error}</p>
            <button type="button" className={secondary} onClick={onRetry}>Try again</button></div>
            : data && <>
              <AnalyticsChart report={selected.id} availability={data.availability} lending={data.lending} />
              <dl className="grid grid-cols-4 border-t border-line max-[760px]:grid-cols-2 max-[520px]:grid-cols-1">
                {metrics.map(([label, value]) => <div key={label} className="border-r border-divider p-5 last:border-r-0">
                  <dt className="text-[10px] text-muted">{label}</dt><dd className="mt-1 text-lg font-semibold text-heading">{value}</dd>
                </div>)}
              </dl>
              <p className="border-t border-divider px-5 py-3 text-[11px] text-muted">
                Summary: loans checked out in {data.lending.year}, as of {data.lending.as_of}. Loan days are elapsed calendar days through return or today; same-day loans count as zero days. Average includes open loans. Overdue rate includes late returns and currently overdue loans. Historical reports include archived records.
              </p>
            </>}
      </section>
    </section>
  )
}
