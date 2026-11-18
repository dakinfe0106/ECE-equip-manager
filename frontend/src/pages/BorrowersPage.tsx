import { useEffect, useState, type FormEvent } from 'react'
import PageIntro from '../components/ui/PageIntro'
import Panel from '../components/ui/Panel'
import { fetchAllAssets } from '../features/assets/api'
import {
  describeBorrowerDetailsError,
  fetchBorrowerDetails,
  type BorrowerDetailsRecord,
  type BorrowerRecord,
} from '../features/borrowers/api'
import AddBorrowerAction from '../features/borrowers/components/AddBorrowersAction'
import AddBorrowerModal from '../features/borrowers/components/AddBorrowersModal'
import BorrowerDetailsWorkflow from '../features/borrowers/components/BorrowerDetailsWorkflow'
import BorrowerPagination from '../features/borrowers/components/BorrowerPagination'
import BorrowerSearchToolbar from '../features/borrowers/components/BorrowerSearchToolbar'
import BorrowerTable from '../features/borrowers/components/BorrowerTable'
import {
  createDamageFlag,
  fetchDamageFlags,
  resolveDamageFlag,
  updateDamageFlag,
} from '../features/borrowers/damageFlagsApi'
import useBorrowers from '../features/borrowers/hooks/useBorrowers'
import type {
  BorrowerDetailsLoadState,
  BorrowerDetailsViewModel,
  DamageFlagEquipmentOption,
  DamageFlagUpdateInput,
} from '../features/borrowers/types'

