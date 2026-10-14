import { useState, type FormEvent } from 'react'
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
  const [isEditing, setIsEditing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [statusMessage, setStatusMessage] = useState('')
  const [draft, setDraft] = useState<AssetUpdate>({
    name: asset.name,
    acquisition_date: asset.acquisition_date,
  })

  const startEditing = () => {
    setDraft({
      name: asset.name,
      acquisition_date: asset.acquisition_date,
    })
    setErrorMessage('')
    setStatusMessage('')
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
      setStatusMessage(`Changes saved for ${updatedAsset.asset_identifier}.`)
    } catch (error) {
      setErrorMessage(getErrorMessage(error))
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <section
      className="m-0 rounded-lg border border-[#e1e8f1] bg-[#fbfcfe] px-[18px] pb-[19px] pt-[17px]"
      id="asset-details"
      aria-labelledby="details-title"
    >
      <div className="flex items-start justify-between gap-3 border-b border-[#e8edf3] pb-[13px]">
        <div>
          <p className="mb-[6px] text-[9px] font-bold tracking-[1px] text-[#8491a4]">
            EQUIPMENT RECORD
          </p>
          <h2 className="m-0 text-[15px] font-[650] text-[#26344a]" id="details-title">
            {asset.name}
          </h2>
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
            onClick={onClose}
          >
            Close
          </button>
        </div>
      </div>
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
              <span>Name</span>
              <input
                className="w-full min-w-0 rounded-[5px] border border-[#dce3ed] bg-white px-[9px] py-2 text-[11px] text-[#39465a] normal-case focus-visible:outline-2 focus-visible:outline-[#347ee9]"
                required
                maxLength={255}
                value={draft.name}
                onChange={(event) =>
                  setDraft((current) => ({ ...current, name: event.target.value }))
                }
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
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    acquisition_date: event.target.value || null,
                  }))
                }
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
              onClick={() => setIsEditing(false)}
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
        </dl>
      )}
      {statusMessage && (
        <p className="mt-3 text-[10px] text-[#087443]" role="status">
          {statusMessage}
        </p>
      )}
    </section>
  )
}
