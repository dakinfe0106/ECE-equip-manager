import { useEffect, useState, type FormEvent, type ReactNode } from 'react'
import PageIntro from '../components/ui/PageIntro'
import Panel from '../components/ui/Panel'
import {
  downloadAnalyticsReport,
  fetchAnalyticsReport,
  fetchAnalyticsYears,
  type AnalyticsFilters,
  type AnalyticsReport,
  type AnalyticsView,
  type AvailabilityRow,
  type BorrowerActivityRow,
  type BorrowingSummary,
  type UtilizationRow,
} from '../features/analytics/api'
import {
  fetchCategories,
  fetchEquipmentTypes,
  type CategoryOption,
  type EquipmentTypeOption,
} from '../features/assets/api'

const tabs: { id: AnalyticsView; label: string }[] = [
  { id: 'availability', label: 'Equipment Availability' },
  { id: 'utilization', label: 'Equipment Utilization' },
  { id: 'borrowing', label: 'Borrowing Activity' },
  { id: 'borrowers', label: 'Borrower Activity' },
]

function getErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message) return error.message
  return 'Could not load analytics. Please try again.'
}

function countLabel(value: number): string {
  return value.toLocaleString()
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-line bg-white px-4 py-3">
      <p className="m-0 text-[11px] text-muted">{label}</p>
      <p className="mt-1 mb-0 text-xl font-bold text-heading">{countLabel(value)}</p>
    </div>
  )
}

function TableFrame({ children }: { children: ReactNode }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-left text-xs">
        {children}
      </table>
    </div>
  )
}

function TableHead({ children }: { children: ReactNode }) {
  return (
    <thead className="bg-page text-[10px] font-semibold text-muted">
      <tr>{children}</tr>
    </thead>
  )
}

function HeaderCell({ children }: { children: ReactNode }) {
  return <th className="whitespace-nowrap px-3 py-3">{children}</th>
}

function DataCell({ children }: { children: ReactNode }) {
  return <td className="border-t border-divider px-3 py-3 text-body">{children}</td>
}

function EmptyReport({ children = 'No records match these filters.' }: { children?: string }) {
  return <p className="m-0 px-4 py-10 text-center text-xs text-muted">{children}</p>
}

function AvailabilityTable({ rows }: { rows: AvailabilityRow[] }) {
  if (rows.length === 0) return <EmptyReport />
  return (
    <TableFrame>
      <TableHead>
        <HeaderCell>Category</HeaderCell>
        <HeaderCell>Equipment type</HeaderCell>
        <HeaderCell>Total</HeaderCell>
        <HeaderCell>Available</HeaderCell>
        <HeaderCell>On loan</HeaderCell>
        <HeaderCell>Under maintenance</HeaderCell>
        <HeaderCell>Retired</HeaderCell>
      </TableHead>
      <tbody>
        {rows.map((row) => {
          const segmentWidth = (count: number) =>
            row.total_assets === 0 ? '0%' : `${(count / row.total_assets) * 100}%`
          return (
            <tr key={row.equipment_type_id}>
              <DataCell>{row.category_name}</DataCell>
              <DataCell>
                <div className="min-w-36">
                  <span className="font-semibold">{row.equipment_type_name}</span>
                  <span
                    className="mt-1 flex h-2 w-full overflow-hidden rounded-full bg-neutral-soft"
                    role="img"
                    aria-label={`${row.available_assets} available, ${row.on_loan_assets} on loan, ${row.under_maintenance_assets} under maintenance, ${row.retired_assets} retired`}
                  >
                    <span className="bg-success" style={{ width: segmentWidth(row.available_assets) }} />
                    <span className="bg-primary" style={{ width: segmentWidth(row.on_loan_assets) }} />
                    <span className="bg-warning" style={{ width: segmentWidth(row.under_maintenance_assets) }} />
                    <span className="bg-subtle" style={{ width: segmentWidth(row.retired_assets) }} />
                  </span>
                </div>
              </DataCell>
              <DataCell>{countLabel(row.total_assets)}</DataCell>
              <DataCell>{countLabel(row.available_assets)}</DataCell>
              <DataCell>{countLabel(row.on_loan_assets)}</DataCell>
              <DataCell>{countLabel(row.under_maintenance_assets)}</DataCell>
              <DataCell>{countLabel(row.retired_assets)}</DataCell>
            </tr>
          )
        })}
      </tbody>
    </TableFrame>
  )
}

