import { renderToString } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import type { AssetRecord } from '../features/assets/api'
import AssetSearchToolbar from '../features/assets/components/AssetSearchToolbar'
import AssetTable from '../features/assets/components/AssetTable'
import AssetViewBy from '../features/assets/components/AssetViewBy'

function makeAsset(overrides: Partial<AssetRecord> = {}): AssetRecord {
  return {
    asset_id: 1,
    asset_identifier: 'ECE-OSC-001',
    name: 'Rigol DS1054Z',
    acquisition_date: '2022-09-01',
    status: 'Available',
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

function renderTable(props: Partial<Parameters<typeof AssetTable>[0]> = {}) {
  return renderToString(
    <AssetTable
      appliedSearch=""
      assets={[makeAsset()]}
      errorMessage=""
      isLoading={false}
      onSelectAsset={noop}
      selectedAssetId={null}
      {...props}
    />,
  )
}

describe('AssetTable layout', () => {
  it('shows the mockup columns and the asset fields', () => {
    const html = renderTable()

    for (const header of ['Asset ID', 'Asset Name', 'Category', 'Equipment Type', 'Status']) {
      expect(html).toContain(`>${header}</th>`)
    }
    expect(html).not.toContain('Acquisition Date')
    expect(html).toContain('ECE-OSC-001')
    expect(html).toContain('Rigol DS1054Z')
    expect(html).toContain('Test &amp; Measurement')
    expect(html).toContain('Oscilloscope')
  })

  it.each([
    ['Available', 'Available', 'badge-success'],
    ['On_Loan', 'On Loan', 'badge-warning'],
    ['Under_Maintenance', 'Under Maintenance', 'badge-danger'],
    ['Retired', 'Retired', 'badge-neutral'],
  ] as const)('shows %s as a "%s" badge', (status, label, toneClass) => {
    const html = renderTable({ assets: [makeAsset({ status })] })

    expect(html).toContain(toneClass)
    expect(html).toContain(label)
    if (label !== status) {
      expect(html).not.toContain(status)
    }
  })

  it('shows the empty, no-match, and error messages', () => {
    expect(renderTable({ assets: [] })).toContain('No active assets are available.')
    expect(renderTable({ assets: [], appliedSearch: 'X-1' })).toContain(
      'No matching asset was found.',
    )
    expect(renderTable({ assets: [], errorMessage: 'Could not connect' })).toContain(
      'The asset list could not be loaded.',
    )
  })

  it('does not show the empty message while loading', () => {
    expect(renderTable({ assets: [], isLoading: true })).not.toContain('No active assets')
  })
})

describe('Assets page controls', () => {
  it('shows a disabled Filters button next to the Asset ID search', () => {
    const html = renderToString(
      <AssetSearchToolbar
        assetIdentifier=""
        isLoading={false}
        onAssetIdentifierChange={noop}
        onClear={noop}
        onSearch={noop}
      />,
    )

    expect(html).toContain('Search Asset IDs...')
    expect(html).toMatch(/<button[^>]*disabled=""[^>]*title="Filtering is not available yet"/)
    expect(html).toContain('Filters')
  })

  it('shows View by with List selected and disabled', () => {
    const html = renderToString(<AssetViewBy />)

    expect(html).toContain('View by')
    expect(html).toMatch(/<select[^>]*disabled=""/)
    expect(html).toContain('<option value="List" selected="">List</option>')
  })
})
