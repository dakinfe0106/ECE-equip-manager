import { useEffect, useState } from 'react'

interface Result<T> {
  load: (signal: AbortSignal) => Promise<T>
  data?: T
  error?: unknown
}

// Runs `load` when the component mounts and again whenever the `load` function changes
// (wrap it in useCallback and list what it depends on). A request that is still running
// is cancelled when `load` changes or the component unmounts.
// While a request is in flight `loading` is true; `error` holds the failure, if any.
export function useApiData<T>(load: (signal: AbortSignal) => Promise<T>) {
  const [result, setResult] = useState<Result<T> | null>(null)

  useEffect(() => {
    const controller = new AbortController()
    load(controller.signal).then(
      (data) => setResult({ load, data }),
      (error: unknown) => {
        if (!controller.signal.aborted) {
          setResult({ load, error })
        }
      },
    )
    return () => controller.abort()
  }, [load])

  // A result only counts if it belongs to the current request.
  const current = result?.load === load ? result : null
  return { loading: current === null, data: current?.data, error: current?.error }
}
