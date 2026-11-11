import { useEffect, useRef, useState, type FormEvent } from 'react'
import {
  createMaintenanceRecord,
  describeMaintenanceError,
  fetchAvailableMaintenanceAssets,
  fetchMaintenanceTechnicians,
  maintenanceTypeLabels,
  maintenanceTypes,
  type MaintenancePriority,
  type MaintenanceTechnician,
  type MaintenanceType,
} from '../api'
import type { AssetRecord } from '../../assets/api'

interface MaintenanceRecordDialogProps {
  onClose: () => void
  onCreated: () => void
}

const priorities: MaintenancePriority[] = ['Low', 'Medium', 'High', 'Urgent']

function localDate(): string {
  const today = new Date()
  const month = String(today.getMonth() + 1).padStart(2, '0')
  const day = String(today.getDate()).padStart(2, '0')
  return `${today.getFullYear()}-${month}-${day}`
}

function displayTechnician(technician: MaintenanceTechnician): string {
  return (
    [technician.first_name, technician.last_name].filter(Boolean).join(' ')
    || technician.username
  )
}

export default function MaintenanceRecordDialog({
  onClose,
  onCreated,
}: MaintenanceRecordDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const [assetSearch, setAssetSearch] = useState('')
  const [assets, setAssets] = useState<AssetRecord[]>([])
  const [technicians, setTechnicians] = useState<MaintenanceTechnician[]>([])
  const [selectedAssetId, setSelectedAssetId] = useState('')
  const [selectedTechnicianId, setSelectedTechnicianId] = useState('')
  const [maintenanceType, setMaintenanceType] = useState<MaintenanceType>('Repair')
  const [priority, setPriority] = useState<MaintenancePriority>('Medium')
  const [startDate, setStartDate] = useState(localDate)
  const [isLoadingAssets, setIsLoadingAssets] = useState(true)
  const [isLoadingTechnicians, setIsLoadingTechnicians] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')

  useEffect(() => {
    const dialog = dialogRef.current
    if (dialog && !dialog.open && typeof dialog.showModal === 'function') {
      dialog.showModal()
    }
    return () => {
      if (dialog?.open) dialog.close()
    }
  }, [])

  useEffect(() => {
    let isCurrent = true
    const timeout = window.setTimeout(() => {
      setIsLoadingAssets(true)
      fetchAvailableMaintenanceAssets(assetSearch)
        .then((availableAssets) => {
          if (isCurrent) setAssets(availableAssets)
        })
        .catch((error: unknown) => {
          if (isCurrent) {
            setAssets([])
            setErrorMessage(
              describeMaintenanceError(error, 'load available equipment'),
            )
          }
        })
        .finally(() => {
          if (isCurrent) setIsLoadingAssets(false)
        })
    }, assetSearch ? 250 : 0)

    return () => {
      isCurrent = false
      window.clearTimeout(timeout)
    }
  }, [assetSearch])

  useEffect(() => {
    let isCurrent = true
    fetchMaintenanceTechnicians()
      .then((activeTechnicians) => {
        if (isCurrent) setTechnicians(activeTechnicians)
      })
      .catch((error: unknown) => {
        if (isCurrent) {
          setErrorMessage(
            describeMaintenanceError(error, 'load active technicians'),
          )
        }
      })
      .finally(() => {
        if (isCurrent) setIsLoadingTechnicians(false)
      })

    return () => {
      isCurrent = false
    }
  }, [])

  const submitCreate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const assetId = Number(selectedAssetId)
    const technicianId = Number(selectedTechnicianId)
    if (!assetId || !technicianId) {
      setErrorMessage('Select available equipment and a responsible technician.')
      return
    }

    setIsSubmitting(true)
    setErrorMessage('')
    try {
      await createMaintenanceRecord({
        asset_id: assetId,
        technician_id: technicianId,
        maintenance_type: maintenanceType,
        priority,
        start_date: startDate,
      })
      onCreated()
    } catch (error) {
      setErrorMessage(
        describeMaintenanceError(error, 'create the maintenance record'),
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <dialog
      ref={dialogRef}
      className="m-auto max-h-[calc(100dvh-32px)] w-[min(700px,calc(100vw-32px))] overflow-y-auto rounded-[13px] border border-line bg-white p-0 text-body shadow-[0_24px_60px_rgb(15_27_45_/_28%)] backdrop:bg-[rgb(20_33_54_/_45%)]"
      aria-labelledby="maintenance-dialog-title"
      onCancel={(event) => {
        event.preventDefault()
        onClose()
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <form onSubmit={submitCreate}>
        <header className="flex items-start justify-between gap-4 border-b border-divider px-6 py-5">
          <div>
            <p className="m-0 text-[10px] font-semibold uppercase tracking-[0.08em] text-muted">
              New record
            </p>
            <h2
              className="mb-0 mt-1 text-[19px] font-bold text-heading"
              id="maintenance-dialog-title"
            >
              New Maintenance
            </h2>
          </div>
          <button
            type="button"
            className="rounded-lg border border-input bg-white px-3 py-1 text-lg text-muted hover:bg-page"
            aria-label="Close maintenance dialog"
            onClick={onClose}
          >
            ×
          </button>
        </header>

        <div className="grid grid-cols-2 gap-4 px-6 py-5 max-[600px]:grid-cols-1">
          <label className="flex flex-col gap-1.5 text-[11px] font-semibold text-body">
            <span>Search available equipment by Asset ID *</span>
            <input
              className="min-h-10 rounded-lg border border-input px-3 text-[12px] font-normal"
              value={assetSearch}
              onChange={(event) => {
                setAssetSearch(event.target.value)
                setSelectedAssetId('')
                setErrorMessage('')
              }}
              placeholder="Search Asset ID..."
              autoComplete="off"
            />
          </label>
          <label className="flex flex-col gap-1.5 text-[11px] font-semibold text-body">
            <span>Equipment *</span>
            <select
              className="min-h-10 rounded-lg border border-input bg-white px-3 text-[12px] font-normal"
              required
              value={selectedAssetId}
              onChange={(event) => setSelectedAssetId(event.target.value)}
              disabled={isLoadingAssets}
            >
              <option value="">
                {isLoadingAssets ? 'Loading available equipment…' : 'Select equipment'}
              </option>
              {assets.map((asset) => (
                <option key={asset.asset_id} value={asset.asset_id}>
                  {asset.asset_identifier} · {asset.name}
                </option>
              ))}
            </select>
            {!isLoadingAssets && assets.length === 0 && (
              <span className="font-normal text-muted">
                No available equipment matches this search.
              </span>
            )}
          </label>
          <label className="flex flex-col gap-1.5 text-[11px] font-semibold text-body">
            <span>Maintenance Type *</span>
            <select
              className="min-h-10 rounded-lg border border-input bg-white px-3 text-[12px] font-normal"
              value={maintenanceType}
              onChange={(event) => {
                const selectedType = maintenanceTypes.find(
                  (type) => type === event.target.value,
                )
                if (selectedType) setMaintenanceType(selectedType)
              }}
            >
              {maintenanceTypes.map((type) => (
                <option key={type} value={type}>
                  {maintenanceTypeLabels[type]}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1.5 text-[11px] font-semibold text-body">
            <span>Priority *</span>
            <select
              className="min-h-10 rounded-lg border border-input bg-white px-3 text-[12px] font-normal"
              value={priority}
              onChange={(event) => {
                const selectedPriority = priorities.find(
                  (value) => value === event.target.value,
                )
                if (selectedPriority) setPriority(selectedPriority)
              }}
            >
              {priorities.map((value) => (
                <option key={value} value={value}>{value}</option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1.5 text-[11px] font-semibold text-body">
            <span>Responsible Technician *</span>
            <select
              className="min-h-10 rounded-lg border border-input bg-white px-3 text-[12px] font-normal"
              required
              value={selectedTechnicianId}
              onChange={(event) => setSelectedTechnicianId(event.target.value)}
              disabled={isLoadingTechnicians}
            >
              <option value="">
                {isLoadingTechnicians ? 'Loading technicians…' : 'Select a technician'}
              </option>
              {technicians.map((technician) => (
                <option key={technician.id} value={technician.id}>
                  {displayTechnician(technician)}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1.5 text-[11px] font-semibold text-body">
            <span>Start Date *</span>
            <input
              className="min-h-10 rounded-lg border border-input px-3 text-[12px] font-normal"
              type="date"
              required
              value={startDate}
              onChange={(event) => setStartDate(event.target.value)}
            />
          </label>
          {errorMessage && (
            <p
              className="col-span-full m-0 rounded-lg border border-danger/20 bg-danger-soft px-3 py-2 text-[12px] text-danger"
              role="alert"
            >
              {errorMessage}
            </p>
          )}
        </div>

        <footer className="flex flex-wrap items-center justify-end gap-2 border-t border-divider px-6 py-4">
          <button
            className="min-h-9 rounded-lg border border-input bg-white px-4 text-[12px] font-semibold text-body hover:bg-page"
            type="button"
            disabled={isSubmitting}
            onClick={onClose}
          >
            Cancel
          </button>
          <button
            className="min-h-9 rounded-lg bg-primary px-4 text-[12px] font-semibold text-white hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-60"
            type="submit"
            disabled={
              isSubmitting
              || isLoadingAssets
              || isLoadingTechnicians
              || !selectedAssetId
              || !selectedTechnicianId
            }
          >
            {isSubmitting ? 'Saving…' : 'Save Maintenance'}
          </button>
        </footer>
      </form>
    </dialog>
  )
}
