import { useEffect, useState } from 'react'
import {
  describeMaintenanceError,
  fetchMaintenanceRecords,
  type MaintenanceFilters,
  type MaintenanceRecord,
} from '../api'

const pageSize = 20

export default function useMaintenanceRecords(
  filters: MaintenanceFilters,
  page: number,
  refreshKey: number,
) {
  const [result, setResult] = useState<{
    key: string
    records: MaintenanceRecord[]
    totalCount: number
    errorMessage: string
  }>({ key: '', records: [], totalCount: 0, errorMessage: '' })
  const requestKey = JSON.stringify([
    filters.asset_identifier,
    filters.maintenance_type,
    filters.priority,
    filters.status,
    page,
    refreshKey,
  ])
  const {
    asset_identifier: assetIdentifier,
    maintenance_type: maintenanceType,
    priority,
    status,
  } = filters

  useEffect(() => {
    let isCurrent = true

    fetchMaintenanceRecords({
      asset_identifier: assetIdentifier,
      maintenance_type: maintenanceType,
      priority,
      status,
    }, page)
      .then((response) => {
        if (isCurrent) {
          setResult({
            key: requestKey,
            records: response.results,
            totalCount: response.count,
            errorMessage: '',
          })
        }
      })
      .catch((error: unknown) => {
        if (isCurrent) {
          setResult({
            key: requestKey,
            records: [],
            totalCount: 0,
            errorMessage: describeMaintenanceError(
              error,
              'load maintenance records',
            ),
          })
        }
      })

    return () => {
      isCurrent = false
    }
  }, [
    assetIdentifier,
    maintenanceType,
    priority,
    status,
    page,
    refreshKey,
    requestKey,
  ])

  const isCurrentResult = result.key === requestKey

  return {
    records: isCurrentResult ? result.records : [],
    totalCount: isCurrentResult ? result.totalCount : 0,
    isLoading: !isCurrentResult,
    errorMessage: isCurrentResult ? result.errorMessage : '',
    pageCount: Math.max(
      1,
      Math.ceil((isCurrentResult ? result.totalCount : 0) / pageSize),
    ),
    pageSize,
  }
}
