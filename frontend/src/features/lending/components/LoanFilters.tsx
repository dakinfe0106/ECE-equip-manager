
import { useState } from 'react'
import {
  defaultLoanFilters,
  type LoanFilters,
} from '../types'

interface LoanFiltersProps {
  filters: LoanFilters
  onApply: (filters: LoanFilters) => void
  onClose: () => void
}

export default function LoanFilters({
  filters,
  onApply,
  onClose,
}: LoanFiltersProps) {
  const [draftFilters, setDraftFilters] = useState<LoanFilters>(() => ({
  ...filters,
}))

  function updateFilter<K extends keyof LoanFilters>(
    key: K,
    value: LoanFilters[K],
  ) {
    setDraftFilters((current) => ({
      ...current,
      [key]: value,
    }))
  }

  function handleReset() {
    setDraftFilters({ ...defaultLoanFilters })
  }

  function handleApply(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()

    onApply(draftFilters)
    onClose()
  }

  return (
    <div className="absolute right-0 top-full z-40 mt-2 w-[290px] rounded-xl border border-border bg-white p-4 shadow-xl">
      <form onSubmit={handleApply}>
        {/* Header */}
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-primary">
            Filter records
          </h3>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close filters"
            className="text-lg text-secondary hover:text-primary"
          >
            ×
          </button>
        </div>

        {/* Loan state */}
        <div className="mb-3">
          <label
            htmlFor="loan-state-filter"
            className="mb-1.5 block text-xs font-medium text-primary"
          >
            Loan state
          </label>

          <select
            id="loan-state-filter"
            value={draftFilters.loanState}
            onChange={(event) =>
              updateFilter(
                'loanState',
                event.target.value as LoanFilters['loanState'],
              )
            }
            className="h-9 w-full rounded-lg border border-border bg-white px-3 text-xs text-primary outline-none focus:border-accent"
          >
            <option value="all">All loan states</option>
            <option value="on_loan">Active</option>
            <option value="overdue">Overdue</option>
            <option value="returned">Completed</option>
          </select>
        </div>

        {/* Expected return date range */}
        <div className="mb-3">
          <p className="mb-1.5 text-xs font-medium text-primary">
            Expected return date
          </p>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label
                htmlFor="return-date-from"
                className="mb-1 block text-[10px] text-secondary"
              >
                From
              </label>

              <input
                id="return-date-from"
                type="date"
                value={draftFilters.expectedReturnDateFrom}
                onChange={(event) =>
                  updateFilter('expectedReturnDateFrom', event.target.value)
                }
                className="h-9 w-full rounded-lg border border-border bg-white px-2 text-xs text-primary outline-none focus:border-accent"
              />
            </div>

            <div>
              <label
                htmlFor="return-date-to"
                className="mb-1 block text-[10px] text-secondary"
              >
                To
              </label>

              <input
                id="return-date-to"
                type="date"
                min={draftFilters.expectedReturnDateFrom || undefined}
                value={draftFilters.expectedReturnDateTo}
                onChange={(event) =>
                  updateFilter('expectedReturnDateTo', event.target.value)
                }
                className="h-9 w-full rounded-lg border border-border bg-white px-2 text-xs text-primary outline-none focus:border-accent"
              />
            </div>
          </div>
        </div>

        {/* Asset status */}
        <div className="mb-4">
          <label
            htmlFor="asset-status-filter"
            className="mb-1.5 block text-xs font-medium text-primary"
          >
            Asset status
          </label>

          <select
            id="asset-status-filter"
            value={draftFilters.assetStatus}
            onChange={(event) =>
              updateFilter(
                'assetStatus',
                event.target.value as LoanFilters['assetStatus'],
              )
            }
            className="h-9 w-full rounded-lg border border-border bg-white px-3 text-xs text-primary outline-none focus:border-accent"
          >
            <option value="all">All statuses</option>
            <option value="available">Available</option>
            <option value="on_loan">On Loan</option>
          </select>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-border pt-3">
          <button
            type="button"
            onClick={handleReset}
            className="text-xs font-medium text-accent hover:underline"
          >
            Reset
          </button>

          <button
            type="submit"
            className="rounded-lg bg-accent px-4 py-2.5 text-xs font-semibold text-white shadow-sm hover:opacity-90"
          >
            Apply Filters
          </button>
        </div>
      </form>
    </div>
  )
}
