
import { useEffect, useState } from 'react'
import PageIntro from '../components/ui/PageIntro'
import Panel from '../components/ui/Panel'
import LoanDetailsModal from '../features/lending/components/LoanDetailsModal'
import LoanFilters from '../features/lending/components/LoanFilters'
import LoanSearch from '../features/lending/components/LoanSearch'
import LoanTable from '../features/lending/components/LoanTable'
import useLoans from '../features/lending/hooks/useLoans'
import CheckoutModal from '../features/lending/components/CheckoutModal'
import ReturnLoanModal from '../features/lending/components/ReturnLoanModal'
import MaintenanceRecordDialog from '../features/maintenance/components/MaintenanceRecordDialog'
import ExtendLoanModal from '../features/lending/components/ExtendLoanModal'
import {
  defaultLoanFilters,
  type LoanFilters as LoanFiltersType,
  type LoanRecord,
} from '../features/lending/types'

interface PreselectedMaintenanceAsset {
  asset_id: number
  asset_identifier: string
  name: string
}

export default function LendingPage() {
  const [showCheckoutModal, setShowCheckoutModal] = useState(false)
  const [showExtendLoanModal, setShowExtendLoanModal] = useState(false)
  const [extensionSuccessMessage, setExtensionSuccessMessage] = useState('')
  const [showReturnLoanModal, setShowReturnLoanModal] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)
  const [checkoutSuccessMessage, setCheckoutSuccessMessage] = useState('')
  const [returnSuccessMessage, setReturnSuccessMessage] = useState('')
  const [maintenanceSuccessMessage, setMaintenanceSuccessMessage] = useState('')
  const [maintenanceAsset, setMaintenanceAsset] =
    useState<PreselectedMaintenanceAsset | null>(null)
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [filters, setFilters] = useState<LoanFiltersType>({
    ...defaultLoanFilters,
  })
  const [showFilters, setShowFilters] = useState(false)
  const [selectedLoan, setSelectedLoan] = useState<LoanRecord | null>(null)

  // Wait until typing stops before requesting new results.
  useEffect(() => {
    const timeout = setTimeout(() => {
      setDebouncedSearch(search)
    }, 300)

    return () => clearTimeout(timeout)
  }, [search])

  const { loans, isLoading, errorMessage } = useLoans(
    filters,
    debouncedSearch,
    refreshKey,
  )

  // Count only filters that differ from their default values.
  const activeFilterCount = (
    Object.keys(defaultLoanFilters) as Array<keyof LoanFiltersType>
  ).filter((key) => filters[key] !== defaultLoanFilters[key]).length

  const hasLoans = loans.length > 0

  return (
    <section
      className="mx-auto w-full max-w-[1500px] px-[34px] pb-[50px] pt-[34px]"
      aria-labelledby="page-title"
    >
      <PageIntro
        title="Lending"
        description="Manage checkouts, returns, and complete lending history."
        actions={
          <button
            type="button"
            onClick={() => setShowCheckoutModal(true)}
            className="inline-flex min-h-[38px] items-center justify-center rounded-lg border border-primary bg-primary px-[15px] text-[11px] font-semibold text-white hover:bg-primary-hover focus-visible:outline-2 focus-visible:outline-primary focus-visible:outline-offset-2"
          >
            + New Loan
          </button>
        }
      />

      {checkoutSuccessMessage && (
        <div
          role="status"
          aria-live="polite"
          className="mb-4 flex items-center justify-between gap-3 rounded-lg border border-success/20 bg-success-soft px-4 py-3 text-[11px] text-success"
        >
          <span>{checkoutSuccessMessage}</span>
          <button
            type="button"
            aria-label="Dismiss checkout confirmation"
            onClick={() => setCheckoutSuccessMessage('')}
            className="rounded px-2 py-1 font-semibold hover:bg-white/50"
          >
            ×
          </button>
        </div>
      )}

      {returnSuccessMessage && (
        <div
          role="status"
          aria-live="polite"
          className="mb-4 flex items-center justify-between gap-3 rounded-lg border border-success/20 bg-success-soft px-4 py-3 text-[11px] text-success"
        >
          <span>{returnSuccessMessage}</span>
          <button
            type="button"
            aria-label="Dismiss return confirmation"
            onClick={() => setReturnSuccessMessage('')}
            className="rounded px-2 py-1 font-semibold hover:bg-white/50"
          >
            ×
          </button>
        </div>
      )}

      {maintenanceSuccessMessage && (
        <div
          role="status"
          aria-live="polite"
          className="mb-4 flex items-center justify-between gap-3 rounded-lg border border-success/20 bg-success-soft px-4 py-3 text-[11px] text-success"
        >
          <span>{maintenanceSuccessMessage}</span>
          <button
            type="button"
            aria-label="Dismiss maintenance confirmation"
            onClick={() => setMaintenanceSuccessMessage('')}
            className="rounded px-2 py-1 font-semibold hover:bg-white/50"
          >
            ×
          </button>
        </div>
      )}

      {extensionSuccessMessage && (
        <div
          role="status"
          aria-live="polite"
          className="mb-4 flex items-center justify-between gap-3 rounded-lg border border-success/20 bg-success-soft px-4 py-3 text-[11px] text-success"
        >
          <span>{extensionSuccessMessage}</span>
          <button
            type="button"
            aria-label="Dismiss extension confirmation"
            onClick={() => setExtensionSuccessMessage('')}
            className="rounded px-2 py-1 font-semibold hover:bg-white/50"
          >
            ×
          </button>
        </div>
      )}

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

              {activeFilterCount > 0 && (
                <span className="rounded-full bg-neutral-soft px-[5px] py-[2px] text-[8px] text-muted">
                  {activeFilterCount}
                </span>
              )}
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
          <div
            role="status"
            aria-live="polite"
            className="py-3 text-center text-[12px] text-muted"
          >
            {hasLoans
              ? 'Updating lending records...'
              : 'Loading lending records...'}
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

        {(hasLoans || (!isLoading && !errorMessage)) && (
          <LoanTable
            loans={loans}
            onSelectLoan={setSelectedLoan}
          />
        )}
      </Panel>

      <LoanDetailsModal
        loan={selectedLoan}
        onClose={() => setSelectedLoan(null)}
        onExtendLoan={() => setShowExtendLoanModal(true)}
        onProcessReturn={() => setShowReturnLoanModal(true)}
      />

      {showExtendLoanModal && selectedLoan && (
        <ExtendLoanModal
          loan={selectedLoan}
          onClose={() => setShowExtendLoanModal(false)}
          onSuccess={(updatedLoan) => {
            setSelectedLoan(updatedLoan)
            setShowExtendLoanModal(false)
            setExtensionSuccessMessage(
              `The loan for ${updatedLoan.equipment_name} has been extended successfully.`,
            )
            setRefreshKey((current) => current + 1)
          }}
        />
      )}

      {showReturnLoanModal && selectedLoan && (
        <ReturnLoanModal
          loan={selectedLoan}
          onClose={() => setShowReturnLoanModal(false)}
          onSuccess={(result) => {
            const returnedLoan = result.loan

            setShowReturnLoanModal(false)
            setSelectedLoan(null)
            setRefreshKey((current) => current + 1)

            if (result.maintenance_required) {
              setReturnSuccessMessage(
                `${returnedLoan.equipment_name} was returned as damaged and marked Under Maintenance.`,
              )

              setMaintenanceAsset({
                asset_id: returnedLoan.asset_id,
                asset_identifier: returnedLoan.asset_identifier,
                name: returnedLoan.equipment_name,
              })
            } else {
              setReturnSuccessMessage(
                `${returnedLoan.equipment_name} was returned successfully. The equipment is now available.`,
              )
            }
          }}
        />
      )}

      {maintenanceAsset && (
        <MaintenanceRecordDialog
          mode="create"
          preselectedAsset={maintenanceAsset}
          onClose={() => setMaintenanceAsset(null)}
          onCreated={() => {
            const equipmentName = maintenanceAsset.name

            setMaintenanceAsset(null)
            setMaintenanceSuccessMessage(
              `A maintenance record for ${equipmentName} was created successfully.`,
            )
            setRefreshKey((current) => current + 1)
          }}
        />
      )}

      {showCheckoutModal && (
        <CheckoutModal
          onClose={() => setShowCheckoutModal(false)}
          onSuccess={(loan) => {
            setShowCheckoutModal(false)
            setCheckoutSuccessMessage(
              `${loan.equipment_name} was checked out to ${loan.borrower_name}.`,
            )
            setRefreshKey((current) => current + 1)
          }}
        />
      )}
    </section>
  )
}
