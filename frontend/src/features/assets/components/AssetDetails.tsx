import { useEffect, useRef, useState, type FormEvent, type MouseEvent } from 'react'
import {
  AssetLookupError,
  updateAsset,
  type AssetRecord,
} from '../api'

interface AssetDetailsProps {
  asset: AssetRecord
  onClose: () => void
  onAssetUpdated: (asset: AssetRecord) => void
}

function getErrorMessage(error: unknown): string {
  if (error instanceof AssetLookupError && error.status === 403) {
    return 'You are not authorized to edit this asset. Sign in with your EMS account and try again.'
  }
  return error instanceof Error ? error.message : 'Could not save asset changes.'
}

export default function AssetDetails({
  asset,
  onClose,
  onAssetUpdated,
}: AssetDetailsProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  
  // UI States
  const [isSaving, setIsSaving] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [statusMessage, setStatusMessage] = useState('')
  const [showUnsavedWarning, setShowUnsavedWarning] = useState(false)
  const [validationError, setValidationError] = useState('')

  // Draft state for form fields
  const [draft, setDraft] = useState({
    name: asset.name,
    acquisition_date: asset.acquisition_date,
  })

  // Compute dirty state by comparing draft directly to initial asset values
  // FIX: Normalize dates to prevent false positives when comparing "" vs null
  const isDirty = 
    draft.name.trim() !== asset.name ||
    (draft.acquisition_date || null) !== (asset.acquisition_date || null)

  const handleAttemptClose = () => {
    if (isDirty && !showUnsavedWarning) {
      setShowUnsavedWarning(true)
      return
    }
    onClose()
  }

  const closeOnBackdropClick = (event: MouseEvent<HTMLDialogElement>) => {
    if (event.target === event.currentTarget) {
      handleAttemptClose()
    }
  }

  const handleSave = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setValidationError('')
    setErrorMessage('')

    // Trim validation on Asset Name
    if (!draft.name.trim()) {
      setValidationError('Asset Name cannot be empty or contain only spaces.')
      return
    }

    // FIX: Move setIsSaving(true) AFTER validation to prevent UI freeze
    setIsSaving(true)
    try {
      const payload = {
        name: draft.name.trim(),
        acquisition_date: draft.acquisition_date,
      }
      
      const updatedAsset = await updateAsset(asset.asset_id, payload)
      onAssetUpdated(updatedAsset)
      setStatusMessage(`Changes saved for ${updatedAsset.asset_identifier}.`)
      setShowUnsavedWarning(false)
    } catch (error) {
      setErrorMessage(getErrorMessage(error))
    } finally {
      setIsSaving(false)
    }
  }

  // Helper for status badge color
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Available': return 'bg-green-100 text-green-800 border-green-200';
      case 'On_Loan': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'Under_Maintenance': return 'bg-red-100 text-red-800 border-red-200';
      case 'Retired': return 'bg-gray-100 text-gray-800 border-gray-200';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const currentCategoryName = asset.equipment_type.category.name;
  const currentTypeName = asset.equipment_type.name;

  // FIX: Ensure showModal() is called when the component mounts
  useEffect(() => {
    const dialog = dialogRef.current
    if (dialog && !dialog.open && typeof dialog.showModal === 'function') {
      dialog.showModal()
    }
    return () => {
      if (dialog?.open) dialog.close()
    }
  }, [])

  return (
    <dialog
      ref={dialogRef}
      className="m-auto max-h-[calc(100dvh-48px)] w-[min(720px,calc(100vw-32px))] overflow-y-auto rounded-[10px] border-0 bg-white px-6 pb-[18px] pt-[22px] shadow-[0_24px_60px_rgb(15_27_45_/_28%)] backdrop:bg-[rgb(20_33_54_/_45%)]"
      id="asset-details"
      aria-labelledby="details-title"
      onCancel={(event) => {
        event.preventDefault()
        handleAttemptClose()
      }}
      onClick={closeOnBackdropClick}
    >
      {/* HEADER */}
      <header className="flex items-start justify-between gap-3 border-b border-[#e8edf3] pb-4 mb-6">
        <div>
          <p className="mb-[6px] text-[11px] font-bold tracking-wide text-blue-600 uppercase">
            ASSET DETAILS · {asset.asset_identifier}
          </p>
          <h2 className="m-0 text-[20px] font-[650] text-[#26344a]" id="details-title">
            {asset.name}
          </h2>
        </div>
        <button
          className="rounded-[5px] border border-[#dce3ed] bg-white px-[10px] py-[6px] text-[14px] text-[#59677a] hover:bg-gray-50"
          type="button"
          onClick={handleAttemptClose}
          aria-label="Close asset details"
        >
          ×
        </button>
      </header>

      {/* STATUS BADGE */}
      <div className="mb-6">
        <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border ${getStatusColor(asset.status)}`}>
          <span className="w-2 h-2 rounded-full bg-current mr-2"></span>
          {asset.status.replaceAll('_', ' ')}
        </span>
      </div>

      {/* UNSAVED CHANGES WARNING */}
      {showUnsavedWarning && (
        <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-[5px] flex justify-between items-start gap-3">
          <p className="text-[10px] text-amber-800 font-medium">You have unsaved changes. Please save your changes or discard them.</p>
          <button 
            type="button" 
            className="text-[10px] text-amber-800 underline whitespace-nowrap hover:text-amber-900"
            onClick={() => {
              setShowUnsavedWarning(false)
              onClose()
            }}
          >
            Discard and Close
          </button>
        </div>
      )}

      {/* FORM */}
      <form className="pt-[15px]" onSubmit={handleSave} aria-busy={isSaving}>
        <div className="grid grid-cols-2 gap-x-6 gap-y-4">
          
          {/* Row 1: Read Only Fields */}
          <label className="flex min-w-0 flex-col gap-[6px]">
            <span className="text-[10px] font-[650] text-[#8792a2]">Asset ID · Read only</span>
            <input
              className="w-full rounded-[5px] border border-[#dce3ed] bg-[#f1f3f6] px-3 py-2 text-[12px] text-[#68768a] cursor-not-allowed"
              value={asset.asset_identifier}
              readOnly
            />
          </label>
          <label className="flex min-w-0 flex-col gap-[6px]">
            <span className="text-[10px] font-[650] text-[#8792a2]">Current Status · Read only</span>
            <input
              className="w-full rounded-[5px] border border-[#dce3ed] bg-[#f1f3f6] px-3 py-2 text-[12px] text-[#68768a] cursor-not-allowed"
              value={asset.status.replaceAll('_', ' ')}
              readOnly
            />
          </label>

          {/* Row 2: Editable Name */}
          <label className="flex min-w-0 flex-col gap-[6px]">
            <span className="text-[10px] font-[650] text-[#8792a2]">Asset Name *</span>
            <input
              className="w-full rounded-[5px] border border-[#dce3ed] bg-white px-3 py-2 text-[12px] text-[#39465a] focus:border-blue-500 focus:outline-none"
              required
              maxLength={255}
              value={draft.name}
              onChange={(event) => {
                setDraft((current) => ({ ...current, name: event.target.value }))
              }}
            />
          </label>
          
          <label className="flex min-w-0 flex-col gap-[6px]">
            <span className="text-[10px] font-[650] text-[#8792a2]">Serial Number (Coming Soon)</span>
            <input
              className="w-full rounded-[5px] border border-[#dce3ed] bg-[#f1f3f6] px-3 py-2 text-[12px] text-[#68768a] cursor-not-allowed"
              value="N/A"
              readOnly
              disabled
            />
          </label>

          {/* Row 3: Category & Equipment Type (Read-only) */}
          <label className="flex min-w-0 flex-col gap-[6px]">
            <span className="text-[10px] font-[650] text-[#8792a2]">Category · Read only</span>
            <input
              className="w-full rounded-[5px] border border-[#dce3ed] bg-[#f1f3f6] px-3 py-2 text-[12px] text-[#68768a] cursor-not-allowed"
              value={currentCategoryName}
              readOnly
            />
          </label>

          <label className="flex min-w-0 flex-col gap-[6px]">
            <span className="text-[10px] font-[650] text-[#8792a2]">Equipment Type · Read only</span>
            <input
              className="w-full rounded-[5px] border border-[#dce3ed] bg-[#f1f3f6] px-3 py-2 text-[12px] text-[#68768a] cursor-not-allowed"
              value={currentTypeName}
              readOnly
            />
          </label>

          {/* Row 4: Acquisition Date & Required Certifications */}
          <label className="flex min-w-0 flex-col gap-[6px]">
            <span className="text-[10px] font-[650] text-[#8792a2]">Acquisition Date</span>
            <input
              className="w-full rounded-[5px] border border-[#dce3ed] bg-white px-3 py-2 text-[12px] text-[#39465a] focus:border-blue-500 focus:outline-none"
              type="date"
              value={draft.acquisition_date ?? ''}
              onChange={(event) => {
                setDraft((current) => ({
                  ...current,
                  acquisition_date: event.target.value || null,
                }))
              }}
            />
          </label>
          
          <label className="flex min-w-0 flex-col gap-[6px]">
            <span className="text-[10px] font-[650] text-[#8792a2]">Required Certifications</span>
            <input
              className="w-full rounded-[5px] border border-[#dce3ed] bg-[#f1f3f6] px-3 py-2 text-[12px] text-[#68768a] cursor-not-allowed"
              value={asset.equipment_type.required_certifications?.map(c => c.name).join(', ') || 'None'}
              readOnly
            />
          </label>

          {/* Error Displays */}
          {validationError && (
            <div className="col-span-2 p-3 bg-red-50 border border-red-200 rounded-[5px]">
              <p className="text-[10px] text-red-600 font-medium">{validationError}</p>
            </div>
          )}
          {errorMessage && (
            <div className="col-span-2 p-3 bg-red-50 border border-red-200 rounded-[5px]">
              <p className="text-[10px] text-red-600 font-medium">{errorMessage}</p>
            </div>
          )}
          {statusMessage && (
            <div className="col-span-2 p-3 bg-green-50 border border-green-200 rounded-[5px]">
              <p className="text-[10px] text-green-700 font-medium">{statusMessage}</p>
            </div>
          )}
        </div>

        {/* History Links */}
        <div className="mt-6 grid grid-cols-2 gap-3 border-t border-[#e8edf3] pt-4">
           <button
            type="button"
            disabled
            title="Lending History feature coming in a future sprint!"
            className="rounded-[5px] border border-[#dce3ed] bg-[#f8f9fb] px-3 py-2 text-[11px] font-[650] text-[#8792a2] cursor-not-allowed flex justify-between items-center"
          >
            View Lending History <span>→</span>
          </button>
          <button
            type="button"
            disabled
            title="Maintenance History feature coming in a future sprint!"
            className="rounded-[5px] border border-[#dce3ed] bg-[#f8f9fb] px-3 py-2 text-[11px] font-[650] text-[#8792a2] cursor-not-allowed flex justify-between items-center"
          >
            View Maintenance History <span>→</span>
          </button>
        </div>

        {/* Lifecycle Safeguards */}
        <div className="mt-4 p-4 bg-blue-50 border border-blue-100 rounded-[5px]">
          <h4 className="text-[11px] font-bold text-gray-800 mb-1">Lifecycle safeguards</h4>
          <p className="text-[10px] text-gray-600">
            Operational actions are disabled while the asset has an active loan, maintenance record, or retired status.
          </p>
        </div>

        {/* Footer Buttons */}
        <div className="mt-6 flex items-center justify-between border-t border-[#e8edf3] pt-4">
          {/* Left Side: Archive */}
          <button
            className="rounded-[5px] border border-red-200 bg-white px-4 py-2 text-[12px] font-semibold text-red-600 hover:bg-red-50"
            type="button"
            disabled
            title="Archive feature coming in a future sprint!"
          >
            Archive Asset
          </button>

          {/* Right Side: Actions */}
          <div className="flex items-center gap-2">
            {/* FIX: Restored missing action buttons with tooltips */}
            <button
              className="rounded-[5px] border border-[#dce3ed] bg-white px-4 py-2 text-[12px] font-semibold text-[#59677a] hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              type="button"
              disabled
              title="Checkout feature coming in a future sprint!"
            >
              Check Out Asset
            </button>
            <button
              className="rounded-[5px] border border-[#dce3ed] bg-white px-4 py-2 text-[12px] font-semibold text-[#59677a] hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              type="button"
              disabled
              title="Maintenance feature coming in a future sprint!"
            >
              Start Maintenance
            </button>
            <button
              className="rounded-[5px] border border-[#dce3ed] bg-white px-4 py-2 text-[12px] font-semibold text-[#59677a] hover:bg-gray-50"
              type="button"
              onClick={handleAttemptClose}
            >
              Cancel
            </button>
            <button
              className="rounded-[5px] border border-[#2672e8] bg-[#2672e8] px-4 py-2 text-[12px] font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
              type="submit"
              disabled={isSaving || !isDirty}
            >
              {isSaving ? 'Saving…' : 'Save Changes'}
            </button>
          </div>
        </div>
      </form>
    </dialog>
  )
}

