import type { AssetRecord } from '../api'
import type { AssetGroup } from '../groupAssets'
import AssetStatusBadge from './AssetStatusBadge'

const headerClassName =
  'sticky top-0 z-[1] border-b border-line bg-page px-[17px] py-[11px] text-left text-[9px] font-bold uppercase tracking-[0.04em] text-muted'
const cellClassName = 'border-b border-divider px-[17px] py-[13px] text-[11px] text-muted'

interface AssetTableProps {
  appliedSearch: string
  assets: AssetRecord[]
  errorMessage: string
  // When set, rows are shown under one heading per group instead of as a single list.
  groups?: AssetGroup[]
  isLoading: boolean
  onSelectAsset: (assetId: number | null) => void
  selectedAssetId: number | null
}

const assetCount = (count: number) => `${count} ${count === 1 ? 'asset' : 'assets'}`

export default function AssetTable({
  appliedSearch,
  assets,
  errorMessage,
  groups,
  isLoading,
  onSelectAsset,
  selectedAssetId,
}: AssetTableProps) {
  const toggleAsset = (assetId: number) =>
    onSelectAsset(selectedAssetId === assetId ? null : assetId)

  const renderRow = (asset: AssetRecord) => (
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
  )

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
        {groups ? (
          groups.map((group) => (
            <tbody key={group.key}>
              <tr>
                <th
                  className="border-b border-line bg-page px-[17px] py-[13px] text-left font-normal"
                  colSpan={5}
                  scope="rowgroup"
                >
                  <span className="text-[11px] font-[650] text-body">{group.label}</span>
                  <span className="ml-2 text-[9px] text-subtle">
                    {group.detail ? `${group.detail} · ` : ''}
                    {assetCount(group.assets.length)}
                  </span>
                </th>
              </tr>
              {group.assets.map(renderRow)}
            </tbody>
          ))
        ) : (
          <tbody>{assets.map(renderRow)}</tbody>
        )}
        {/* On an error, the page shows the "Unable to load assets" block instead. */}
        {!isLoading && !errorMessage && assets.length === 0 && (
          <tbody>
            <tr>
              <td className="h-[116px] px-[17px] text-center text-[11px] text-subtle whitespace-normal" colSpan={5}>
                {appliedSearch ? 'No matching asset was found.' : 'No active assets are available.'}
              </td>
            </tr>
          </tbody>
        )}
      </table>
    </div>
  )
}
