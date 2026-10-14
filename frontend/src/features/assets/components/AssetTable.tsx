import { Fragment } from 'react'
import type { AssetRecord } from '../api'
import AssetDetails from './AssetDetails'

const headerClassName =
  'h-10 bg-[#f7f9fc] px-[14px] text-left text-[9px] font-[650] tracking-[0.15px] text-[#758196]'
const cellClassName = 'h-12 border-t border-[#edf0f4] px-[14px] text-[10px]'
const statusClassNames: Record<AssetRecord['status'], string> = {
  Available: 'bg-[#def5e8] text-[#16864f]',
  On_Loan: 'bg-[#fff0d6] text-[#ad6b00]',
  Under_Maintenance: 'bg-[#fde2e2] text-[#bb4044]',
  Retired: 'bg-[#e8ebf0] text-[#5b6574]',
}

interface AssetTableProps {
  appliedSearch: string
  assets: AssetRecord[]
  errorMessage: string
  isLoading: boolean
  onAssetUpdated: (asset: AssetRecord) => void
  onSelectAsset: (assetId: number | null) => void
  selectedAssetId: number | null
}

export default function AssetTable({
  appliedSearch,
  assets,
  errorMessage,
  isLoading,
  onAssetUpdated,
  onSelectAsset,
  selectedAssetId,
}: AssetTableProps) {
  return (
    <div className="min-h-0 flex-1 overflow-auto border-t border-[#e8edf3]">
      <table className="w-full border-collapse text-left text-[#4c596d] whitespace-nowrap">
        <thead>
          <tr>
            <th className={`${headerClassName} pl-[19px]`} scope="col">ID</th>
            <th className={headerClassName} scope="col">Asset Identifier</th>
            <th className={headerClassName} scope="col">Name</th>
            <th className={headerClassName} scope="col">Category</th>
            <th className={headerClassName} scope="col">Type</th>
            <th className={headerClassName} scope="col">Status</th>
            <th className={headerClassName} scope="col">Acquisition Date</th>
          </tr>
        </thead>
        <tbody>
          {assets.map((asset) => (
            <Fragment key={asset.asset_id}>
              <tr className="hover:bg-[#f8faff]">
                <td className={`${cellClassName} pl-[19px] tabular-nums text-[#8a96a7]`}>
                  {asset.asset_id.toString().padStart(2, '0')}
                </td>
                <td className={cellClassName}>
                  <button
                    className="py-[3px] text-[10px] font-[650] text-[#2871da] hover:text-[#174fa1] hover:underline focus-visible:outline-2 focus-visible:outline-[#347ee9] focus-visible:outline-offset-[3px]"
                    type="button"
                    aria-expanded={selectedAssetId === asset.asset_id}
                    aria-controls={selectedAssetId === asset.asset_id ? 'asset-details' : undefined}
                    aria-label={`View details for asset ${asset.asset_identifier}`}
                    onClick={() => onSelectAsset(selectedAssetId === asset.asset_id ? null : asset.asset_id)}
                  >
                    {asset.asset_identifier}
                  </button>
                </td>
                <td className={`${cellClassName} font-[570] text-[#39465a]`}>{asset.name}</td>
                <td className={cellClassName}>{asset.equipment_type.category.name}</td>
                <td className={cellClassName}>{asset.equipment_type.name}</td>
                <td className={cellClassName}>
                  <span className={`inline-flex min-w-[68px] items-center justify-center rounded-xl px-2 py-1 text-[9px] font-[650] ${statusClassNames[asset.status]}`}>
                    {asset.status.replaceAll('_', ' ')}
                  </span>
                </td>
                <td className={cellClassName}>{asset.acquisition_date ?? '—'}</td>
              </tr>
              {selectedAssetId === asset.asset_id && (
                <tr>
                  <td className="h-auto border-t border-[#edf0f4] bg-[#f8faff] px-[18px] pb-4 pt-3" colSpan={7}>
                    <AssetDetails
                      asset={asset}
                      onAssetUpdated={onAssetUpdated}
                      onClose={() => onSelectAsset(null)}
                    />
                  </td>
                </tr>
              )}
            </Fragment>
          ))}
          {!isLoading && assets.length === 0 && (
            <tr>
              <td className="h-[116px] border-t border-[#edf0f4] px-[14px] text-center text-[10px] text-[#8792a2] whitespace-normal" colSpan={7}>
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
