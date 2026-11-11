import type { AssetView } from '../groupAssets'

const viewOptions: { value: AssetView; label: string }[] = [
  { value: 'list', label: 'List' },
  { value: 'category', label: 'Category' },
  { value: 'type', label: 'Equipment Type' },
]

interface AssetViewByProps {
  value: AssetView
  onChange: (view: AssetView) => void
}

export default function AssetViewBy({ value, onChange }: AssetViewByProps) {
  return (
    <div className="inline-flex items-stretch rounded-lg border border-input bg-white shadow-[0_1px_2px_rgb(16_24_40_/_4%)] focus-within:border-primary focus-within:shadow-[0_0_0_3px_var(--color-primary-soft)]">
      <label
        className="inline-flex items-center whitespace-nowrap rounded-l-[7px] border-r border-line bg-page px-[10px] text-[10px] font-[550] text-muted"
        htmlFor="asset-view-by"
      >
        View by
      </label>
      <span className="relative inline-flex max-[520px]:flex-1">
        <select
          id="asset-view-by"
          className="min-h-9 w-[145px] cursor-pointer appearance-none rounded-r-[7px] border-0 bg-white pr-8 pl-[11px] text-[11px] font-[650] text-body outline-none max-[520px]:w-full"
          value={value}
          onChange={(event) =>
            onChange(viewOptions.find((option) => option.value === event.target.value)?.value ?? 'list')
          }
        >
          {viewOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <svg
          className="pointer-events-none absolute top-1/2 right-[10px] h-4 w-4 -translate-y-1/2 fill-none stroke-subtle stroke-[1.8] [stroke-linecap:round] [stroke-linejoin:round]"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path d="m6 9 6 6 6-6" />
        </svg>
      </span>
    </div>
  )
}
