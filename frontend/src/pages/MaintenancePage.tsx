import { useState, type FormEvent } from 'react'
import PageIntro from '../components/ui/PageIntro'
import Panel from '../components/ui/Panel'
import { hasPermission } from '../features/auth/api'
import { useAuth } from '../features/auth/useAuth'
import MaintenanceRecordDialog from '../features/maintenance/components/MaintenanceRecordDialog'
import {
  maintenanceTypeLabels,
  maintenanceTypes,
  type MaintenanceFilters,
  type MaintenancePriority,
  type MaintenanceRecord,
  type MaintenanceStatusFilter,
} from '../features/maintenance/api'
import useMaintenanceRecords from '../features/maintenance/hooks/useMaintenanceRecords'

const initialFilters: MaintenanceFilters = {
  asset_identifier: '',
  status: 'all',
  maintenance_type: '',
  priority: '',
}

const priorities: MaintenancePriority[] = ['Low', 'Medium', 'High', 'Urgent']
const statusFilters: MaintenanceStatusFilter[] = ['all', 'in_progress', 'completed']

function priorityClass(priority: MaintenancePriority): string {
  if (priority === 'Urgent' || priority === 'High') {
    return 'bg-danger-soft text-danger'
  }
  if (priority === 'Low') return 'bg-success-soft text-success'
  return 'bg-warning-soft text-warning'
}

function technicianName(record: MaintenanceRecord): string {
  return (
    [record.technician.first_name, record.technician.last_name]
      .filter(Boolean)
      .join(' ')
    || record.technician.username
  )
}

