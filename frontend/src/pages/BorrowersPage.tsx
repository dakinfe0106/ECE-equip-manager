import { useEffect, useState, type FormEvent } from 'react'
import PageIntro from '../components/ui/PageIntro'
import Panel from '../components/ui/Panel'
import BorrowerDetailsWorkflow from '../features/borrowers/components/BorrowerDetailsWorkflow'
import BorrowerPagination from '../features/borrowers/components/BorrowerPagination'
import BorrowerSearchToolbar from '../features/borrowers/components/BorrowerSearchToolbar'
import BorrowerTable from '../features/borrowers/components/BorrowerTable'
import AddBorrowerModal from '../features/borrowers/components/AddBorrowerModal'
import { fetchAllAssets } from '../features/assets/api'
import {
  createBorrower,
  describeBorrowerDetailsError,
  fetchBorrowerDetails,
  updateBorrower,
  type BorrowerCreateInput,
  type BorrowerDetailsRecord,
  type BorrowerRecord,
} from '../features/borrowers/api'
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
  const [selectedBorrower, setSelectedBorrower] = useState<BorrowerRecord | null>(null)
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
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
    borrowers: initialBorrowers,
    errorMessage,
    isLoading,
    pageCount,
    pageSize,
    totalCount,
  } = useBorrowers(currentPage, appliedSearch)

  const [localBorrowers, setLocalBorrowers] = useState<BorrowerRecord[]>([])

  useEffect(() => {
    setLocalBorrowers(initialBorrowers)
  }, [initialBorrowers])

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
      unresolved_damage_flag_count: currentDetailsRecord?.unresolved_damage_flag_count,
      damage_warning_level: currentDetailsRecord?.damage_warning_level,
      damage_eligible: currentDetailsRecord?.damage_eligible,
      is_manual_enrollment: currentDetailsRecord?.is_manual_enrollment,
    }
    : null

  const handleCreateBorrower = async (data: BorrowerCreateInput) => {
    const newRecord = await createBorrower(data)
    setLocalBorrowers((prev) => [newRecord, ...prev])
  }

  const handleSaveBorrower = async (updatedData: { first_name: string }) => {
    if (!selectedBorrower) return
    const updatedRecord = await updateBorrower(selectedBorrower.borrower_id, updatedData)
    setBorrowerDetailsRecord(updatedRecord)
    setSelectedBorrower({
      ...selectedBorrower,
      first_name: updatedRecord.first_name,
    })
    setLocalBorrowers((prev) =>
      prev.map((b) =>
        b.borrower_id === selectedBorrower.borrower_id
          ? { ...b, first_name: updatedRecord.first_name }
          : b
      )
    )
  }

  return (
    <>
      <section
        className="mx-auto flex h-full min-h-0 w-full max-w-[1500px] flex-col px-[34px] pt-[34px] pb-[50px] max-[760px]:px-4 max-[760px]:pt-6 max-[760px]:pb-10"
        aria-labelledby="page-title"
      >
        <div className="mb-[27px] flex flex-wrap items-end justify-between gap-x-6 gap-y-[18px] max-[760px]:items-start max-[520px]:block">
          <PageIntro
            title="Borrowers"
            description="Find borrowers and review their records."
          />
          <button
            type="button"
            onClick={() => setIsAddModalOpen(true)}
            className="inline-flex min-h-[38px] items-center justify-center gap-[7px] whitespace-nowrap rounded-lg border border-primary bg-primary px-[15px] text-[12px] font-[650] text-white shadow-[0_4px_10px_rgb(47_111_237_/_22%)] hover:bg-primary-hover focus-visible:outline-2 focus-visible:outline-offset-[3px] focus-visible:outline-primary"
          >
            + Add Borrower
          </button>
        </div>

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
            borrowers={localBorrowers}
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

      {isAddModalOpen && (
        <AddBorrowerModal
          onClose={() => setIsAddModalOpen(false)}
          onSave={handleCreateBorrower}
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
          onClose={() => setSelectedBorrower(null)}
          onSave={handleSaveBorrower}
        />
      )}
    </>
  )
}