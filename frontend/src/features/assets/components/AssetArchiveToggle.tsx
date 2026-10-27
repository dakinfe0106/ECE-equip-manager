// Placeholder: the asset list API returns active assets only.
export default function AssetArchiveToggle() {
  return (
    <label
      className="flex min-h-[42px] cursor-not-allowed items-center gap-2 border-b border-divider bg-page px-[17px] text-[10px] font-[650] text-muted opacity-60"
      title="Archived assets are not available yet"
    >
      <input className="m-0 accent-primary" type="checkbox" disabled />
      <span>Include Archived</span>
    </label>
  )
}