export default function MaintenancePage() {
  const { user } = useAuth()
  const [filters, setFilters] = useState(initialFilters)
  const [searchInput, setSearchInput] = useState('')
  const [page, setPage] = useState(1)
  const [refreshKey, setRefreshKey] = useState(0)
  const [dialogMode, setDialogMode] = useState<'create' | 'details' | null>(null)
  const [selectedRecord, setSelectedRecord] = useState<MaintenanceRecord | undefined>()
  const [statusMessage, setStatusMessage] = useState('')
  const {
    records,
    totalCount,
    isLoading,
    errorMessage,
    pageCount,
    pageSize,
  } = useMaintenanceRecords(filters, page, refreshKey)
  const canCreate = hasPermission(user, 'maintenance.add_maintenancerecord')

  const applySearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setPage(1)
    setFilters((current) => ({
      ...current,
      asset_identifier: searchInput.trim(),
    }))
  }

  const updateFilter = <K extends keyof MaintenanceFilters>(
    key: K,
    value: MaintenanceFilters[K],
  ) => {
    setPage(1)
    setFilters((current) => ({ ...current, [key]: value }))
  }

  const openDetails = (record: MaintenanceRecord) => {
    setSelectedRecord(record)
    setDialogMode('details')
    setStatusMessage('')
  }

  const closeDialog = () => {
    setDialogMode(null)
    setSelectedRecord(undefined)
  }

  const refreshRecords = () => setRefreshKey((current) => current + 1)

  const resetFilters = () => {
    setSearchInput('')
    setPage(1)
    setFilters(initialFilters)
  }

  return (
    <section
      className="mx-auto flex h-full min-h-0 w-full max-w-[1500px] flex-col px-[34px] pt-[34px] pb-[50px] max-[760px]:px-4 max-[760px]:pt-6 max-[760px]:pb-10"
      aria-labelledby="page-title"
    >
      <PageIntro
        title="Maintenance"
        description="Plan, assign, and preserve service history for every asset."
        actions={canCreate ? (
          <button
            className="min-h-10 rounded-lg bg-primary px-4 text-[12px] font-semibold text-white hover:bg-primary-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            type="button"
            onClick={() => {
              setDialogMode('create')
              setStatusMessage('')
            }}
          >
            + New Maintenance
          </button>
        ) : undefined}
      />

      <Panel className="flex min-h-0 flex-1 flex-col overflow-hidden" label="Maintenance records">
        <form
          className="grid grid-cols-[minmax(190px,1.3fr)_repeat(3,minmax(130px,1fr))_auto] items-end gap-3 border-b border-divider p-[17px] max-[900px]:grid-cols-2 max-[520px]:grid-cols-1"
          onSubmit={applySearch}
        >
          <label className="flex min-w-0 flex-col gap-1.5 text-[10px] font-semibold text-muted">
            <span>Search Asset ID</span>
            <input
              className="min-h-9 rounded-lg border border-input px-3 text-[11px] font-normal text-body"
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              placeholder="Search asset ID..."
            />
          </label>
          <label className="flex min-w-0 flex-col gap-1.5 text-[10px] font-semibold text-muted">
            <span>Status</span>
            <select
              className="min-h-9 rounded-lg border border-input bg-white px-2 text-[11px] font-normal text-body"
              value={filters.status}
              onChange={(event) => {
                const status = statusFilters.find(
                  (value) => value === event.target.value,
                )
                if (status) updateFilter('status', status)
              }}
            >
              <option value="all">All statuses</option>
              <option value="in_progress">In Progress</option>
              <option value="completed">Completed</option>
            </select>
          </label>
          <label className="flex min-w-0 flex-col gap-1.5 text-[10px] font-semibold text-muted">
            <span>Maintenance Type</span>
            <select
              className="min-h-9 rounded-lg border border-input bg-white px-2 text-[11px] font-normal text-body"
              value={filters.maintenance_type}
              onChange={(event) => {
                const selectedType = maintenanceTypes.find(
                  (type) => type === event.target.value,
                )
                updateFilter('maintenance_type', selectedType ?? '')
              }}
            >
              <option value="">All types</option>
              {maintenanceTypes.map((type) => (
                <option key={type} value={type}>{maintenanceTypeLabels[type]}</option>
              ))}
            </select>
          </label>
          <label className="flex min-w-0 flex-col gap-1.5 text-[10px] font-semibold text-muted">
            <span>Priority</span>
            <select
              className="min-h-9 rounded-lg border border-input bg-white px-2 text-[11px] font-normal text-body"
              value={filters.priority}
              onChange={(event) => {
                const selectedPriority = priorities.find(
                  (priority) => priority === event.target.value,
                )
                updateFilter('priority', selectedPriority ?? '')
              }}
            >
              <option value="">All priorities</option>
              {priorities.map((priority) => (
                <option key={priority} value={priority}>{priority}</option>
              ))}
            </select>
          </label>
          <div className="flex gap-2">
            <button
              className="min-h-9 rounded-lg border border-input bg-white px-3 text-[11px] font-semibold text-body hover:border-primary"
              type="submit"
            >
              Search
            </button>
            <button
              className="min-h-9 rounded-lg px-2 text-[11px] font-semibold text-primary hover:bg-primary-soft"
              type="button"
              onClick={resetFilters}
            >
              Reset
            </button>
          </div>
        </form>

        {statusMessage && (
          <p className="mx-[17px] mt-[13px] mb-0 text-[11px] text-success" role="status">
            {statusMessage}
          </p>
        )}
        {errorMessage && (
          <p
            className="mx-[17px] mt-[13px] mb-0 rounded-lg border border-danger/20 bg-danger-soft px-[11px] py-[9px] text-[11px] text-danger"
            role="alert"
          >
            Unable to load maintenance records: {errorMessage}
          </p>
        )}
        {isLoading && (
          <p
            className="mx-[17px] mt-[13px] mb-0 rounded-lg border border-primary/20 bg-primary-soft px-[11px] py-[9px] text-[11px] text-primary"
            role="status"
          >
            Loading maintenance records…
          </p>
        )}

        <div className="min-h-0 flex-1 overflow-auto">
          <table className="w-full min-w-[850px] border-collapse text-left text-[11px]">
            <thead className="sticky top-0 bg-page text-[9px] uppercase tracking-[0.06em] text-muted">
              <tr>
                <th className="px-4 py-3 font-semibold">Asset ID</th>
                <th className="px-4 py-3 font-semibold">Equipment</th>
                <th className="px-4 py-3 font-semibold">Maintenance Type</th>
                <th className="px-4 py-3 font-semibold">Priority</th>
                <th className="px-4 py-3 font-semibold">Responsible Technician</th>
                <th className="px-4 py-3 font-semibold">Start Date</th>
                <th className="px-4 py-3 font-semibold">Completed</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3 font-semibold"><span className="sr-only">Details</span></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-divider">
              {records.map((record) => (
                <tr key={record.maintenance_id} className="hover:bg-page/70">
                  <td className="px-4 py-3 font-mono font-semibold text-heading">
                    {record.asset.asset_identifier}
                  </td>
                  <td className="px-4 py-3 text-body">{record.asset.name}</td>
                  <td className="px-4 py-3 text-body">
                    {maintenanceTypeLabels[record.maintenance_type]}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2.5 py-1 text-[9px] font-semibold ${priorityClass(record.priority)}`}>
                      {record.priority}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-body">{technicianName(record)}</td>
                  <td className="px-4 py-3 text-body">{record.start_date}</td>
                  <td className="px-4 py-3 text-body">{record.end_date ?? '—'}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2.5 py-1 text-[9px] font-semibold ${record.status === 'Completed' ? 'bg-success-soft text-success' : 'bg-warning-soft text-warning'}`}>
                      {record.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <button
                      className="font-semibold text-primary hover:underline"
                      type="button"
                      onClick={() => openDetails(record)}
                    >
                      View
                    </button>
                  </td>
                </tr>
              ))}
              {!isLoading && !errorMessage && records.length === 0 && (
                <tr>
                  <td className="px-4 py-10 text-center text-muted" colSpan={9}>
                    {filters.asset_identifier || filters.status !== 'all'
                    || filters.maintenance_type || filters.priority
                      ? 'No maintenance records match these filters.'
                      : 'No maintenance records have been created yet.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="flex min-h-[54px] items-center justify-between gap-3 border-t border-divider px-[17px] text-[10px] text-muted max-[520px]:flex-wrap max-[520px]:py-3">
          <span>
            {totalCount === 0
              ? 'No records'
              : `Showing ${(page - 1) * pageSize + 1}–${Math.min(page * pageSize, totalCount)} of ${totalCount} records`}
          </span>
          <nav className="flex items-center gap-2" aria-label="Maintenance list pagination">
            <button
              className="min-h-8 rounded-lg border border-input bg-white px-3 text-[10px] text-body disabled:cursor-not-allowed disabled:opacity-50"
              type="button"
              disabled={isLoading || page <= 1}
              onClick={() => setPage((current) => current - 1)}
            >
              Previous
            </button>
            <span>Page {page} of {pageCount}</span>
            <button
              className="min-h-8 rounded-lg border border-input bg-white px-3 text-[10px] text-body disabled:cursor-not-allowed disabled:opacity-50"
              type="button"
              disabled={isLoading || page >= pageCount}
              onClick={() => setPage((current) => current + 1)}
            >
              Next
            </button>
          </nav>
        </div>
      </Panel>

      {dialogMode && (
        <MaintenanceRecordDialog
          mode={dialogMode}
          record={selectedRecord}
          onClose={closeDialog}
          onCreated={() => {
            closeDialog()
            setStatusMessage('Maintenance record created. Equipment is now under maintenance.')
            refreshRecords()
          }}
        />
      )}
    </section>
  )
}
