import type { AssetRecord } from '../api'

interface AssetDetailsProps {
  asset: AssetRecord
  onClose: () => void
}

export default function AssetDetails({ asset, onClose }: AssetDetailsProps) {
  return (
    <section className="asset-details" id="asset-details" aria-labelledby="details-title">
      <div className="details-heading">
        <div>
          <p className="eyebrow">EQUIPMENT RECORD</p>
          <h2 id="details-title">{asset.name}</h2>
        </div>
        <button className="close-details" type="button" onClick={onClose}>
          Close
        </button>
      </div>
      <dl className="details-grid">
        <div>
          <dt>Asset ID</dt>
          <dd>{asset.asset_identifier}</dd>
        </div>
        <div>
          <dt>Category</dt>
          <dd>{asset.equipment_type.category.name}</dd>
        </div>
        <div>
          <dt>Equipment type</dt>
          <dd>{asset.equipment_type.name}</dd>
        </div>
        <div>
          <dt>Status</dt>
          <dd>{asset.status.replaceAll('_', ' ')}</dd>
        </div>
        <div>
          <dt>Acquisition date</dt>
          <dd>{asset.acquisition_date ?? 'Not recorded'}</dd>
        </div>
        <div>
          <dt>Description</dt>
          <dd>{asset.equipment_type.description || 'No description recorded'}</dd>
        </div>
      </dl>
    </section>
  )
}
