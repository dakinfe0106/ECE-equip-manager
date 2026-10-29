import type { AssetRecord } from './api'

export type AssetView = 'list' | 'category' | 'type'
export type AssetGrouping = Exclude<AssetView, 'list'>

export interface AssetGroup {
  key: number
  label: string
  // Shown next to the label; for type groups, the category, since type names can repeat across categories.
  detail?: string
  assets: AssetRecord[]
}

export function groupAssets(assets: AssetRecord[], grouping: AssetGrouping): AssetGroup[] {
  const groups = new Map<number, AssetGroup>()

  for (const asset of assets) {
    const type = asset.equipment_type
    const group =
      grouping === 'category'
        ? { key: type.category.category_id, label: type.category.name }
        : { key: type.type_id, label: type.name, detail: type.category.name }
    const existing = groups.get(group.key)
    if (existing) {
      existing.assets.push(asset)
    } else {
      groups.set(group.key, { ...group, assets: [asset] })
    }
  }

  return [...groups.values()].sort(
    (a, b) => a.label.localeCompare(b.label) || (a.detail ?? '').localeCompare(b.detail ?? ''),
  )
}