function UtilizationTable({ rows }: { rows: UtilizationRow[] }) {
  if (rows.length === 0) return <EmptyReport />
  const maxLoans = Math.max(...rows.map((row) => row.loan_count))
  return (
    <TableFrame>
      <TableHead>
        <HeaderCell>Asset ID</HeaderCell>
        <HeaderCell>Equipment</HeaderCell>
        <HeaderCell>Type</HeaderCell>
        <HeaderCell>Loans</HeaderCell>
        <HeaderCell>Total loan days</HeaderCell>
        <HeaderCell>Average days</HeaderCell>
      </TableHead>
      <tbody>
        {rows.map((row) => (
          <tr key={row.asset_id}>
            <DataCell>{row.asset_identifier}</DataCell>
            <DataCell>
              <span className="font-semibold">{row.asset_name}</span>
              {row.loan_count > 0 && row.loan_count === maxLoans && (
                <span className="ml-2 rounded-full bg-primary-soft px-2 py-1 text-[9px] text-primary">
                  Most borrowed
                </span>
              )}
              {row.loan_count === 0 && (
                <span className="ml-2 rounded-full bg-neutral-soft px-2 py-1 text-[9px] text-muted">
                  Not borrowed
                </span>
              )}
            </DataCell>
            <DataCell>{row.equipment_type_name}</DataCell>
            <DataCell>{countLabel(row.loan_count)}</DataCell>
            <DataCell>{countLabel(row.total_loan_days)}</DataCell>
            <DataCell>{row.average_loan_days?.toFixed(2) ?? '—'}</DataCell>
          </tr>
        ))}
      </tbody>
    </TableFrame>
  )
}

function BorrowersTable({ rows }: { rows: BorrowerActivityRow[] }) {
  if (rows.length === 0) return <EmptyReport>No borrowers match this search.</EmptyReport>
  return (
    <TableFrame>
      <TableHead>
        <HeaderCell>Borrower ID</HeaderCell>
        <HeaderCell>UNB ID</HeaderCell>
        <HeaderCell>Borrower name</HeaderCell>
        <HeaderCell>Total loans</HeaderCell>
        <HeaderCell>Completed</HeaderCell>
        <HeaderCell>Active</HeaderCell>
        <HeaderCell>Overdue</HeaderCell>
        <HeaderCell>Damaged returns</HeaderCell>
      </TableHead>
      <tbody>
        {rows.map((row) => (
          <tr key={row.borrower_id}>
            <DataCell>{row.borrower_id}</DataCell>
            <DataCell>{row.unb_id}</DataCell>
            <DataCell>{`${row.first_name} ${row.last_name}`.trim()}</DataCell>
            <DataCell>{countLabel(row.total_loans)}</DataCell>
            <DataCell>{countLabel(row.completed_loans)}</DataCell>
            <DataCell>{countLabel(row.active_loans)}</DataCell>
            <DataCell>{countLabel(row.overdue_loans)}</DataCell>
            <DataCell>{countLabel(row.damaged_returns)}</DataCell>
          </tr>
        ))}
      </tbody>
    </TableFrame>
  )
}

function BorrowingSummaryCards({ report }: { report: BorrowingSummary }) {
  return (
    <div className="grid grid-cols-2 gap-3 p-4 sm:grid-cols-3 xl:grid-cols-6">
      <StatCard label="Total loans" value={report.total_loans} />
      <StatCard label="Completed" value={report.completed_loans} />
      <StatCard label="Active" value={report.active_loans} />
      <StatCard label="Overdue" value={report.overdue_loans} />
      <StatCard label="Returned intact" value={report.intact_returns} />
      <StatCard label="Returned damaged" value={report.damaged_returns} />
    </div>
  )
}

function isBorrowingSummary(report: AnalyticsReport): report is BorrowingSummary {
  return 'total_loans' in report
}

