// Only List view exists until grouping by category and type is built (#63).
export default function AssetViewBy() {
  return (
    <div className="inline-flex items-stretch rounded-lg border border-input bg-white shadow-[0_1px_2px_rgb(16_24_40_/_4%)] focus-within:border-primary focus-within:shadow-[0_0_0_3px_var(--color-primary-soft)]">
      <label
        className="inline-flex items-center whitespace-nowrap rounded-l-[7px] border-r border-line bg-page px-[10px] text-[10px] font-[550] text-muted"
        htmlFor="asset-view-by"
      >
        View by
      </label>
      <select
        id="asset-view-by"
        className="min-h-9 w-[145px] rounded-r-[7px] border-0 bg-white px-[10px] text-[11px] font-[650] text-body outline-none disabled:cursor-not-allowed disabled:opacity-60 max-[520px]:w-full"
        defaultValue="List"
        disabled
      >
        <option value="List">List</option>
      </select>
    </div>
  )
}
