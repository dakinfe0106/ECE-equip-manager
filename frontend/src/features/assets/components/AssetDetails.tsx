import { useEffect, useRef, type MouseEvent } from 'react'
import type { AssetRecord } from '../api'

interface AssetDetailsProps {
  asset: AssetRecord
  onClose: () => void
}

export default function AssetDetails({ asset, onClose }: AssetDetailsProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const certifications = asset.equipment_type.required_certifications

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

  // Clicks on the dialog element itself (not its content) land on the backdrop.
  const closeOnBackdropClick = (event: MouseEvent<HTMLDialogElement>) => {
    if (event.target === event.currentTarget) {
      onClose()
    }
  }

  return (
    <dialog
      ref={dialogRef}
      className="asset-details-modal"
      id="asset-details"
      aria-labelledby="details-title"
      onCancel={(event) => {
        event.preventDefault()
        onClose()
      }}
      onClick={closeOnBackdropClick}
    >
      <section className="asset-details">
        <header className="details-heading">
          <div>
            <p className="eyebrow">EQUIPMENT RECORD</p>
            <h2 id="details-title">{asset.name}</h2>
            <div className="details-meta">
              <span className="details-asset-id" aria-label="Asset ID">
                {asset.asset_identifier}
              </span>
              <span className={`status-pill status-${asset.status.toLowerCase().replaceAll('_', '-')}`}>
                {asset.status.replaceAll('_', ' ')}
              </span>
            </div>
          </div>
          <button
            className="close-details"
            type="button"
            aria-label="Close asset details"
            onClick={onClose}
          >
            ×
          </button>
        </header>
        <dl className="details-grid">
          <div>
            <dt>Category</dt>
            <dd>{asset.equipment_type.category.name}</dd>
          </div>
          <div>
            <dt>Equipment type</dt>
            <dd>{asset.equipment_type.name}</dd>
          </div>
          <div>
            <dt>Acquisition date</dt>
            <dd>{asset.acquisition_date ?? 'Not recorded'}</dd>
          </div>
          {certifications !== undefined && (
            <div className="details-wide">
              <dt>Required certifications</dt>
              <dd>
                {certifications.length === 0 ? (
                  'None required'
                ) : (
                  <ul className="certification-list">
                    {certifications.map((certification) => (
                      <li key={certification.certification_id}>{certification.name}</li>
                    ))}
                  </ul>
                )}
              </dd>
            </div>
          )}
          <div className="details-wide">
            <dt>Description</dt>
            <dd>{asset.equipment_type.description || 'No description recorded'}</dd>
          </div>
        </dl>
        <div className="details-actions">
          <button className="details-done" type="button" onClick={onClose}>
            Close
          </button>
        </div>
      </section>
    </dialog>
  )
}
