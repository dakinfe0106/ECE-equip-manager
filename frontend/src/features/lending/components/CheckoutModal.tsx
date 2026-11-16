import { useEffect, useRef, useState } from 'react'
import type { FormEvent, MouseEvent } from 'react'
import {
  assetStatusLabels,
  fetchAllAssets,
  type AssetRecord,
} from '../../assets/api'
import {
  BorrowerRequestError,
  describeBorrowerError,
  fetchBorrowerDetails,
  fetchBorrowers,
  type BorrowerDetailsRecord,
  type BorrowerRecord,
} from '../../borrowers/api'
import useModalAccessibility from '../../borrowers/hooks/useModalAccessibility'
import {
  createLoan,
  LoanCheckoutError,
  type LoanCheckoutInput,
} from '../api'
import type { LoanRecord } from '../types'
import BorrowerDamageWarningBadge from '../../borrowers/components/BorrowerDamageWarningBadge'
interface CheckoutModalProps {
  onClose: () => void
  onSuccess: (loan: LoanRecord) => void
}
const fieldClassName =
  'mt-[6px] w-full rounded-lg border border-input bg-white px-[11px] py-[10px] text-[12px] text-body outline-none focus:border-primary focus:ring-2 focus:ring-primary/15'
function getLocalToday(): string {
  const date = new Date()
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}
export default function CheckoutModal({
  onClose,
  onSuccess,
}: CheckoutModalProps) {
  const dialogRef = useRef<HTMLElement | null>(null)
  const borrowerPickerRef = useRef<HTMLDivElement | null>(null)
  useModalAccessibility(dialogRef, onClose)
  const [assets, setAssets] = useState<AssetRecord[]>([])
  const [assetsLoading, setAssetsLoading] = useState(true)
  const [assetsError, setAssetsError] = useState('')
  const [borrowerSearch, setBorrowerSearch] = useState('')
  const [borrowerResults, setBorrowerResults] = useState<BorrowerRecord[]>([])
  const [borrowersLoading, setBorrowersLoading] = useState(true)
  const [borrowersError, setBorrowersError] = useState('')
  const [showBorrowerOptions, setShowBorrowerOptions] = useState(false)
  const [selectedBorrower, setSelectedBorrower] =
    useState<BorrowerRecord | null>(null)
  const selectedBorrowerId = selectedBorrower?.borrower_id ?? null
  const [borrowerDetails, setBorrowerDetails] =
    useState<BorrowerDetailsRecord | null>(null)
  const [borrowerDetailsLoading, setBorrowerDetailsLoading] = useState(false)
  const [borrowerDetailsError, setBorrowerDetailsError] = useState('')
  const [selectedAssetId, setSelectedAssetId] = useState('')
  const [expectedReturnDate, setExpectedReturnDate] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({})
  const today = getLocalToday()
  const selectedAsset =
    assets.find((asset) => asset.asset_id === Number(selectedAssetId)) ?? null
  const requiredCertifications =
    selectedAsset?.equipment_type.required_certifications
  // Load real asset records from the API.
  useEffect(() => {
    let isCurrent = true
    fetchAllAssets()
      .then((records) => {
        if (!isCurrent) return
        setAssets(records)
        setAssetsError('')
      })
      .catch(() => {
        if (!isCurrent) return
        setAssetsError('Could not load assets. Please try again.')
      })
      .finally(() => {
        if (isCurrent) setAssetsLoading(false)
      })
    return () => {
      isCurrent = false
    }
  }, [])
  // Search borrowers through the backend rather than filtering mock data.
  useEffect(() => {
    const controller = new AbortController()
    const timeout = window.setTimeout(() => {
      setBorrowersLoading(true)
      fetchBorrowers(1, borrowerSearch, controller.signal)
        .then((response) => {
          setBorrowerResults(response.results)
          setBorrowersError('')
        })
        .catch((error: unknown) => {
          if (controller.signal.aborted) return
          setBorrowersError(describeBorrowerError(error))
        })
        .finally(() => {
          if (!controller.signal.aborted) setBorrowersLoading(false)
        })
    }, 250)
    return () => {
      window.clearTimeout(timeout)
      controller.abort()
    }
  }, [borrowerSearch])
  // Retrieve the selected borrower's actual damage-policy information.
  useEffect(() => {
    const borrowerId = selectedBorrowerId
    if (borrowerId === null) return
    const controller = new AbortController()
    fetchBorrowerDetails(borrowerId, controller.signal)
      .then((details) => {
        setBorrowerDetails(details)
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return
        if (error instanceof BorrowerRequestError) {
          setBorrowerDetailsError(
            error.status === 403
              ? 'You do not have permission to view this borrower.'
              : 'Could not verify this borrower. Please try again.',
          )
        } else {
          setBorrowerDetailsError(
            'Could not reach the server to verify this borrower.',
          )
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setBorrowerDetailsLoading(false)
        }
      })
    return () => controller.abort()
  }, [selectedBorrowerId])

  // Close the borrower suggestions when the user clicks outside the picker.
  useEffect(() => {
    if (!showBorrowerOptions) return
    const handlePointerDown = (event: PointerEvent) => {
      if (!borrowerPickerRef.current?.contains(event.target as Node)) {
        setShowBorrowerOptions(false)
      }
    }
    document.addEventListener('pointerdown', handlePointerDown)
    return () => document.removeEventListener('pointerdown', handlePointerDown)
  }, [showBorrowerOptions])
  const selectBorrower = (borrower: BorrowerRecord) => {
    setSelectedBorrower(borrower)
    setBorrowerSearch(
      `${borrower.first_name} ${borrower.last_name} · ${borrower.unb_id}`,
    )
    setBorrowerDetails(null)
    setBorrowerDetailsError('')
    setBorrowerDetailsLoading(true)
    setShowBorrowerOptions(false)
    setErrorMessage('')
    setFieldErrors({})
  }

  const handleBorrowerSearch = (value: string) => {
    setBorrowerSearch(value)
    setSelectedBorrower(null)
    setBorrowerDetails(null)
    setBorrowerDetailsError('')
    setBorrowerDetailsLoading(false)
    setShowBorrowerOptions(true)
    setErrorMessage('')
    setFieldErrors({})
  }

  const handleBackdropClick = (event: MouseEvent<HTMLDivElement>) => {
    if (event.target === event.currentTarget && !submitting) {
      onClose()
    }
  }
  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setErrorMessage('')
    setFieldErrors({})
    if (!selectedAsset || selectedAsset.status !== 'Available') {
      setErrorMessage('Select an available asset before continuing.')
      return
    }
    if (!selectedBorrower || !borrowerDetails) {
      setErrorMessage('Select a borrower and wait for their eligibility to be checked.')
      return
    }
    if (!borrowerDetails.damage_eligible) {
      setErrorMessage(
        'This borrower is ineligible under the damage policy and cannot be checked out.',
      )
      return
    }
    if (!expectedReturnDate) {
      setErrorMessage('Enter an expected return date.')
      return
    }
    const input: LoanCheckoutInput = {
      asset_id: selectedAsset.asset_id,
      borrower_id: selectedBorrower.borrower_id,
      expected_return_date: expectedReturnDate,
    }
    setSubmitting(true)
    try {
      const loan = await createLoan(input)
      onSuccess(loan)
    } catch (error: unknown) {
      if (error instanceof LoanCheckoutError) {
        setFieldErrors(error.fieldErrors)
        if (error.status === 403) {
          setErrorMessage(
            'Checkout permission was denied. Your session may have expired, or your account may not have the required role.',
          )
        } else if (error.status === 404 || error.status === 405) {
          setErrorMessage(
            'The checkout endpoint is not available on this backend version yet.',
          )
        } else {
          setErrorMessage(error.message)
        }
      } else {
        setErrorMessage('Could not complete checkout. Please try again.')
      }
    } finally {
      setSubmitting(false)
    }
  }
  const canSubmit =
    Boolean(selectedAsset) &&
    selectedAsset?.status === 'Available' &&
    Boolean(selectedBorrower) &&
    Boolean(borrowerDetails?.damage_eligible) &&
    !borrowerDetailsLoading &&
    !borrowerDetailsError &&
    Boolean(expectedReturnDate) &&
    !submitting
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[rgb(9_18_32_/_48%)] p-5 backdrop-blur-[2px]"
      onMouseDown={handleBackdropClick}
    >
      <section
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="checkout-modal-title"
        tabIndex={-1}
        className="flex max-h-[min(780px,calc(100dvh-40px))] w-[min(650px,calc(100vw-40px))] flex-col overflow-hidden rounded-[13px] border border-line bg-white shadow-[0_24px_70px_rgb(10_20_35_/_25%)]"
      >
        <header className="flex shrink-0 items-start justify-between gap-3 border-b border-divider px-[22px] py-5">
          <div>
            <p className="mb-[7px] text-[10px] font-bold uppercase tracking-[0.1em] text-primary">
              Lending
            </p>
            <h2
              id="checkout-modal-title"
              className="m-0 text-[15px] font-[650] text-heading"
            >
              Checkout Equipment
            </h2>
            <p className="mb-0 mt-[6px] text-[11px] text-muted">
              Assign an available asset to an active borrower.
            </p>
          </div>
          <button
            type="button"
            aria-label="Close checkout form"
            onClick={onClose}
            disabled={submitting}
            className="rounded-lg border-0 bg-transparent px-2 py-1 text-[19px] text-muted hover:bg-page focus-visible:outline-2 focus-visible:outline-primary disabled:opacity-50"
          >
            ×
          </button>
        </header>
        <form
          onSubmit={handleSubmit}
          className="flex min-h-0 flex-1 flex-col"
        >
          <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-[22px] py-[21px]">
            {errorMessage && (
              <div
                role="alert"
                className="rounded-lg border border-danger/20 bg-danger-soft px-3 py-3 text-[11px] text-danger"
              >
                <strong className="mb-1 block">Unable to complete checkout</strong>
                <span>{errorMessage}</span>
              </div>
            )}
            <div>
              <label
                htmlFor="checkout-asset"
                className="block text-[10px] font-[650] text-body"
              >
                Asset *
              </label>
              <select
                id="checkout-asset"
                required
                value={selectedAssetId}
                onChange={(event) => {
                  setSelectedAssetId(event.target.value)
                  setFieldErrors({})
                  setErrorMessage('')
                }}
                disabled={assetsLoading || submitting}
                className={fieldClassName}
              >
                <option value="">
                  {assetsLoading ? 'Loading assets...' : 'Select an asset'}
                </option>
                {assets.map((asset) => (
                  <option
                    key={asset.asset_id}
                    value={asset.asset_id}
                    disabled={asset.status !== 'Available'}
                  >
                    {asset.asset_identifier} · {asset.name} —{' '}
                    {assetStatusLabels[asset.status]}
                  </option>
                ))}
              </select>
              {assetsError && (
                <p role="alert" className="mb-0 mt-2 text-[10px] text-danger">
                  {assetsError}
                </p>
              )}
              {!assetsLoading && !assetsError && assets.length === 0 && (
                <p className="mb-0 mt-2 text-[10px] text-muted">
                  No active assets were returned by the server.
                </p>
              )}
              {selectedAsset && (
                <div className="mt-3 rounded-lg border border-line bg-page px-3 py-3">
                  <p className="m-0 text-[11px] font-semibold text-heading">
                    {selectedAsset.name}
                  </p>
                  <p className="mb-0 mt-1 text-[10px] text-muted">
                    {selectedAsset.equipment_type.name} ·{' '}
                    {selectedAsset.asset_identifier}
                  </p>
                  <p className="mb-0 mt-2 text-[10px] text-success">
                    Availability: {assetStatusLabels[selectedAsset.status]}
                  </p>
                </div>
              )}
              {fieldErrors.asset_id?.[0] && (
                <p className="mb-0 mt-1 text-[10px] text-danger">
                  {fieldErrors.asset_id[0]}
                </p>
              )}
            </div>
            <div ref={borrowerPickerRef} className="relative">
              <label
                htmlFor="checkout-borrower"
                className="block text-[10px] font-[650] text-body"
              >
                Borrower *
              </label>
              <input
                id="checkout-borrower"
                type="search"
                autoComplete="off"
                role="combobox"
                aria-autocomplete="list"
                aria-expanded={showBorrowerOptions}
                aria-controls="checkout-borrower-options"
                value={borrowerSearch}
                onFocus={() => setShowBorrowerOptions(true)}
                onChange={(event) => handleBorrowerSearch(event.target.value)}
                placeholder="Search by name or UNB ID..."
                disabled={submitting}
                className={fieldClassName}
              />
              {showBorrowerOptions && (
                <div
                  id="checkout-borrower-options"
                  role="listbox"
                  className="absolute left-0 right-0 top-full z-10 mt-1 max-h-[210px] overflow-y-auto rounded-lg border border-line bg-white py-1 shadow-[0_12px_30px_rgb(15_27_45_/_12%)]"
                >
                  {borrowersLoading && (
                    <p
                      role="status"
                      className="mb-0 px-3 py-3 text-[10px] text-muted"
                    >
                      Searching borrowers...
                    </p>
                  )}
                  {!borrowersLoading && borrowersError && (
                    <p
                      role="alert"
                      className="mb-0 px-3 py-3 text-[10px] text-danger"
                    >
                      {borrowersError}
                    </p>
                  )}
                  {!borrowersLoading &&
                    !borrowersError &&
                    borrowerResults.length === 0 && (
                      <p className="mb-0 px-3 py-3 text-[10px] text-muted">
                        No borrowers found. Try another name or UNB ID.
                      </p>
                    )}
                  {!borrowersLoading &&
                    !borrowersError &&
                    borrowerResults.map((borrower) => (
                      <button
                        type="button"
                        role="option"
                        aria-selected={
                          selectedBorrower?.borrower_id === borrower.borrower_id
                        }
                        key={borrower.borrower_id}
                        onClick={() => selectBorrower(borrower)}
                        className="flex w-full items-center justify-between gap-3 border-0 bg-white px-3 py-2.5 text-left hover:bg-page focus-visible:bg-primary-soft focus-visible:outline-none"
                      >
                        <span className="min-w-0">
                          <strong className="block truncate text-[11px] font-semibold text-body">
                            {borrower.first_name} {borrower.last_name}
                          </strong>
                          <span className="mt-1 block font-mono text-[10px] text-muted">
                            UNB ID {borrower.unb_id}
                          </span>
                        </span>
                        <span className="shrink-0 rounded-full bg-neutral-soft px-2 py-1 text-[9px] font-semibold text-neutral">
                          Check status
                        </span>
                      </button>
                    ))}
                </div>
              )}
              {selectedBorrower && (
                <div className="mt-3 rounded-lg border border-line bg-page px-3 py-3">
                  <p className="m-0 text-[11px] font-semibold text-heading">
                    {selectedBorrower.first_name} {selectedBorrower.last_name}
                  </p>
                  <p className="mb-0 mt-1 font-mono text-[10px] text-muted">
                    UNB ID {selectedBorrower.unb_id}
                  </p>
                  {borrowerDetailsLoading && (
                    <p role="status" className="mb-0 mt-2 text-[10px] text-muted">
                      Checking damage-based eligibility...
                    </p>
                  )}
                  {borrowerDetailsError && (
                    <p role="alert" className="mb-0 mt-2 text-[10px] text-danger">
                      {borrowerDetailsError}
                    </p>
                  )}
                  {borrowerDetails && (
                    <div className="mt-3 border-t border-line pt-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="text-[10px] font-semibold text-body">
                          Damage-based eligibility
                        </span>
                        <span
                          className={`rounded-full px-2.5 py-1 text-[9px] font-semibold ${
                            borrowerDetails.damage_eligible
                              ? 'bg-success-soft text-success'
                              : 'bg-danger-soft text-danger'
                          }`}
                        >
                          {borrowerDetails.damage_eligible
                            ? 'Eligible'
                            : 'Ineligible'}
                        </span>
                      </div>
                      <div className="mt-2">
                        <BorrowerDamageWarningBadge
                          warningLevel={borrowerDetails.damage_warning_level}
                        />
                      </div>
                      <p className="mb-0 mt-2 text-[10px] text-muted">
                        Unresolved reviewed damage incidents:{' '}
                        {borrowerDetails.unresolved_damage_flag_count}
                      </p>
                    </div>
                  )}
                </div>
              )}
              {fieldErrors.borrower_id?.[0] && (
                <p className="mb-0 mt-1 text-[10px] text-danger">
                  {fieldErrors.borrower_id[0]}
                </p>
              )}
              <p className="mb-0 mt-2 text-[10px] text-muted">
                Borrowers are searchable regardless of their damage-based eligibility.
                Their status is checked after selection.
              </p>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-[10px] font-[650] text-body">
                  Checkout Date · System controlled
                </label>
                <div className={`${fieldClassName} bg-page text-muted`}>
                  Recorded automatically when checkout is confirmed
                </div>
              </div>
              <div>
                <label
                  htmlFor="checkout-return-date"
                  className="block text-[10px] font-[650] text-body"
                >
                  Expected Return Date *
                </label>
                <input
                  id="checkout-return-date"
                  type="date"
                  required
                  min={today}
                  value={expectedReturnDate}
                  onChange={(event) => {
                    setExpectedReturnDate(event.target.value)
                    setFieldErrors({})
                    setErrorMessage('')
                  }}
                  disabled={submitting}
                  className={fieldClassName}
                />
                {fieldErrors.expected_return_date?.[0] && (
                  <p className="mb-0 mt-1 text-[10px] text-danger">
                    {fieldErrors.expected_return_date[0]}
                  </p>
                )}
              </div>
            </div>
            <div className="rounded-lg border border-line bg-page px-3 py-3">
              <p className="m-0 text-[10px] font-semibold text-body">
                Required certifications
              </p>
              {requiredCertifications === undefined ? (
                <p className="mb-0 mt-2 text-[10px] text-muted">
                  Certification requirements are not currently provided by the
                  asset API.
                </p>
              ) : requiredCertifications.length === 0 ? (
                <p className="mb-0 mt-2 text-[10px] text-muted">
                  No required certifications are recorded for this equipment type.
                </p>
              ) : (
                <ul className="mb-0 mt-2 list-disc space-y-1 pl-5 text-[10px] text-body">
                  {requiredCertifications.map((certification) => (
                    <li key={certification.certification_id}>
                      {certification.name}
                    </li>
                  ))}
                </ul>
              )}
              <p className="mb-0 mt-2 text-[10px] text-muted">
                Borrower certification records and server-side certification
                verification are not available in the current checkout API.
              </p>
            </div>
            <p className="mb-0 text-[10px] leading-relaxed text-muted">
              The server performs the final checkout validation, including asset
              availability and borrower restrictions. Damage-based eligibility
              shown here is not a substitute for that server check.
            </p>
          </div>
          <footer className="flex shrink-0 items-center justify-end gap-[9px] border-t border-divider bg-page px-[22px] py-[15px]">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="inline-flex min-h-[38px] items-center justify-center rounded-lg border border-input bg-white px-[15px] text-[11px] font-semibold text-body hover:bg-page disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!canSubmit}
              className="inline-flex min-h-[38px] items-center justify-center rounded-lg border border-primary bg-primary px-[17px] text-[11px] font-semibold text-white hover:bg-primary-hover focus-visible:outline-2 focus-visible:outline-primary focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {submitting ? 'Processing...' : 'Confirm Checkout'}
            </button>
          </footer>
        </form>
      </section>
    </div>
  )
}
