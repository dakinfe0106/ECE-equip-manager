import { useEffect, useState } from 'react'
import { AnalyticsRequestError, fetchOptions, fetchReport } from './api'
import type { Filters, Options, Report } from './api'

export default function useAnalytics(report: Report, filters: Filters) {
  const [options, setOptions] = useState<Options | null>(null)
  const [data, setData] = useState<Awaited<ReturnType<typeof fetchReport>> | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const { category_id, equipment_type_id, year } = filters
  useEffect(() => {
    const controller = new AbortController()
    let current = true
    // The page remounts this loader when URL filters or retry state change.
    Promise.all([
      fetchOptions(controller.signal),
      fetchReport(report, { category_id, equipment_type_id, year }, controller.signal),
    ]).then(([choices, result]) => {
      if (current) { setOptions(choices); setData(result) }
    }).catch((reason: unknown) => {
      if (current) setError(reason instanceof AnalyticsRequestError
        ? reason.message : 'Could not load analytics. Please try again.')
    }).finally(() => { if (current) setLoading(false) })
    return () => { current = false; controller.abort() }
  }, [report, category_id, equipment_type_id, year])
  return { options, data, loading, error }
}
