import { describe, expect, it } from 'vitest'
import type { AssetRecord } from '../features/assets/api'
import { groupAssets } from '../features/assets/groupAssets'

function makeAsset(
  assetId: number,
  type: { id: number; name: string },
  category: { id: number; name: string },
): AssetRecord {
  return {
    asset_id: assetId,
    asset_identifier: `A-${assetId}`,
    name: `Asset ${assetId}`,
    acquisition_date: null,
    status: 'Available',
    equipment_type: {
      type_id: type.id,
      name: type.name,
      description: '',
      category: { category_id: category.id, name: category.name },
    },
  }
}

const tools = { id: 1, name: 'Tools' }
const meters = { id: 2, name: 'Meters' }
const assets = [
  makeAsset(1, { id: 10, name: 'Drills' }, tools),
  makeAsset(2, { id: 20, name: 'Multimeters' }, meters),
  makeAsset(3, { id: 11, name: 'Kits' }, tools),
  makeAsset(4, { id: 10, name: 'Drills' }, tools),
  makeAsset(5, { id: 21, name: 'Kits' }, meters),
]

describe('groupAssets', () => {
  it('groups by category, sorted by name, keeping asset order', () => {
    const groups = groupAssets(assets, 'category')

    expect(groups.map((group) => group.label)).toEqual(['Meters', 'Tools'])
    expect(groups[1].assets.map((asset) => asset.asset_id)).toEqual([1, 3, 4])
    expect(groups[0].detail).toBeUndefined()
  })

  it('groups by equipment type and tells same-named types apart by category', () => {
    const groups = groupAssets(assets, 'type')

    expect(groups.map((group) => [group.label, group.detail, group.assets.length])).toEqual([
      ['Drills', 'Tools', 2],
      ['Kits', 'Meters', 1],
      ['Kits', 'Tools', 1],
      ['Multimeters', 'Meters', 1],
    ])
  })

  it('returns no groups for no assets', () => {
    expect(groupAssets([], 'category')).toEqual([])
  })
})
