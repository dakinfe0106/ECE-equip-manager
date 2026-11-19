
import { useRef, useState, type FormEvent, type MouseEvent } from 'react'
import useModalAccessibility from '../../borrowers/hooks/useModalAccessibility'
import { extendLoan, LoanExtensionError } from '../api'
import type { LoanRecord } from '../types'

interface ExtendLoanModalProps {
  loan: LoanRecord | null
  onClose: () => void
  onSuccess: (updatedLoan: LoanRecord) => void
}

const fieldClassName =
  'mt-[6px] w-full rounded-lg border border-input bg-white px-[11px] py-[10px] text-[12px] text-body outline-none focus:border-primary focus:ring-2 focus:ring-primary/15'

function ExtendLoanModalContent({
  loan,
  onClose,
  onSuccess,
}: {
  loan: LoanRecord
  onClose: () => void
  onSuccess: (updatedLoan: LoanRecord) => void
}) {
  const dialogRef = useRef<HTMLElement>(null)
  const [newReturnDate, setNewReturnDate] = useState(loan.expected_return_date)
  const [submitting, setSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [dateError, setDateError] = useState('')

  useModalAccessibility(dialogRef, onClose)

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setErrorMessage('')
    setDateError('')

    if (!newReturnDate) {
      setDateError('Please select a new expected return date.')
      return
    }

    if (newReturnDate <= loan.expected_return_date) {
        setDateError('The new return date must be later than the current expected return date.')
        return
    }

    setSubmitting(true)

    try {
      const updatedLoan = await extendLoan(loan.loan_id, {
        expected_return_date: newReturnDate,
      })

      onSuccess(updatedLoan)
    } catch (error) {
      if (error instanceof LoanExtensionError) {
        const validationError = error.fieldErrors.expected_return_date?.[0]

        if (validationError) {
          setDateError(validationError)
        } else if (error.status === 403) {
          setErrorMessage('You do not have permission to extend this loan.')
        } else if (error.status === 404) {
          setErrorMessage('This loan could not be found. Refresh the page and try again.')
        } else if (error.status === 405) {
          setErrorMessage('Loan extensions are not currently available on the server.')
        } else {
          setErrorMessage(error.message)
        }
      } else {
        setErrorMessage('Something went wrong. Please try again.')
      }
    } finally {
      setSubmitting(false)
    }
  }

  const handleBackdropClick = (event: MouseEvent<HTMLDivElement>) => {
    if (event.target === event.currentTarget && !submitting) {
      onClose()
    }
  }

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-[rgb(9_18_32_/_48%)] p-5 backdrop-blur-[2px]"
      onClick={handleBackdropClick}
    >
      <section
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="extend-loan-title"
        tabIndex={-1}
        className="flex max-h-[min(780px,calc(100dvh-40px))] w-[min(650px,calc(100vw-40px))] flex-col overflow-hidden rounded-[13px] border border-line bg-white shadow-[0_24px_70px_rgb(10_20_35_/_25%)]"
      >
        <header className="flex shrink-0 items-start justify-between gap-3 border-b border-divider px-[22px] py-5">
          <div>
            <p className="text-[9px] font-semibold uppercase tracking-[0.12em] text-primary">
              Lending
            </p>
            <h2
              id="extend-loan-title"
              className="mt-1 text-[15px] font-normal text-heading"
            >
              Extend Equipment Loan
            </h2>
            <p className="mt-1 text-[11px] text-muted">
              Update the expected return date for this loan.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            aria-label="Close extension form"
            className="rounded-md px-2 py-1 text-[20px] leading-none text-muted hover:bg-page hover:text-heading disabled:opacity-50"
          >
            ×
          </button>
        </header>

        <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
          <div className="space-y-5 overflow-y-auto px-[22px] py-[21px]">
            {errorMessage && (
              <div
                role="alert"
                className="rounded-lg border border-danger/20 bg-danger-soft px-3 py-3 text-[11px] text-danger"
              >
                {errorMessage}
              </div>
            )}

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="rounded-lg border border-line bg-page px-3 py-3">
                <p className="text-[10px] font-[650] text-muted">Equipment</p>
                <p className="mt-1 text-[12px] text-heading">
                  {loan.equipment_name}
                </p>
                <p className="mt-1 text-[10px] text-muted">
                  {loan.asset_identifier}
                </p>
              </div>

              <div className="rounded-lg border border-line bg-page px-3 py-3">
                <p className="text-[10px] font-[650] text-muted">Borrower</p>
                <p className="mt-1 text-[12px] text-heading">
                  {loan.borrower_name}
                </p>
                <p className="mt-1 text-[10px] text-muted">
                  {loan.borrower_unb_id}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <p className="text-[10px] font-[650] text-body">
                  Original checkout date
                </p>
                <p className="mt-[6px] rounded-lg border border-line bg-page px-[11px] py-[10px] text-[12px] text-body">
                  {loan.checkout_date}
                </p>
              </div>

              <div>
                <p className="text-[10px] font-[650] text-body">
                  Current expected return
                </p>
                <p className="mt-[6px] rounded-lg border border-line bg-page px-[11px] py-[10px] text-[12px] text-body">
                  {loan.expected_return_date}
                </p>
              </div>
            </div>

            <div>
              <label
                htmlFor="new-expected-return-date"
                className="text-[10px] font-[650] text-body"
              >
                New expected return date
              </label>
              <input
                id="new-expected-return-date"
                type="date"
                required
                min={loan.checkout_date}
                value={newReturnDate}
                onChange={(event) => {
                  setNewReturnDate(event.target.value)
                  setDateError('')
                }}
                disabled={submitting}
                className={fieldClassName}
                aria-invalid={Boolean(dateError)}
                aria-describedby={dateError ? 'return-date-error' : undefined}
              />
              {dateError && (
                <p
                  id="return-date-error"
                  role="alert"
                  className="mt-2 text-[11px] text-danger"
                >
                  {dateError}
                </p>
              )}
              <p className="mt-2 text-[10px] text-muted">
                The new date must be on or after the original checkout date.
              </p>
            </div>
          </div>

          <footer className="flex shrink-0 items-center justify-end gap-[9px] border-t border-divider bg-page px-[22px] py-[15px]">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="min-h-[38px] rounded-lg border border-input bg-white px-4 text-[11px] font-medium text-body hover:bg-page disabled:opacity-50"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={submitting}
              className="min-h-[38px] rounded-lg border border-primary bg-primary px-4 text-[11px] font-medium text-white hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {submitting ? 'Saving...' : 'Save Extension'}
            </button>
          </footer>
        </form>
      </section>
    </div>
  )
}

export default function ExtendLoanModal({
  loan,
  onClose,
  onSuccess,
}: ExtendLoanModalProps) {
  if (!loan) return null

  // Remount the form when a different loan is selected so its local state
  // starts with that loan's expected return date and cleared validation errors.
  return (
    <ExtendLoanModalContent
      key={loan.loan_id}
      loan={loan}
      onClose={onClose}
      onSuccess={onSuccess}
    />
  )
}