export default function AnalyticsPage() {
  const [view, setView] = useState<AnalyticsView>('availability')
  const [draftFilters, setDraftFilters] = useState<AnalyticsFilters>({})
  const [filters, setFilters] = useState<AnalyticsFilters>({})
  const [categories, setCategories] = useState<CategoryOption[]>([])
  const [equipmentTypes, setEquipmentTypes] = useState<EquipmentTypeOption[]>([])
  const [years, setYears] = useState<number[]>([])
  const [loadedReport, setLoadedReport] = useState<{
    requestKey: string
    report?: AnalyticsReport
    errorMessage?: string
  } | null>(null)
  const [isLoadingOptions, setIsLoadingOptions] = useState(true)
  const [isExporting, setIsExporting] = useState(false)
  const [exportError, setExportError] = useState('')
  const [optionsError, setOptionsError] = useState('')
  const requestKey = `${view}:${filters.year ?? ''}:${filters.categoryId ?? ''}:${filters.equipmentTypeId ?? ''}:${filters.search ?? ''}`
  const hasCurrentReport = loadedReport?.requestKey === requestKey
  const report = hasCurrentReport ? loadedReport.report ?? null : null
  const isLoading = !hasCurrentReport
  const errorMessage = hasCurrentReport ? loadedReport.errorMessage ?? '' : ''

  useEffect(() => {
    let isCurrent = true
    Promise.all([fetchCategories(), fetchEquipmentTypes(), fetchAnalyticsYears()])
      .then(([categoryOptions, typeOptions, availableYears]) => {
        if (!isCurrent) return
        setCategories(categoryOptions)
        setEquipmentTypes(typeOptions)
        setYears(availableYears)
      })
      .catch((error: unknown) => {
        if (isCurrent) setOptionsError(getErrorMessage(error))
      })
      .finally(() => {
        if (isCurrent) setIsLoadingOptions(false)
      })

    return () => {
      isCurrent = false
    }
  }, [])

  useEffect(() => {
    let isCurrent = true
    fetchAnalyticsReport(view, filters)
      .then((data) => {
        if (isCurrent) setLoadedReport({ requestKey, report: data })
      })
      .catch((error: unknown) => {
        if (isCurrent) {
          setLoadedReport({ requestKey, errorMessage: getErrorMessage(error) })
        }
      })

    return () => {
      isCurrent = false
    }
  }, [filters, requestKey, view])

  function applyFilters(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setFilters(draftFilters)
  }

  function resetFilters() {
    setDraftFilters({})
    setFilters({})
  }

  async function exportReport() {
    setIsExporting(true)
    setExportError('')
    try {
      await downloadAnalyticsReport(view, filters)
    } catch (error) {
      setExportError(getErrorMessage(error))
    } finally {
      setIsExporting(false)
    }
  }

  let reportContent: ReactNode = null
  if (report && view === 'availability' && 'results' in report) {
    reportContent = <AvailabilityTable rows={report.results as AvailabilityRow[]} />
  } else if (report && view === 'utilization' && 'results' in report) {
    reportContent = <UtilizationTable rows={report.results as UtilizationRow[]} />
  } else if (report && view === 'borrowers' && 'results' in report) {
    reportContent = <BorrowersTable rows={report.results as BorrowerActivityRow[]} />
  } else if (report && view === 'borrowing' && isBorrowingSummary(report)) {
    reportContent = <BorrowingSummaryCards report={report} />
  }

  return (
    <section
      className="mx-auto w-full max-w-[1500px] px-[34px] pt-[34px] pb-[50px] max-[760px]:px-4 max-[760px]:pt-6"
      aria-labelledby="page-title"
    >
      <PageIntro
        title="Analytics"
        description="Understand equipment availability, utilization, lending, and borrower activity."
        actions={(
          <button
            type="button"
            onClick={() => { void exportReport() }}
            disabled={isLoading || isExporting || !report}
            className="min-h-9 rounded-lg bg-primary px-4 text-[11px] font-semibold text-white hover:bg-primary-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isExporting ? 'Preparing Excel…' : 'Export to Excel'}
          </button>
        )}
      />

      <div className="mb-4 flex gap-2 overflow-x-auto border-b border-line" role="tablist" aria-label="Analytics report">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            id={`analytics-tab-${tab.id}`}
            role="tab"
            aria-selected={view === tab.id}
            aria-controls="analytics-panel"
            onClick={() => setView(tab.id)}
            className={`min-h-10 whitespace-nowrap border-b-2 px-4 text-[11px] font-semibold ${view === tab.id ? 'border-primary text-primary' : 'border-transparent text-muted hover:text-body'}`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <Panel>
        <form
          className="flex flex-wrap items-end gap-3 border-b border-divider p-4"
          onSubmit={applyFilters}
        >
          <label className="grid gap-1 text-[10px] font-semibold text-body">
            Category
            <select
              value={draftFilters.categoryId ?? ''}
              onChange={(event) => {
                const categoryId = event.target.value ? Number(event.target.value) : null
                setDraftFilters((current) => ({
                  ...current,
                  categoryId,
                  equipmentTypeId: current.equipmentTypeId && categoryId
                    && equipmentTypes.some((type) => type.type_id === current.equipmentTypeId && type.category_id === categoryId)
                    ? current.equipmentTypeId
                    : null,
                }))
              }}
              className="min-h-9 min-w-40 rounded-lg border border-input bg-white px-3 text-xs font-normal"
              disabled={isLoadingOptions}
            >
              <option value="">All categories</option>
              {categories.map((category) => (
                <option key={category.category_id} value={category.category_id}>{category.name}</option>
              ))}
            </select>
          </label>

          <label className="grid gap-1 text-[10px] font-semibold text-body">
            Equipment type
            <select
              value={draftFilters.equipmentTypeId ?? ''}
              onChange={(event) => setDraftFilters((current) => ({
                ...current,
                equipmentTypeId: event.target.value ? Number(event.target.value) : null,
              }))}
              className="min-h-9 min-w-44 rounded-lg border border-input bg-white px-3 text-xs font-normal"
              disabled={isLoadingOptions}
            >
              <option value="">All equipment types</option>
              {equipmentTypes
                .filter((type) => !draftFilters.categoryId || type.category_id === draftFilters.categoryId)
                .map((type) => (
                  <option key={type.type_id} value={type.type_id}>{type.name}</option>
                ))}
            </select>
          </label>

          {view !== 'availability' && (
            <label className="grid gap-1 text-[10px] font-semibold text-body">
              Checkout year
              <select
                value={draftFilters.year ?? ''}
                onChange={(event) => setDraftFilters((current) => ({
                  ...current,
                  year: event.target.value ? Number(event.target.value) : null,
                }))}
                className="min-h-9 min-w-32 rounded-lg border border-input bg-white px-3 text-xs font-normal"
                disabled={isLoadingOptions}
              >
                <option value="">All years</option>
                {years.map((year) => <option key={year} value={year}>{year}</option>)}
              </select>
            </label>
          )}

          {view === 'borrowers' && (
            <label className="grid gap-1 text-[10px] font-semibold text-body">
              Search borrowers
              <input
                type="search"
                value={draftFilters.search ?? ''}
                onChange={(event) => setDraftFilters((current) => ({ ...current, search: event.target.value }))}
                placeholder="Borrower ID, UNB ID, or name"
                className="min-h-9 min-w-52 rounded-lg border border-input bg-white px-3 text-xs font-normal"
              />
            </label>
          )}

          <button
            type="submit"
            className="min-h-9 rounded-lg bg-primary px-4 text-[11px] font-semibold text-white hover:bg-primary-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          >
            Apply filters
          </button>
          <button
            type="button"
            onClick={resetFilters}
            className="min-h-9 rounded-lg border border-input bg-white px-4 text-[11px] font-semibold text-body hover:bg-page focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          >
            Reset filters
          </button>
        </form>

        {optionsError && (
          <p className="m-4 rounded-lg border border-warning/20 bg-warning-soft px-3 py-2 text-xs text-warning" role="status">
            Filters could not be loaded: {optionsError}
          </p>
        )}
        {(errorMessage || exportError) && (
          <p className="m-4 rounded-lg border border-danger/20 bg-danger-soft px-3 py-2 text-xs text-danger" role="alert">
            {errorMessage || exportError}
          </p>
        )}
        {isLoading && (
          <p className="m-4 rounded-lg border border-primary/20 bg-primary-soft px-3 py-2 text-xs text-primary" role="status">
            Loading analytics…
          </p>
        )}

        <div id="analytics-panel" role="tabpanel" aria-labelledby={`analytics-tab-${view}`}>
          {reportContent}
          {!isLoading && !errorMessage && report && view === 'borrowing' && isBorrowingSummary(report) && report.total_loans === 0 && (
            <EmptyReport>No loans match the selected filters.</EmptyReport>
          )}
        </div>
      </Panel>
    </section>
  )
}
