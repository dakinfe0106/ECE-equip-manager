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
        className="inline-flex min-h-9 items-center justify-center gap-[7px] rounded-[6px] border border-[#276fdd] bg-[#2875e4] px-3 text-[11px] font-semibold text-white transition-colors hover:bg-[#1c64cc] focus-visible:outline-2 focus-visible:outline-[#347ee9] focus-visible:outline-offset-[3px]"
        type="button"
        onClick={() => {
          setToastCycle((cycle) => cycle + 1)
          setToastState('visible')
        }}
      >
        <svg className="h-[14px] w-[14px] fill-none stroke-current [stroke-linecap:round] stroke-[1.8]" viewBox="0 0 20 20" aria-hidden="true">
          <path d="M10 4v12M4 10h12" />
        </svg>
        Add Asset
      </button>
      {toastState !== 'hidden' && (
        <div
          className={`fixed bottom-6 right-6 z-[5] flex min-h-[54px] w-[min(360px,calc(100vw-32px))] items-center gap-[11px] rounded-lg border border-[#d8e2ef] bg-white px-4 py-3 text-[12px] text-[#3e4b60] shadow-[0_10px_30px_rgb(22_37_59_/_18%)] motion-reduce:animate-none ${toastState === 'visible' ? 'animate-toast-slide-in' : 'animate-toast-slide-out'}`}
          role="status"
          aria-live="polite"
        >
          <span className="grid h-[22px] w-[22px] shrink-0 place-items-center rounded-full bg-[#eaf2ff] text-[12px] font-bold text-[#2875e4]" aria-hidden="true">
            i
          </span>
          <span>Adding assets is not available yet.</span>
        </div>
      )}
    </>
  )
}
