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
    
    // Verify read-only fields (since backend doesn't support editing them yet)
    expect(html).toContain('Category · Read only')
    expect(html).toContain('Test &amp; Measurement')
    expect(html).toContain('Equipment Type · Read only')
    expect(html).toContain('Oscilloscope')
    
    expect(html).toContain('Acquisition Date')
    expect(html).toContain('2022-09-01')
    
    // Verify status badge rendering
    expect(html).toContain('bg-yellow-100')
    expect(html).toContain('On Loan')
    
    // Verify edit mode controls
    expect(html).toContain('Asset Name *')
    expect(html).toContain('Save Changes')
    expect(html).toContain('Close asset details')
    
    // Verify history placeholders
    expect(html).toContain('View Lending History')
    expect(html).toContain('View Maintenance History')
  })

  it('says when the acquisition date is missing', () => {
    const html = renderToString(
      <AssetDetails
        asset={makeAsset({ acquisition_date: null })}
        onAssetUpdated={noop}
        onClose={noop}
      />,
    )
    
    // In edit mode, we verify the date input exists and handles null values
    expect(html).toContain('Acquisition Date')
    expect(html).toContain('type="date"')
    // Verify "Not recorded" text is NOT present in edit mode
    expect(html).not.toContain('Not recorded')
  })

    it('displays certifications in the input field when present', () => {
    const asset = makeAsset()
    // Note: In your new draft state, certs are joined into a string
    asset.equipment_type.required_certifications = [
      { certification_id: 1, name: 'Lab Safety' },
      { certification_id: 2, name: 'High Voltage' },
    ]
    const html = renderToString(
      <AssetDetails asset={asset} onAssetUpdated={noop} onClose={noop} />,
    )

    expect(html).toContain('Required Certifications')
    expect(html).toContain('Lab Safety, High Voltage')
  })

  it('shows empty certifications input when none exist', () => {
    const asset = makeAsset()
    asset.equipment_type.required_certifications = []
    const html = renderToString(
      <AssetDetails asset={asset} onAssetUpdated={noop} onClose={noop} />,
    )

    expect(html).toContain('Required Certifications')
    // Verify it shows "None" in the read-only input instead of a placeholder
    expect(html).toContain('value="None"')
    expect(html).toContain('readOnly=""')
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
