
interface LoanSearchProps {
  value: string
  onChange: (value: string) => void
}

export default function LoanSearch({
  value,
  onChange,
}: LoanSearchProps) {
  return (
    <div className="relative w-full max-w-[300px]">
      {/* Search icon */}
      <svg
        className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-secondary"
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
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
        className="h-[38px] w-full rounded-lg border border-border bg-surface pl-9 pr-3 text-xs text-primary outline-none placeholder:text-secondary focus:border-accent focus:ring-2 focus:ring-accent/10"
      />
    </div>
  )
}
