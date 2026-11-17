import { useEffect, useState } from 'react'
import Panel from '../../../components/ui/Panel'
import {
  describeMaintenanceError,
  fetchAssetMaintenanceHistory,
  maintenanceTypeLabels,
  type MaintenanceRecord,
} from '../api'

export default function MaintenanceHistory({ assetId }: { assetId: number }) {
  const [result, setResult] = useState<{
    assetId: number
    records: MaintenanceRecord[]
    errorMessage: string
  }>({ assetId: 0, records: [], errorMessage: '' })

  useEffect(() => {
    let isCurrent = true

    fetchAssetMaintenanceHistory(assetId)
      .then((history) => {
        if (isCurrent) {
          setResult({
            assetId,
            records: history,
            errorMessage: '',
          })
        }
      })
      .catch((error: unknown) => {
        if (isCurrent) {
          setResult({
            assetId,
            records: [],
            errorMessage: describeMaintenanceError(
              error,
              'load this asset’s maintenance history',
            ),
          })
        }
      })

    return () => {
      isCurrent = false
    }
  }, [assetId])

  const isCurrentResult = result.assetId === assetId
  const records = isCurrentResult ? result.records : []
  const errorMessage = isCurrentResult ? result.errorMessage : ''
  const isLoading = !isCurrentResult

  return (
    <section className="mt-5 border-t border-divider pt-4" aria-labelledby="maintenance-history-title">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h3 className="m-0 text-[13px] font-bold text-heading" id="maintenance-history-title">
          Maintenance History
        </h3>
        <span className="text-[10px] text-muted">
          {records.length} {records.length === 1 ? 'record' : 'records'}
        </span>
      </div>
      {isLoading && <p className="m-0 text-[11px] text-muted" role="status">Loading maintenance history…</p>}
      {errorMessage && <p className="m-0 text-[11px] text-danger" role="alert">{errorMessage}</p>}
      {!isLoading && !errorMessage && records.length === 0 && (
        <p className="m-0 text-[11px] text-muted">No maintenance history for this asset.</p>
      )}
      {!isLoading && !errorMessage && records.length > 0 && (
        <Panel className="overflow-hidden" label="Asset maintenance history">
          <ul className="m-0 list-none divide-y divide-divider p-0">
            {records.map((record) => (
              <li
                className="flex flex-wrap items-center justify-between gap-2 px-3 py-3 text-[10px]"
                key={record.maintenance_id}
              >
                <span className="min-w-[140px] flex-1">
                  <strong className="block text-body">
                    {maintenanceTypeLabels[record.maintenance_type]}
                  </strong>
                  <span className="text-muted">
                    {record.priority} priority · {record.technician.first_name || record.technician.username}
                    {record.start_date && ` · Started ${record.start_date}`}
                  </span>
                </span>
                <span className="text-right text-muted">
                  <strong className={record.status === 'Completed' ? 'text-success' : 'text-warning'}>
                    {record.status}
                  </strong>
                  {record.end_date && <span className="block">Completed {record.end_date}</span>}
                </span>
              </li>
            ))}
          </ul>
        </Panel>
      )}
    </section>
  )
}