export default function BorrowersPage() {
  const [search, setSearch] = useState('')
  const [appliedSearch, setAppliedSearch] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [isAddBorrowerOpen, setIsAddBorrowerOpen] = useState(false)
  const [createdBorrower, setCreatedBorrower] = useState<BorrowerRecord | null>(null)
  const [selectedBorrower, setSelectedBorrower] = useState<BorrowerRecord | null>(null)
  const [borrowerDetailsRecord, setBorrowerDetailsRecord] = useState<BorrowerDetailsRecord | null>(null)
  const [detailsResult, setDetailsResult] = useState<{
    borrowerId: number
    attempt: number
    state: BorrowerDetailsLoadState
  }>()
  const [detailsRetry, setDetailsRetry] = useState(0)
  const [equipmentRetry, setEquipmentRetry] = useState(0)
  const [equipmentResult, setEquipmentResult] = useState<{
    borrowerId: number
    options?: DamageFlagEquipmentOption[]
    error: string
  }>()
  const {
    addBorrower,
    borrowers,
    errorMessage,
    isLoading,
    pageCount,
    pageSize,
    replaceBorrower,
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

  useEffect(() => {
    if (!selectedBorrower) return undefined

    let active = true
    const borrowerId = selectedBorrower.borrower_id
    fetchAllAssets().then(
      (assets) => {
        if (active) {
          setEquipmentResult({
            borrowerId,
            options: assets.map((asset) => ({
              id: asset.asset_id,
              name: `${asset.name} (${asset.asset_identifier})`,
            })),
            error: '',
          })
        }
      },
      (error: unknown) => {
        if (active) {
          setEquipmentResult({
            borrowerId,
            error: error instanceof Error ? error.message : 'Could not load equipment options.',
          })
        }
      },
    )

    return () => {
      active = false
    }
  }, [selectedBorrower, equipmentRetry])

  const currentEquipmentResult = selectedBorrower
    && equipmentResult?.borrowerId === selectedBorrower.borrower_id
    ? equipmentResult
    : undefined
  const equipmentOptions = currentEquipmentResult?.options
  const equipmentOptionsError = currentEquipmentResult?.error ?? ''

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
    setCreatedBorrower(null)
    setCurrentPage(1)
    setAppliedSearch(search.trim())
  }

  const clearSearch = () => {
    setSearch('')
    setCreatedBorrower(null)
    setCurrentPage(1)
    setAppliedSearch('')
  }

  const handleBorrowerCreated = (borrower: BorrowerRecord) => {
    setIsAddBorrowerOpen(false)
    setCreatedBorrower(borrower)
    addBorrower(borrower)
  }

  const handleBorrowerUpdated = (updatedViewModel: BorrowerDetailsViewModel) => {
    const updatedRecord: BorrowerRecord = {
      borrower_id: updatedViewModel.borrower_id,
      unb_id: updatedViewModel.unb_id,
      first_name: updatedViewModel.borrower_name.split(' ')[0] ?? '',
      last_name: updatedViewModel.borrower_name.split(' ').slice(1).join(' '),
      is_manual_enrollment: updatedViewModel.is_manual_enrollment,
    }
    replaceBorrower(updatedRecord)
    if (borrowerDetailsRecord && borrowerDetailsRecord.borrower_id === updatedRecord.borrower_id) {
      setBorrowerDetailsRecord({
        ...borrowerDetailsRecord,
        first_name: updatedRecord.first_name,
        last_name: updatedRecord.last_name,
      })
    }
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
      is_manual_enrollment:
        currentDetailsRecord?.is_manual_enrollment ?? selectedBorrower.is_manual_enrollment,
      negligent_damage_flag: currentDetailsRecord?.negligent_damage_flag,
      unresolved_damage_flag_count: currentDetailsRecord?.unresolved_damage_flag_count,
      damage_warning_level: currentDetailsRecord?.damage_warning_level,
      damage_eligible: currentDetailsRecord?.damage_eligible,
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
          actions={<AddBorrowerAction onClick={() => setIsAddBorrowerOpen(true)} />}
        />

        <Panel className="flex min-h-0 flex-1 flex-col overflow-hidden" label="Borrower search results">
          <BorrowerSearchToolbar
            isLoading={isLoading}
            onSearch={searchBorrowers}
            onSearchChange={setSearch}
            onClear={clearSearch}
            search={search}
          />

          {createdBorrower && (
            <div
              className="mx-[17px] mt-[13px] flex items-center justify-between gap-3 rounded-lg border border-success/25 bg-success-soft px-[11px] py-[7px] text-[11px] text-success"
              role="status"
            >
              <span>
                Borrower {[createdBorrower.first_name, createdBorrower.last_name].filter(Boolean).join(' ')} ({createdBorrower.unb_id}) was added successfully.
              </span>
            </div>
          )}

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
            onPageChange={(page) => {
              setCreatedBorrower(null)
              setCurrentPage(page)
            }}
            pageCount={pageCount}
            pageSize={pageSize}
            totalCount={totalCount}
          />
        </Panel>
      </section>

      {isAddBorrowerOpen && (
        <AddBorrowerModal
          onClose={() => setIsAddBorrowerOpen(false)}
          onCreated={handleBorrowerCreated}
        />
      )}

      {borrowerDetails && (
        <BorrowerDetailsWorkflow
          key={borrowerDetails.borrower_id}
          borrower={borrowerDetails}
          detailsLoadState={currentDetailsLoadState}
          onRetryDetails={() => setDetailsRetry((retry) => retry + 1)}
          onLoadDamageFlags={fetchDamageFlags}
          onCreateDamageFlag={createDamageFlag}
          onResolveDamageFlag={(flagId, resolutionReason) => resolveDamageFlag(
            borrowerDetails.borrower_id,
            flagId,
            resolutionReason,
          )}
          onUpdateDamageFlag={(flagId, payload: DamageFlagUpdateInput) => updateDamageFlag(
            borrowerDetails.borrower_id,
            flagId,
            payload,
          )}
          equipmentOptions={equipmentOptions}
          equipmentOptionsError={equipmentOptionsError}
          onRetryEquipmentOptions={() => setEquipmentRetry((retry) => retry + 1)}
          onBorrowerUpdated={handleBorrowerUpdated}
          onClose={() => setSelectedBorrower(null)}
        />
      )}
    </>
  )
}
