import { renderToString } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import type { AssetRecord } from '../features/assets/api'
import AssetDetails from '../features/assets/components/AssetDetails'
import AssetTable from '../features/assets/components/AssetTable'

function makeAsset(overrides: Partial<AssetRecord> = {}): AssetRecord {
  return {
    asset_id: 1,
    asset_identifier: 'ECE-OSC-001',
    name: 'Rigol DS1054Z',
    acquisition_date: '2022-09-01',
    status: 'On_Loan',
    equipment_type: {
      type_id: 3,
      name: 'Oscilloscope',
      description: 'Digital storage oscilloscope',
      category: { category_id: 2, name: 'Test & Measurement' },
    },
    ...overrides,
  }
}

const noop = () => {}

describe('AssetDetails modal', () => {
  it('shows every field required by the acceptance criteria', () => {
    const html = renderToString(
      <AssetDetails asset={makeAsset()} onAssetUpdated={noop} onClose={noop} />,
    )

    expect(html).toContain('<dialog')
    expect(html).toContain('aria-labelledby="details-title"')
    expect(html).toContain('ECE-OSC-001')
    expect(html).toContain('Rigol DS1054Z')
    expect(html).toContain('Test &amp; Measurement')
    expect(html).toContain('Oscilloscope')
    expect(html).toContain('2022-09-01')
    expect(html).toContain('status-on-loan')
    expect(html).toContain('On Loan')
    expect(html).toContain('Edit information')
    expect(html).toContain('Close asset details')
  })

  it('says when the acquisition date is missing', () => {
    const html = renderToString(
      <AssetDetails
        asset={makeAsset({ acquisition_date: null })}
        onAssetUpdated={noop}
        onClose={noop}
      />,
    )
    expect(html).toContain('Not recorded')
  })

  it('lists required certifications when the type has them', () => {
    const asset = makeAsset()
    asset.equipment_type.required_certifications = [
      { certification_id: 1, name: 'Lab Safety' },
      { certification_id: 2, name: 'High Voltage' },
    ]
    const html = renderToString(
      <AssetDetails asset={asset} onAssetUpdated={noop} onClose={noop} />,
    )

    expect(html).toContain('Required certifications')
    expect(html).toContain('Lab Safety')
    expect(html).toContain('High Voltage')
  })

  it('says none are required when the list is empty', () => {
    const asset = makeAsset()
    asset.equipment_type.required_certifications = []
    const html = renderToString(
      <AssetDetails asset={asset} onAssetUpdated={noop} onClose={noop} />,
    )

    expect(html).toContain('None required')
  })

  it('hides the certifications row until the API provides it', () => {
    const html = renderToString(
      <AssetDetails asset={makeAsset()} onAssetUpdated={noop} onClose={noop} />,
    )
    expect(html).not.toContain('Required certifications')
  })
})

describe('AssetTable', () => {
  it('opens details in a dialog instead of expanding the row inline', () => {
    const html = renderToString(
      <AssetTable
        appliedSearch=""
        assets={[makeAsset()]}
        errorMessage=""
        isLoading={false}
        onSelectAsset={noop}
        selectedAssetId={1}
      />,
    )

    expect(html).toContain('aria-haspopup="dialog"')
    expect(html).toContain('row-selected')
    expect(html).not.toContain('EQUIPMENT RECORD')
  })
})
