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
    <div className="absolute right-0 top-full z-40 mt-2 w-[320px] rounded-lg border border-line bg-white p-4 shadow-lg">
      <form onSubmit={handleApply}>
        <div className="mb-4 flex items-center justify-between">
          <h3 className="m-0 text-sm font-semibold text-body">
            Filter records
          </h3>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close filters"
            className="rounded px-2 py-1 text-subtle hover:bg-page hover:text-body focus-visible:outline-2 focus-visible:outline-primary"
          >
            ×
          </button>
        </div>

        <label className="mb-3 flex flex-col gap-1 text-xs font-medium text-body">
          Loan state
          <select
            value={draftFilters.loanState}
            onChange={(event) =>
              updateFilter(
                'loanState',
                event.target.value as LoanFilters['loanState'],
              )
            }
            className="min-h-9 rounded-md border border-input bg-white px-2 text-xs text-body outline-none focus:border-primary"
          >
            <option value="all">All loan states</option>
            <option value="on_loan">Active</option>
            <option value="overdue">Overdue</option>
            <option value="returned">Completed</option>
          </select>
        </label>

        <div className="mb-3">
          <p className="mb-1 text-xs font-medium text-body">
            Expected return date
          </p>

          <div className="grid grid-cols-2 gap-2">
            <label className="flex flex-col gap-1 text-[10px] text-muted">
              From
              <input
                type="date"
                value={draftFilters.expectedReturnDateFrom}
                onChange={(event) =>
                  updateFilter('expectedReturnDateFrom', event.target.value)
                }
                className="min-h-9 rounded-md border border-input bg-white px-2 text-xs text-body outline-none focus:border-primary"
              />
            </label>

            <label className="flex flex-col gap-1 text-[10px] text-muted">
              To
              <input
                type="date"
                min={draftFilters.expectedReturnDateFrom || undefined}
                value={draftFilters.expectedReturnDateTo}
                onChange={(event) =>
                  updateFilter('expectedReturnDateTo', event.target.value)
                }
                className="min-h-9 rounded-md border border-input bg-white px-2 text-xs text-body outline-none focus:border-primary"
              />
            </label>
          </div>
        </div>

        <label className="mb-4 flex flex-col gap-1 text-xs font-medium text-body">
          Asset status
          <select
            value={draftFilters.assetStatus}
            onChange={(event) =>
              updateFilter(
                'assetStatus',
                event.target.value as LoanFilters['assetStatus'],
              )
            }
            className="min-h-9 rounded-md border border-input bg-white px-2 text-xs text-body outline-none focus:border-primary"
          >
            <option value="all">All statuses</option>
            <option value="available">Available</option>
            <option value="on_loan">On Loan</option>
          </select>
        </label>

        <div className="flex items-center justify-between border-t border-divider pt-3">
          <button
            type="button"
            onClick={handleReset}
            className="rounded-md px-2 py-2 text-xs font-medium text-primary hover:bg-primary-soft"
          >
            Reset
          </button>

          <button
            type="submit"
            className="rounded-md bg-primary px-3 py-2 text-xs font-semibold text-white hover:bg-primary-hover"
          >
            Apply Filters
          </button>
        </div>
      </form>
    </div>
  )
}