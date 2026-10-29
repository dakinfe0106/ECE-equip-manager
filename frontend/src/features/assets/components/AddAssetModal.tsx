import { useState } from 'react'
import type { AssetRecord } from '../api'
import AddAssetForm from './AddAssetForm'

interface AddAssetModalProps {
  onClose: () => void
  onCreated: (asset: AssetRecord) => void
}

export default function AddAssetModal({ onClose, onCreated }: AddAssetModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const requestClose = () => {
    if (!isSubmitting) onClose()
  }

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-[#101828]/55 p-4"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) requestClose()
      }}
    >
      <div
        className="w-full max-w-[760px] rounded-xl border border-line bg-white p-6 shadow-2xl max-[600px]:p-4"
        role="dialog"
        aria-modal="true"
        aria-labelledby="add-asset-title"
        onKeyDown={(event) => {
          if (event.key === 'Escape') requestClose()
        }}
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
