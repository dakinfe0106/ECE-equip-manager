import { useEffect, useState } from 'react'

export default function AddAssetAction() {
  const [toastState, setToastState] = useState<'hidden' | 'visible' | 'exiting'>('hidden')
  const [toastCycle, setToastCycle] = useState(0)

  useEffect(() => {
    if (toastState === 'hidden') {
      return
    }

    const timeout = window.setTimeout(() => {
      setToastState(toastState === 'visible' ? 'exiting' : 'hidden')
    }, toastState === 'visible' ? 5000 : 300)

    return () => window.clearTimeout(timeout)
  }, [toastState, toastCycle])

  return (
    <>
      <button
        className="add-asset-button"
        type="button"
        onClick={() => {
          setToastCycle((cycle) => cycle + 1)
          setToastState('visible')
        }}
      >
        <svg viewBox="0 0 20 20" aria-hidden="true">
          <path d="M10 4v12M4 10h12" />
        </svg>
        Add Asset
      </button>
      {toastState !== 'hidden' && (
        <div className={`add-asset-toast toast-${toastState}`} role="status" aria-live="polite">
          <span className="toast-icon" aria-hidden="true">i</span>
          <span>Adding assets is not available yet.</span>
        </div>
      )}
    </>
  )
}
