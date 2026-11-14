interface LoanSearchProps {
  value: string
  onChange: (value: string) => void
}

export default function LoanSearch({
  value,
  onChange,
}: LoanSearchProps) {
  return (
    <div className="flex w-[min(360px,100%)] items-center gap-2 rounded-lg border border-line bg-page px-[11px] text-subtle focus-within:border-primary focus-within:shadow-[0_0_0_3px_var(--color-primary-soft)]">
      <svg
        className="h-4 w-4 shrink-0 fill-none stroke-current stroke-[1.8] [stroke-linecap:round]"
        viewBox="0 0 24 24"
        aria-hidden="true"
      >
        <circle cx="11" cy="11" r="7" />
        <path d="m20 20-4-4" />
      </svg>

      <input
        type="search"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder="Search asset, borrower, or ID..."
        aria-label="Search loans"
        className="w-full border-0 bg-transparent py-[9px] text-[11px] text-body outline-none placeholder:text-subtle [&::-webkit-search-cancel-button]:hidden"
      />
    </div>
  )
}