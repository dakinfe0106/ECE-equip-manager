import { useEffect, useRef, useState } from 'react'
import type { AssetRecord } from '../api'
import AddAssetForm from './AddAssetForm'

const focusableSelector =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

interface AddAssetModalProps {
  onClose: () => void
  onCreated: (asset: AssetRecord) => void
}

export default function AddAssetModal({ onClose, onCreated }: AddAssetModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  // Read while rendering, before the form's autoFocus moves focus into the dialog.
  const [opener] = useState(() =>
    document.activeElement instanceof HTMLElement ? document.activeElement : null,
  )
  const dialogRef = useRef<HTMLDivElement>(null)
  const requestClose = () => {
    if (!isSubmitting) onClose()
  }
  // The keyboard listener is added once, so it reads the latest close handler from a ref.
  const requestCloseRef = useRef(requestClose)
  useEffect(() => {
    requestCloseRef.current = requestClose
  })

  // Escape closes from anywhere, Tab stays inside the dialog, and focus returns to the opener.
  useEffect(() => {
    const dialog = dialogRef.current

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        event.preventDefault()
        requestCloseRef.current()
        return
      }
      if (event.key !== 'Tab' || !dialog) return
      const focusable = [...dialog.querySelectorAll<HTMLElement>(focusableSelector)]
      if (focusable.length === 0) return
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      const active = document.activeElement
      if (event.shiftKey && (active === first || !dialog.contains(active))) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && (active === last || !dialog.contains(active))) {
        event.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      opener?.focus()
    }
  }, [opener])

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-heading/55 p-4"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) requestClose()
      }}
    >
      <div
        ref={dialogRef}
        className="w-full max-w-[760px] rounded-xl border border-line bg-white p-6 shadow-2xl max-[600px]:p-4"
        role="dialog"
        aria-modal="true"
        aria-labelledby="add-asset-title"
      >
        <AddAssetForm
          isModal
          onCancel={requestClose}
          onCreated={onCreated}
          onSubmittingChange={setIsSubmitting}
        />
      </div>
    </div>
  )
}
