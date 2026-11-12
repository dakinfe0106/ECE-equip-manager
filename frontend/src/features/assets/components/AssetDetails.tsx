
import {
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type MouseEvent,
} from 'react'

import {
  AssetLookupError,
  updateAsset,
  type AssetRecord,
  type AssetUpdate,
} from '../api'

import { hasPermission } from '../../auth/api'
import { useAuth } from '../../auth/useAuth'

interface AssetDetailsProps {
  asset: AssetRecord
  onClose: () => void
  onAssetUpdated: (asset: AssetRecord) => void
}

const statusClassNames: Record<AssetRecord['status'], string> = {
  Available: 'bg-[#def5e8] text-[#16864f]',
  On_Loan: 'bg-yellow-100 text-[#ad6b00]',
  Under_Maintenance: 'bg-[#fde2e2] text-[#bb4044]',
  Retired: 'bg-[#e8ebf0] text-[#5b6574]',
}

function getErrorMessage(error: unknown): string {
  if (error instanceof AssetLookupError && error.status === 403) {
    return 'Your account does not have permission to edit this asset.'
  }

  return error instanceof Error
    ? error.message
    : 'Could not save asset changes.'
}

export default function AssetDetails({
  asset,
  onClose,
  onAssetUpdated,
}: AssetDetailsProps) {
  const { user } = useAuth()
  const canEdit = hasPermission(user, 'inventory.change_asset')

  const dialogRef = useRef<HTMLDialogElement>(null)

  const [isEditing, setIsEditing] = useState(canEdit)
  const [isSaving, setIsSaving] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [statusMessage, setStatusMessage] = useState('')
  const [validationError, setValidationError] = useState('')
  const [showUnsavedWarning, setShowUnsavedWarning] = useState(false)

  const [draft, setDraft] = useState<AssetUpdate>({
    name: asset.name,
    acquisition_date: asset.acquisition_date,
  })

  const certifications = asset.equipment_type.required_certifications

  const isDirty =
    draft.name.trim() !== asset.name ||
    (draft.acquisition_date || null) !==
      (asset.acquisition_date || null)

  // Open and close the native dialog.
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

  const startEditing = () => {
    setDraft({
      name: asset.name,
      acquisition_date: asset.acquisition_date,
    })

    setErrorMessage('')
    setStatusMessage('')
    setValidationError('')
    setShowUnsavedWarning(false)
    setIsEditing(true)
  }

  const handleAttemptClose = () => {
    if (isSaving) return

    if (isEditing && isDirty) {
      setShowUnsavedWarning(true)
      return
    }

    onClose()
  }

  const handleDiscardChanges = () => {
    setDraft({
      name: asset.name,
      acquisition_date: asset.acquisition_date,
    })

    setShowUnsavedWarning(false)
    setValidationError('')
    setErrorMessage('')
    onClose()
  }

  const handleKeepEditing = () => {
    setShowUnsavedWarning(false)
  }

  const handleCancelEditing = () => {
    setDraft({
      name: asset.name,
      acquisition_date: asset.acquisition_date,
    })

    setIsEditing(false)
    setValidationError('')
    setErrorMessage('')
    setShowUnsavedWarning(false)
  }

  const closeOnBackdropClick = (
    event: MouseEvent<HTMLDialogElement>,
  ) => {
    if (event.target === event.currentTarget) {
      handleAttemptClose()
    }
  }

  const handleSave = async (
    event: FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault()

    setValidationError('')
    setErrorMessage('')
    setStatusMessage('')

    if (!canEdit) {
      setErrorMessage(
        'Your account does not have permission to edit this asset.',
      )
      return
    }

    if (!draft.name.trim()) {
      setValidationError(
        'Asset Name cannot be empty or contain only spaces.',
      )
      return
    }

    if (!isDirty) return

    setIsSaving(true)

    try {
      const payload: AssetUpdate = {
        name: draft.name.trim(),
        acquisition_date: draft.acquisition_date || null,
      }

      const updatedAsset = await updateAsset(
        asset.asset_id,
        payload,
      )

      onAssetUpdated(updatedAsset)

      setDraft({
        name: updatedAsset.name,
        acquisition_date: updatedAsset.acquisition_date,
      })

      setIsEditing(false)
      setShowUnsavedWarning(false)

      setStatusMessage(
        `Changes saved for ${updatedAsset.asset_identifier}.`,
      )
    } catch (error) {
      setErrorMessage(getErrorMessage(error))
    } finally {
      setIsSaving(false)
    }
  }

  const closeButton = (
    <button
      className="rounded-[5px] border border-[#dce3ed] bg-white px-[10px] py-[6px] text-[10px] text-[#59677a] focus-visible:outline-2 focus-visible:outline-[#347ee9] focus-visible:outline-offset-[3px]"
      type="button"
      onClick={handleAttemptClose}
      disabled={isSaving}
      aria-label="Close asset details"
    >
      ×
    </button>
  )

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
      {/* Header */}
      <header className="flex items-start justify-between gap-3 border-b border-[#e8edf3] pb-4">
        <div>
          <p className="mb-[6px] text-[9px] font-bold tracking-[1px] text-[#8491a4]">
            ASSET DETAILS · {asset.asset_identifier}
          </p>

          <h2
            className="m-0 text-[15px] font-[650] text-[#26344a]"
            id="details-title"
          >
            {asset.name}
          </h2>

          <div className="mt-2">
            <span
              className={`rounded-xl px-2 py-1 text-[9px] font-[650] ${statusClassNames[asset.status]}`}
            >
              {asset.status.replaceAll('_', ' ')}
            </span>
          </div>
        </div>

        <div className="flex flex-wrap justify-end gap-2">
          {!isEditing && canEdit && (
            <button
              className="rounded-[5px] border border-[#2672e8] bg-[#2672e8] px-[10px] py-[6px] text-[10px] text-white focus-visible:outline-2 focus-visible:outline-[#347ee9] focus-visible:outline-offset-[3px]"
              type="button"
              onClick={startEditing}
            >
              Edit information
            </button>
          )}

          {closeButton}
        </div>
      </header>

      {/* Editing form */}
      {isEditing && canEdit ? (
        <form
          className="pt-[15px]"
          onSubmit={handleSave}
          aria-busy={isSaving}
        >
          <div className="grid grid-cols-2 gap-x-6 gap-y-4">
            <label className="flex min-w-0 flex-col gap-[6px]">
              <span className="text-[10px] font-[650] text-[#8792a2]">
                Asset ID · Read only
              </span>
              <input
                className="w-full rounded-[5px] border border-[#dce3ed] bg-[#f1f3f6] px-3 py-2 text-[12px] text-[#68768a]"
                value={asset.asset_identifier}
                readOnly
              />
            </label>

            <label className="flex min-w-0 flex-col gap-[6px]">
              <span className="text-[10px] font-[650] text-[#8792a2]">
                Current Status · Read only
              </span>
              <input
                className="w-full rounded-[5px] border border-[#dce3ed] bg-[#f1f3f6] px-3 py-2 text-[12px] text-[#68768a]"
                value={asset.status.replaceAll('_', ' ')}
                readOnly
              />
            </label>

            <label className="flex min-w-0 flex-col gap-[6px]">
              <span className="text-[10px] font-[650] text-[#8792a2]">
                Asset Name *
              </span>
              <input
                className="w-full rounded-[5px] border border-[#dce3ed] bg-white px-3 py-2 text-[12px] text-[#39465a] focus:border-blue-500 focus:outline-none"
                required
                maxLength={255}
                value={draft.name}
                onChange={(event) => {
                  setDraft((current) => ({
                    ...current,
                    name: event.target.value,
                  }))
                  setValidationError('')
                }}
              />
            </label>

            <label className="flex min-w-0 flex-col gap-[6px]">
              <span className="text-[10px] font-[650] text-[#8792a2]">
                Serial Number
              </span>
              <input
                className="w-full rounded-[5px] border border-[#dce3ed] bg-[#f1f3f6] px-3 py-2 text-[12px] text-[#68768a]"
                value="N/A"
                readOnly
                disabled
                aria-label="Serial number not available"
              />
            </label>

            <label className="flex min-w-0 flex-col gap-[6px]">
              <span className="text-[10px] font-[650] text-[#8792a2]">
                Category · Read only
              </span>
              <input
                className="w-full rounded-[5px] border border-[#dce3ed] bg-[#f1f3f6] px-3 py-2 text-[12px] text-[#68768a]"
                value={asset.equipment_type.category.name}
                readOnly
              />
            </label>

            <label className="flex min-w-0 flex-col gap-[6px]">
              <span className="text-[10px] font-[650] text-[#8792a2]">
                Equipment Type · Read only
              </span>
              <input
                className="w-full rounded-[5px] border border-[#dce3ed] bg-[#f1f3f6] px-3 py-2 text-[12px] text-[#68768a]"
                value={asset.equipment_type.name}
                readOnly
              />
            </label>

            <label className="flex min-w-0 flex-col gap-[6px]">
              <span className="text-[10px] font-[650] text-[#8792a2]">
                Acquisition Date
              </span>
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
              <span className="text-[10px] font-[650] text-[#8792a2]">
                Required Certifications
              </span>
              <input
                className="w-full rounded-[5px] border border-[#dce3ed] bg-[#f1f3f6] px-3 py-2 text-[12px] text-[#68768a]"
                value={
                  certifications?.map((certification) => certification.name).join(', ') ||
                  'None'
                }
                readOnly
              />
            </label>
          </div>

          {validationError && (
            <div className="mt-3 rounded-[5px] border border-red-200 bg-red-50 p-3">
              <p className="text-[10px] font-medium text-red-600" role="alert">
                {validationError}
              </p>
            </div>
          )}

          {errorMessage && (
            <div className="mt-3 rounded-[5px] border border-red-200 bg-red-50 p-3">
              <p className="text-[10px] font-medium text-red-600" role="alert">
                {errorMessage}
              </p>
            </div>
          )}

          <div className="mt-6 flex items-center justify-end gap-2 border-t border-[#e8edf3] pt-4">
            <button
              className="rounded-[5px] border border-[#dce3ed] bg-white px-[10px] py-[6px] text-[10px] text-[#59677a] disabled:cursor-wait disabled:opacity-70"
              type="button"
              disabled={isSaving}
              onClick={handleCancelEditing}
            >
              Cancel
            </button>

            <button
              className="rounded-[5px] border border-[#2672e8] bg-[#2672e8] px-[10px] py-[6px] text-[10px] text-white disabled:cursor-wait disabled:opacity-70"
              type="submit"
              disabled={isSaving || !isDirty}
            >
              {isSaving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      ) : (
        /* Read-only details */
        <dl className="mt-4 grid grid-cols-3 gap-x-[23px] gap-y-[17px] max-[700px]:grid-cols-2 max-[390px]:grid-cols-1">
          <div>
            <dt className="mb-[5px] text-[9px] font-[650] tracking-[0.25px] text-[#8792a2] uppercase">
              Asset ID
            </dt>
            <dd className="m-0 [overflow-wrap:anywhere] text-[11px] text-[#39465a]">
              {asset.asset_identifier}
            </dd>
          </div>

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
              Equipment Type
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
              Acquisition Date
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

          {certifications !== undefined && (
            <div className="col-span-full">
              <dt className="mb-[5px] text-[9px] font-[650] tracking-[0.25px] text-[#8792a2] uppercase">
                Required Certifications
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
        </dl>
      )}

      {/* Read-only access message */}
      {!canEdit && (
        <p className="mt-3 text-[10px] text-[#68768a]">
          You have read-only access to this asset.
        </p>
      )}

      {/* Unsaved changes warning */}
      {showUnsavedWarning && (
        <section
          className="mt-4 rounded-[7px] border border-[#f0c978] bg-[#fff9eb] p-4"
          role="alertdialog"
          aria-labelledby="unsaved-warning-title"
          aria-describedby="unsaved-warning-description"
        >
          <h3
            id="unsaved-warning-title"
            className="mb-1 text-[12px] font-bold text-[#805500]"
          >
            Unsaved changes
          </h3>

          <p
            id="unsaved-warning-description"
            className="mb-3 text-[11px] text-[#805500]"
          >
            You have changes that haven't been saved. Do you want to discard them?
          </p>

          <div className="flex flex-wrap justify-end gap-2">
            <button
              type="button"
              onClick={handleKeepEditing}
              className="rounded-[5px] border border-[#dce3ed] bg-white px-3 py-2 text-[10px] font-semibold text-[#59677a]"
            >
              Keep editing
            </button>

            <button
              type="button"
              onClick={handleDiscardChanges}
              className="rounded-[5px] bg-[#b42332] px-3 py-2 text-[10px] font-semibold text-white"
            >
              Discard changes
            </button>
          </div>
        </section>
      )}

      {/* Lifecycle safeguards and future actions */}
      <div className="mt-6 border-t border-[#e8edf3] pt-4">
        <div className="mb-4 rounded-[5px] border border-blue-100 bg-blue-50 p-4">
          <h4 className="mb-1 text-[11px] font-bold text-gray-800">
            Lifecycle safeguards
          </h4>
          <p className="text-[10px] text-gray-600">
            Operational actions are disabled while the asset has an active loan,
            maintenance record, or retired status.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            disabled
            title="Lending History feature coming in a future sprint."
            className="flex items-center justify-between rounded-[5px] border border-[#dce3ed] bg-[#f8f9fb] px-3 py-2 text-[11px] font-[650] text-[#8792a2] disabled:cursor-not-allowed"
          >
            View Lending History <span>›</span>
          </button>

          <button
            type="button"
            disabled
            title="Maintenance History feature coming in a future sprint."
            className="flex items-center justify-between rounded-[5px] border border-[#dce3ed] bg-[#f8f9fb] px-3 py-2 text-[11px] font-[650] text-[#8792a2] disabled:cursor-not-allowed"
          >
            View Maintenance History <span>›</span>
          </button>
        </div>

        <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-[#e8edf3] pt-4">
          <button
            className="rounded-[5px] border border-red-200 bg-white px-4 py-2 text-[12px] font-semibold text-red-600 disabled:cursor-not-allowed"
            type="button"
            disabled
            title="Archive feature coming in a future sprint."
          >
            Archive Asset
          </button>

          <div className="flex flex-wrap items-center gap-2">
            <button
              className="rounded-[5px] border border-[#dce3ed] bg-white px-4 py-2 text-[12px] font-semibold text-[#59677a] disabled:cursor-not-allowed disabled:opacity-50"
              type="button"
              disabled
              title="Checkout feature coming in a future sprint."
            >
              Check Out Asset
            </button>

            <button
              className="rounded-[5px] border border-[#dce3ed] bg-white px-4 py-2 text-[12px] font-semibold text-[#59677a] disabled:cursor-not-allowed disabled:opacity-50"
              type="button"
              disabled
              title="Maintenance feature coming in a future sprint."
            >
              Start Maintenance
            </button>
          </div>
        </div>
      </div>

      {statusMessage && (
        <p className="mt-3 text-[10px] text-[#087443]" role="status">
          {statusMessage}
        </p>
      )}
    </dialog>
  )
}
