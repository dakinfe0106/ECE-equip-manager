import { useEffect, useRef, useState, type FormEvent, type MouseEvent } from 'react'
import {
  AssetLookupError,
  updateAsset,
  type AssetRecord,
  type AssetUpdate,
} from '../api'

interface AssetDetailsProps {
  asset: AssetRecord
  onClose: () => void
  onAssetUpdated: (asset: AssetRecord) => void
}

const statusClassNames: Record<AssetRecord['status'], string> = {
  Available: 'bg-[#def5e8] text-[#16864f]',
  On_Loan: 'bg-[#fff0d6] text-[#ad6b00]',
  Under_Maintenance: 'bg-[#fde2e2] text-[#bb4044]',
  Retired: 'bg-[#e8ebf0] text-[#5b6574]',
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
  const certifications = asset.equipment_type.required_certifications
  
  // UI States
  const [isEditing, setIsEditing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [statusMessage, setStatusMessage] = useState('')
  
  // Track if the user has modified the form without saving
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)

  // Note: Backend currently only allows updating 'name' and 'acquisition_date' 
  // based on the AssetUpdate type in api.ts.
  const [draft, setDraft] = useState<AssetUpdate>({
    name: asset.name,
    acquisition_date: asset.acquisition_date,
  })

  useEffect(() => {
    const dialog = dialogRef.current
    if (dialog && !dialog.open && typeof dialog.showModal === 'function') {
      dialog.showModal()
    }
    return () => {
      if (dialog?.open) {
        dialog.close()
      }
    }
  }, [])

  // Intercept close attempts to warn about unsaved changes
  const handleAttemptClose = () => {
    if (isEditing && hasUnsavedChanges) {
      const confirmClose = window.confirm(
        'You have unsaved changes. Are you sure you want to discard them?'
      )
      if (!confirmClose) return // Stop closing if they click "Cancel" on the browser prompt
    }
    onClose()
  }

  const closeOnBackdropClick = (event: MouseEvent<HTMLDialogElement>) => {
    if (event.target === event.currentTarget) {
      handleAttemptClose() // Use our new safe close function
    }
  }

  const startEditing = () => {
    setDraft({
      name: asset.name,
      acquisition_date: asset.acquisition_date,
    })
    setErrorMessage('')
    setStatusMessage('')
    setHasUnsavedChanges(false) // Reset unsaved changes flag when starting fresh
    setIsEditing(true)
  }

  const handleSave = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setIsSaving(true)
    setErrorMessage('')
    setStatusMessage('')

    try {
      const updatedAsset = await updateAsset(asset.asset_id, draft)
      onAssetUpdated(updatedAsset)
      setIsEditing(false)
      setHasUnsavedChanges(false) // Clear the flag after a successful save
      setStatusMessage(`Changes saved for ${updatedAsset.asset_identifier}.`)
    } catch (error) {
      setErrorMessage(getErrorMessage(error))
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <dialog
      ref={dialogRef}
      className="m-auto max-h-[calc(100dvh-48px)] w-[min(520px,calc(100vw-32px))] overflow-y-auto rounded-[10px] border-0 bg-white px-6 pb-[18px] pt-[22px] shadow-[0_24px_60px_rgb(15_27_45_/_28%)] backdrop:bg-[rgb(20_33_54_/_45%)]"
      id="asset-details"
      aria-labelledby="details-title"
      onCancel={(event) => {
        event.preventDefault()
        handleAttemptClose() // ISSUE #69: Safe close on Esc key
      }}
      onClick={closeOnBackdropClick}
    >
      <header className="flex items-start justify-between gap-3 border-b border-[#e8edf3] pb-4">
        <div>
          <p className="mb-[6px] text-[9px] font-bold tracking-[1px] text-[#8491a4]">
            EQUIPMENT RECORD
          </p>
          <h2 className="m-0 text-[15px] font-[650] text-[#26344a]" id="details-title">
            {asset.name}
          </h2>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <span className="rounded-[5px] bg-[#f1f4f9] px-2 py-[3px] font-mono text-[11px] font-semibold text-[#26344a]">
              {asset.asset_identifier}
            </span>
            <span
              className={`rounded-xl px-2 py-1 text-[9px] font-[650] ${statusClassNames[asset.status]} status-${asset.status.toLowerCase().replaceAll('_', '-')}`}
            >
              {asset.status.replaceAll('_', ' ')}
            </span>
          </div>
        </div>
        <div className="flex flex-wrap justify-end gap-2">
          {!isEditing && (
            <button
              className="rounded-[5px] border border-[#2672e8] bg-[#2672e8] px-[10px] py-[6px] text-[10px] text-white focus-visible:outline-2 focus-visible:outline-[#347ee9] focus-visible:outline-offset-[3px]"
              type="button"
              onClick={startEditing}
            >
              Edit information
            </button>
          )}
          <button
            className="rounded-[5px] border border-[#dce3ed] bg-white px-[10px] py-[6px] text-[10px] text-[#59677a] focus-visible:outline-2 focus-visible:outline-[#347ee9] focus-visible:outline-offset-[3px]"
            type="button"
            onClick={handleAttemptClose} // ISSUE #69: Safe close on X button
            aria-label="Close asset details"
          >
            ×
          </button>
        </div>
      </header>

      {isEditing ? (
        <form className="pt-[15px]" onSubmit={handleSave} aria-busy={isSaving}>
          <div className="grid grid-cols-4 gap-[13px] max-[700px]:grid-cols-2 max-[390px]:grid-cols-1">
            <label className="flex min-w-0 flex-col gap-[6px] text-[9px] font-[650] tracking-[0.25px] text-[#8792a2] uppercase">
              <span>Asset ID</span>
              <input
                className="w-full min-w-0 rounded-[5px] border border-[#dce3ed] bg-[#eef2f7] px-[9px] py-2 text-[11px] text-[#68768a] normal-case"
                value={asset.asset_identifier}
                readOnly
              />
            </label>
            <label className="flex min-w-0 flex-col gap-[6px] text-[9px] font-[650] tracking-[0.25px] text-[#8792a2] uppercase">
              <span>Name *</span>
              <input
                className="w-full min-w-0 rounded-[5px] border border-[#dce3ed] bg-white px-[9px] py-2 text-[11px] text-[#39465a] normal-case focus-visible:outline-2 focus-visible:outline-[#347ee9]"
                required
                maxLength={255}
                value={draft.name}
                onChange={(event) => {
                  setDraft((current) => ({ ...current, name: event.target.value }))
                  setHasUnsavedChanges(true) // ISSUE #69: Mark as changed
                }}
              />
            </label>
            <label className="flex min-w-0 flex-col gap-[6px] text-[9px] font-[650] tracking-[0.25px] text-[#8792a2] uppercase">
              <span>Status</span>
              <input
                className="w-full min-w-0 rounded-[5px] border border-[#dce3ed] bg-[#eef2f7] px-[9px] py-2 text-[11px] text-[#68768a] normal-case"
                value={asset.status.replaceAll('_', ' ')}
                readOnly
              />
            </label>
            <label className="flex min-w-0 flex-col gap-[6px] text-[9px] font-[650] tracking-[0.25px] text-[#8792a2] uppercase">
              <span>Acquisition date</span>
              <input
                className="w-full min-w-0 rounded-[5px] border border-[#dce3ed] bg-white px-[9px] py-2 text-[11px] text-[#39465a] normal-case focus-visible:outline-2 focus-visible:outline-[#347ee9]"
                type="date"
                value={draft.acquisition_date ?? ''}
                onChange={(event) => {
                  setDraft((current) => ({
                    ...current,
                    acquisition_date: event.target.value || null,
                  }))
                  setHasUnsavedChanges(true) // ISSUE #69: Mark as changed
                }}
              />
            </label>
          </div>
          <div className="mt-[14px] flex items-center justify-end gap-2">
            {errorMessage && (
              <p className="mr-auto text-[10px] text-[#b42332]" role="alert">
                {errorMessage}
              </p>
            )}
            <button
              className="rounded-[5px] border border-[#dce3ed] bg-white px-[10px] py-[6px] text-[10px] text-[#59677a] disabled:cursor-wait disabled:opacity-70"
              type="button"
              disabled={isSaving}
              onClick={handleAttemptClose} // ISSUE #69: Safe close on Cancel button
            >
              Cancel
            </button>
            <button
              className="rounded-[5px] border border-[#2672e8] bg-[#2672e8] px-[10px] py-[6px] text-[10px] text-white disabled:cursor-wait disabled:opacity-70"
              type="submit"
              disabled={isSaving}
            >
              {isSaving ? 'Saving…' : 'Save changes'}
            </button>
          </div>
        </form>
      ) : (
        <dl className="mt-4 grid grid-cols-3 gap-x-[23px] gap-y-[17px] max-[700px]:grid-cols-2 max-[390px]:grid-cols-1">
          <div>
            <dt className="mb-[5px] text-[9px] font-[650] tracking-[0.25px] text-[#8792a2] uppercase">
              Asset ID
            </dt>
            <dd className="m-0 [overflow-wrap:anywhere] text-[11px] text-[#39465a]">
              {asset.asset_identifier}
            </dd>
          </div>
          {certifications !== undefined && (
            <div className="col-span-full">
              <dt className="mb-[5px] text-[9px] font-[650] tracking-[0.25px] text-[#8792a2] uppercase">
                Required certifications
              </dt>
              <dd className="m-0 [overflow-wrap:anywhere] text-[11px] text-[#39465a]">
                {certifications.length === 0 ? (
                  'None required'
                ) : (
                  <ul className="m-0 flex list-none flex-wrap gap-1.5 p-0">
                    {certifications.map((certification) => (
                      <li
                        className="rounded-xl border border-[#d6e2f5] bg-[#f1f6ff] px-[9px] py-[3px] text-[10px] font-semibold text-[#174fa1]"
                        key={certification.certification_id}
                      >
                        {certification.name}
                      </li>
                    ))}
                  </ul>
                )}
              </dd>
            </div>
          )}
          <div>
            <dt className="mb-[5px] text-[9px] font-[650] tracking-[0.25px] text-[#8792a2] uppercase">
              Category
            </dt>
            <dd className="m-0 [overflow-wrap:anywhere] text-[11px] text-[#39465a]">
              {asset.equipment_type.category.name}
            </dd>
          </div>
          <div>
            <dt className="mb-[5px] text-[9px] font-[650] tracking-[0.25px] text-[#8792a2] uppercase">
              Equipment type
            </dt>
            <dd className="m-0 [overflow-wrap:anywhere] text-[11px] text-[#39465a]">
              {asset.equipment_type.name}
            </dd>
          </div>
          <div>
            <dt className="mb-[5px] text-[9px] font-[650] tracking-[0.25px] text-[#8792a2] uppercase">
              Status
            </dt>
            <dd className="m-0 [overflow-wrap:anywhere] text-[11px] text-[#39465a]">
              {asset.status.replaceAll('_', ' ')}
            </dd>
          </div>
          <div>
            <dt className="mb-[5px] text-[9px] font-[650] tracking-[0.25px] text-[#8792a2] uppercase">
              Acquisition date
            </dt>
            <dd className="m-0 [overflow-wrap:anywhere] text-[11px] text-[#39465a]">
              {asset.acquisition_date ?? 'Not recorded'}
            </dd>
          </div>
          <div>
            <dt className="mb-[5px] text-[9px] font-[650] tracking-[0.25px] text-[#8792a2] uppercase">
              Description
            </dt>
            <dd className="m-0 [overflow-wrap:anywhere] text-[11px] text-[#39465a]">
              {asset.equipment_type.description || 'No description recorded'}
            </dd>
          </div>

          {/* Placeholder buttons for history features */}
          <div className="col-span-full mt-4 flex flex-wrap gap-3 border-t border-[#e8edf3] pt-4">
            <button
              type="button"
              className="rounded-[5px] border border-[#dce3ed] bg-white px-3 py-2 text-[10px] font-[650] text-[#2672e8] hover:bg-[#f1f4f9]"
              onClick={() => alert('Lending History feature coming in a future sprint!')}
            >
              View Lending History →
            </button>
            <button
              type="button"
              className="rounded-[5px] border border-[#dce3ed] bg-white px-3 py-2 text-[10px] font-[650] text-[#2672e8] hover:bg-[#f1f4f9]"
              onClick={() => alert('Maintenance History feature coming in a future sprint!')}
            >
              View Maintenance History →
            </button>
          </div>
        </dl>
      )}
      
      {statusMessage && (
        <p className="mt-3 text-[10px] text-[#087443]" role="status">
          {statusMessage}
        </p>
      )}
    </dialog>
  )
}
