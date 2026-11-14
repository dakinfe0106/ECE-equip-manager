import { useState } from 'react'
import PageIntro from '../components/ui/PageIntro'
import Panel from '../components/ui/Panel'
import LoanDetailsModal from '../features/lending/components/LoanDetailsModal'
import LoanFilters from '../features/lending/components/LoanFilters'
import LoanSearch from '../features/lending/components/LoanSearch'
import LoanTable from '../features/lending/components/LoanTable'
import useLoans from '../features/lending/hooks/useLoans'
import {
  defaultLoanFilters,
  type LoanFilters as LoanFiltersType,
  type LoanRecord,
} from '../features/lending/types'

export default function LendingPage() {
  const [search, setSearch] = useState('')
  const [filters, setFilters] = useState<LoanFiltersType>({
    ...defaultLoanFilters,
  })
  const [showFilters, setShowFilters] = useState(false)
  const [selectedLoan, setSelectedLoan] = useState<LoanRecord | null>(null)

  const { loans, isLoading, errorMessage } = useLoans(filters, search)

  return (
    <section
      className="mx-auto w-full max-w-[1500px] px-[34px] pb-[50px] pt-[34px]"
      aria-labelledby="page-title"
    >
      <PageIntro
        title="Lending"
        description="Manage checkouts, returns, and complete lending history."
      />

      <Panel>
        <div className="flex min-h-[66px] items-center justify-between gap-[18px] border-b border-divider px-[17px] py-[14px] max-[520px]:flex-col max-[520px]:items-stretch max-[520px]:gap-[10px]">
          <LoanSearch
            value={search}
            onChange={setSearch}
          />

          <div className="relative">
            <button
              type="button"
              onClick={() => setShowFilters((current) => !current)}
              className="flex min-h-9 items-center gap-[7px] rounded-lg border border-input bg-white px-[10px] text-[10px] font-[650] text-body"
            >
              <svg
                className="h-[15px] w-[15px] fill-none stroke-current stroke-[1.8] [stroke-linecap:round] [stroke-linejoin:round]"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path d="M4 5h16l-6 7v5l-4 2v-7z" />
              </svg>

              Filters

              <span className="rounded-full bg-neutral-soft px-[5px] py-[2px] text-[8px] text-muted">
                All
              </span>
            </button>

            {showFilters && (
              <LoanFilters
                filters={filters}
                onApply={setFilters}
                onClose={() => setShowFilters(false)}
              />
            )}
          </div>
        </div>

        {isLoading && (
          <div className="py-8 text-center text-[12px] text-muted">
            Loading lending records...
          </div>
        )}

        {errorMessage && (
          <div
            role="alert"
            className="m-4 rounded-[8px] border border-danger/20 bg-danger-soft px-4 py-3 text-[12px] text-danger"
          >
            <strong className="block">
              Unable to load lending records
            </strong>
            <span>{errorMessage}</span>
          </div>
        )}

        {!isLoading && !errorMessage && (
          <LoanTable
            loans={loans}
            onSelectLoan={setSelectedLoan}
          />
        )}
      </Panel>

      <LoanDetailsModal
        loan={selectedLoan}
        onClose={() => setSelectedLoan(null)}
      />
    </section>
  )
}