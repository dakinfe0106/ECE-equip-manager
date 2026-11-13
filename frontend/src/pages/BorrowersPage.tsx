import { useEffect, useState, type FormEvent } from 'react'
import PageIntro from '../components/ui/PageIntro'
import Panel from '../components/ui/Panel'
import BorrowerDetailsWorkflow from '../features/borrowers/components/BorrowerDetailsWorkflow'
import BorrowerPagination from '../features/borrowers/components/BorrowerPagination'
import BorrowerSearchToolbar from '../features/borrowers/components/BorrowerSearchToolbar'
import BorrowerTable from '../features/borrowers/components/BorrowerTable'
import {
  describeBorrowerDetailsError,
  fetchBorrowerDetails,
  type BorrowerDetailsRecord,
  type BorrowerRecord,
} from '../features/borrowers/api'
import useBorrowers from '../features/borrowers/hooks/useBorrowers'
import type { BorrowerDetailsLoadState, BorrowerDetailsViewModel } from '../features/borrowers/types'

export default function BorrowersPage() {
  const [search, setSearch] = useState('')
  const [appliedSearch, setAppliedSearch] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [selectedBorrower, setSelectedBorrower] = useState<BorrowerRecord | null>(null)
  const [borrowerDetailsRecord, setBorrowerDetailsRecord] = useState<BorrowerDetailsRecord | null>(null)
  const [detailsResult, setDetailsResult] = useState<{
    borrowerId: number
    attempt: number
    state: BorrowerDetailsLoadState
  }>()
  const [detailsRetry, setDetailsRetry] = useState(0)
  const {
    borrowers,
    errorMessage,
    isLoading,
    pageCount,
    pageSize,
    totalCount,
  } = useBorrowers(currentPage, appliedSearch)

  useEffect(() => {
    if (!selectedBorrower) return

    const controller = new AbortController()
    const selectedBorrowerId = selectedBorrower.borrower_id

    fetchBorrowerDetails(selectedBorrowerId, controller.signal).then(
      (record) => {
        if (record.borrower_id !== selectedBorrowerId) {
          throw new Error('The borrower details response did not match the selected borrower.')
        }
        if (!controller.signal.aborted) {
          setBorrowerDetailsRecord(record)
          setDetailsResult({
            borrowerId: selectedBorrowerId,
            attempt: detailsRetry,
            state: { status: 'loaded' },
          })
        }
      },
      (error: unknown) => {
        if (!controller.signal.aborted) {
          setDetailsResult({
            borrowerId: selectedBorrowerId,
            attempt: detailsRetry,
            state: { status: 'error', message: describeBorrowerDetailsError(error) },
          })
        }
      },
    ).catch((error: unknown) => {
      if (!controller.signal.aborted) {
        setDetailsResult({
          borrowerId: selectedBorrowerId,
          attempt: detailsRetry,
          state: { status: 'error', message: describeBorrowerDetailsError(error) },
        })
      }
    })

    return () => controller.abort()
  }, [selectedBorrower, detailsRetry])

  const currentDetailsRecord = borrowerDetailsRecord?.borrower_id === selectedBorrower?.borrower_id
    ? borrowerDetailsRecord
    : undefined
  const currentDetailsLoadState = detailsResult
    && selectedBorrower
    && detailsResult.borrowerId === selectedBorrower.borrower_id
    && detailsResult.attempt === detailsRetry
    ? detailsResult.state
    : { status: 'loading' as const }

  const searchBorrowers = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setCurrentPage(1)
    setAppliedSearch(search.trim())
  }

  const clearSearch = () => {
    setSearch('')
    setCurrentPage(1)
    setAppliedSearch('')
  }

  const borrowerDetails: BorrowerDetailsViewModel | null = selectedBorrower
    ? {
      borrower_id: currentDetailsRecord?.borrower_id ?? selectedBorrower.borrower_id,
      borrower_name: [
        currentDetailsRecord?.first_name ?? selectedBorrower.first_name,
        currentDetailsRecord?.last_name ?? selectedBorrower.last_name,
      ]
        .filter(Boolean)
        .join(' '),
      unb_id: currentDetailsRecord?.unb_id ?? selectedBorrower.unb_id,
      negligent_damage_flag: currentDetailsRecord?.negligent_damage_flag,
    }
    : null

  return (
    <>
      <section
        className="mx-auto flex h-full min-h-0 w-full max-w-[1500px] flex-col px-[34px] pt-[34px] pb-[50px] max-[760px]:px-4 max-[760px]:pt-6 max-[760px]:pb-10"
        aria-labelledby="page-title"
      >
        <PageIntro
          title="Borrowers"
          description="Find borrowers and review their records."
        />

        <Panel className="flex min-h-0 flex-1 flex-col overflow-hidden" label="Borrower search results">
          <BorrowerSearchToolbar
            isLoading={isLoading}
            onSearch={searchBorrowers}
            onSearchChange={setSearch}
            onClear={clearSearch}
            search={search}
          />

          {errorMessage && (
            <p
              className="mx-[17px] mt-[13px] mb-0 rounded-lg border border-danger/20 bg-danger-soft px-[11px] py-[9px] text-[11px] text-danger"
              role="alert"
            >
              <strong>Unable to load borrowers.</strong> {errorMessage}
            </p>
          )}
          {isLoading && (
            <p
              className="mx-[17px] mt-[13px] mb-0 rounded-lg border border-primary/20 bg-primary-soft px-[11px] py-[9px] text-[11px] text-primary"
              role="status"
            >
              Loading borrower records…
            </p>
          )}

          <BorrowerTable
            appliedSearch={appliedSearch}
            borrowers={borrowers}
            errorMessage={errorMessage}
            isLoading={isLoading}
            onViewDetails={(record) => {
              setBorrowerDetailsRecord(null)
              setSelectedBorrower(record)
            }}
          />
          <BorrowerPagination
            currentPage={currentPage}
            isLoading={isLoading}
            onPageChange={setCurrentPage}
            pageCount={pageCount}
            pageSize={pageSize}
            totalCount={totalCount}
          />
        </Panel>
      </section>
      {borrowerDetails && (
        <BorrowerDetailsWorkflow
          key={borrowerDetails.borrower_id}
          borrower={borrowerDetails}
          detailsLoadState={currentDetailsLoadState}
          onRetryDetails={() => setDetailsRetry((retry) => retry + 1)}
          onClose={() => setSelectedBorrower(null)}
        />
      )}
    </>
  )
}
