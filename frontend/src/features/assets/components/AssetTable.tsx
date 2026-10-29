import type { AssetRecord } from '../api'
import AssetStatusBadge from './AssetStatusBadge'

const headerClassName =
  'sticky top-0 z-[1] border-b border-line bg-page px-[17px] py-[11px] text-left text-[9px] font-bold uppercase tracking-[0.04em] text-muted'
const cellClassName = 'border-b border-divider px-[17px] py-[13px] text-[11px] text-muted'

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
  const toggleAsset = (assetId: number) =>
    onSelectAsset(selectedAssetId === assetId ? null : assetId)

  return (
    <div className="min-h-0 flex-1 overflow-auto">
      <table className="w-full border-collapse text-left whitespace-nowrap">
        <thead>
          <tr>
            <th className={headerClassName} scope="col">Asset ID</th>
            <th className={headerClassName} scope="col">Asset Name</th>
            <th className={headerClassName} scope="col">Category</th>
            <th className={headerClassName} scope="col">Equipment Type</th>
            <th className={headerClassName} scope="col">Status</th>
          </tr>
        </thead>
        <tbody>
          {assets.map((asset) => (
            <tr
              key={asset.asset_id}
              className={`cursor-pointer ${
                selectedAssetId === asset.asset_id
                  ? 'row-selected bg-primary-soft'
                  : 'hover:bg-page'
              }`}
              onClick={() => toggleAsset(asset.asset_id)}
            >
              <td className={cellClassName}>
                <button
                  className="font-mono text-[10px] font-[650] text-primary hover:text-primary-hover hover:underline focus-visible:outline-2 focus-visible:outline-offset-[3px] focus-visible:outline-primary"
                  type="button"
                  aria-haspopup="dialog"
                  aria-controls={selectedAssetId === asset.asset_id ? 'asset-details' : undefined}
                  aria-label={`View details for asset ${asset.asset_identifier}`}
                  onClick={(event) => {
                    event.stopPropagation()
                    toggleAsset(asset.asset_id)
                  }}
                >
                  {asset.asset_identifier}
                </button>
              </td>
              <td className={`${cellClassName} font-[650] text-body`}>{asset.name}</td>
              <td className={cellClassName}>{asset.equipment_type.category.name}</td>
              <td className={cellClassName}>{asset.equipment_type.name}</td>
              <td className={cellClassName}>
                <AssetStatusBadge status={asset.status} />
              </td>
            </tr>
          ))}
          {!isLoading && assets.length === 0 && (
            <tr>
              <td className="h-[116px] px-[17px] text-center text-[11px] text-subtle whitespace-normal" colSpan={5}>
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
