import { Fragment } from 'react'
import type { AssetRecord } from '../api'
import AssetDetails from './AssetDetails'

interface AssetTableProps {
  appliedSearch: string
  assets: AssetRecord[]
  errorMessage: string
  isLoading: boolean
  onSelectAsset: (assetId: number | null) => void
  selectedAssetId: number | null
}

export default function AssetTable({
  appliedSearch,
  assets,
  errorMessage,
  isLoading,
  onSelectAsset,
  selectedAssetId,
}: AssetTableProps) {
  return (
    <div className="table-scroll">
      <table className="asset-table">
        <thead>
          <tr>
            <th scope="col">ID</th>
            <th scope="col">Asset Identifier</th>
            <th scope="col">Name</th>
            <th scope="col">Category</th>
            <th scope="col">Type</th>
            <th scope="col">Status</th>
            <th scope="col">Acquisition Date</th>
          </tr>
        </thead>
        <tbody>
          {assets.map((asset) => (
            <Fragment key={asset.asset_id}>
              <tr>
                <td className="record-id">{asset.asset_id.toString().padStart(2, '0')}</td>
                <td>
                  <button
                    className="asset-identifier-link"
                    type="button"
                    aria-expanded={selectedAssetId === asset.asset_id}
                    aria-controls={selectedAssetId === asset.asset_id ? 'asset-details' : undefined}
                    aria-label={`View details for asset ${asset.asset_identifier}`}
                    onClick={() => onSelectAsset(selectedAssetId === asset.asset_id ? null : asset.asset_id)}
                  >
                    {asset.asset_identifier}
                  </button>
                </td>
                <td className="asset-name">{asset.name}</td>
                <td>{asset.equipment_type.category.name}</td>
                <td>{asset.equipment_type.name}</td>
                <td>
                  <span className={`status-pill status-${asset.status.toLowerCase().replaceAll('_', '-')}`}>
                    {asset.status.replaceAll('_', ' ')}
                  </span>
                </td>
                <td>{asset.acquisition_date ?? '—'}</td>
              </tr>
              {selectedAssetId === asset.asset_id && (
                <tr className="asset-detail-row">
                  <td colSpan={7}>
                    <AssetDetails asset={asset} onClose={() => onSelectAsset(null)} />
                  </td>
                </tr>
              )}
            </Fragment>
          ))}
          {!isLoading && assets.length === 0 && (
            <tr>
              <td className="table-empty" colSpan={7}>
                {errorMessage
                  ? 'The asset list could not be loaded.'
                  : appliedSearch
                    ? 'No matching asset was found.'
                    : 'No active assets are available.'}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  )
}
