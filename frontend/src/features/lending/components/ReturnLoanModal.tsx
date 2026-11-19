
import { useState, type FormEvent } from 'react'
import {
  returnLoan,
  LoanReturnError,
  type LoanReturnResponse,
} from '../api'
import type { LoanRecord } from '../types'

interface ReturnLoanModalProps {
  loan: LoanRecord
  onClose: () => void
  onSuccess: (result: LoanReturnResponse) => void
}

function localDate(): string {
  const today = new Date()
  const month = String(today.getMonth() + 1).padStart(2, '0')
  const day = String(today.getDate()).padStart(2, '0')

  return `${today.getFullYear()}-${month}-${day}`
}

export default function ReturnLoanModal({
  loan,
  onClose,
  onSuccess,
}: ReturnLoanModalProps) {
  const [actualReturnDate, setActualReturnDate] = useState(localDate)
  const [returnCondition, setReturnCondition] = useState<'Intact' | 'Damaged'>(
    'Intact',
  )
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [dateError, setDateError] = useState('')

  const checkoutDate = loan.checkout_date.slice(0, 10)

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    setErrorMessage('')
    setDateError('')

    if (!actualReturnDate) {
      setDateError('Please select the actual return date.')
      return
    }

    if (actualReturnDate < checkoutDate) {
      setDateError('The actual return date cannot be before the checkout date.')
      return
    }

    setIsSubmitting(true)

    try {
      const result = await returnLoan(loan.loan_id, {
        actual_return_date: actualReturnDate,
        return_condition: returnCondition,
      })

      onSuccess(result)
    } catch (error: unknown) {
      if (error instanceof LoanReturnError) {
        const messages = Object.values(error.fieldErrors).flat()

        setErrorMessage(
          messages.length > 0
            ? messages.join(' ')
            : error.message,
        )
      } else {
        setErrorMessage(
          error instanceof Error
            ? error.message
            : 'Something went wrong while processing the return. Please try again.',
        )
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 px-4 py-6"
      onClick={() => {
        if (!isSubmitting) onClose()
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="return-loan-title"
        className="w-full max-w-lg overflow-hidden rounded-[13px] border border-line bg-white shadow-[0_24px_60px_rgb(15_27_45_/_28%)]"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="flex items-start justify-between gap-3 border-b border-divider px-6 py-5">
          <div>
            <p className="mb-[6px] text-[10px] font-bold uppercase tracking-[1px] text-muted">
              {`${loan.asset_identifier} · Equipment Return`}
            </p>

            <h2
              id="return-loan-title"
              className="m-0 text-[18px] font-bold text-heading"
            >
              Process Return
            </h2>

            <p className="mb-0 mt-1 text-[11px] text-muted">
              {loan.equipment_name}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            aria-label="Close return dialog"
            className="rounded px-2 py-1 text-[18px] text-muted hover:bg-page hover:text-body focus-visible:outline-2 focus-visible:outline-primary disabled:cursor-not-allowed disabled:opacity-50"
          >
            ×
          </button>
        </header>

        <form onSubmit={handleSubmit}>
          <div className="space-y-5 px-6 py-5">
            <div>
              <label
                htmlFor="actual-return-date"
                className="mb-1.5 block text-[11px] font-semibold text-body"
              >
                Actual Return Date *
              </label>

              <input
                id="actual-return-date"
                type="date"
                required
                min={checkoutDate}
                value={actualReturnDate}
                onChange={(event) => {
                  setActualReturnDate(event.target.value)
                  setDateError('')
                  setErrorMessage('')
                }}
                disabled={isSubmitting}
                aria-invalid={Boolean(dateError)}
                aria-describedby={dateError ? 'return-date-error' : undefined}
                className="min-h-10 w-full rounded-lg border border-input bg-white px-3 text-[12px] text-body focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary disabled:cursor-not-allowed disabled:bg-page"
              />

              <p className="mb-0 mt-1.5 text-[10px] text-muted">
                Checkout date: {checkoutDate}
              </p>

              {dateError && (
                <p
                  id="return-date-error"
                  role="alert"
                  className="mb-0 mt-1.5 text-[11px] text-danger"
                >
                  {dateError}
                </p>
              )}
            </div>

            <div>
              <label
                htmlFor="return-condition"
                className="mb-1.5 block text-[11px] font-semibold text-body"
              >
                Return Condition *
              </label>

              <select
                id="return-condition"
                required
                value={returnCondition}
                onChange={(event) => {
                  setReturnCondition(event.target.value as 'Intact' | 'Damaged')
                  setErrorMessage('')
                }}
                disabled={isSubmitting}
                className="min-h-10 w-full rounded-lg border border-input bg-white px-3 text-[12px] text-body focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary disabled:cursor-not-allowed disabled:bg-page"
              >
                <option value="Intact">Intact</option>
                <option value="Damaged">Damaged</option>
              </select>

              {returnCondition === 'Damaged' && (
                <p className="mb-0 mt-2 rounded-lg border border-warning/20 bg-warning-soft px-3 py-2 text-[11px] text-warning">
                  This equipment will be marked Under Maintenance. You'll be
                  prompted to create a maintenance record after confirming the
                  return.
                </p>
              )}
            </div>

            {errorMessage && (
              <div
                role="alert"
                className="rounded-lg border border-danger/20 bg-danger-soft px-3 py-2 text-[11px] text-danger"
              >
                {errorMessage}
              </div>
            )}
          </div>

          <footer className="flex flex-wrap justify-end gap-2 border-t border-divider px-6 py-4">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="min-h-9 rounded-lg border border-input bg-white px-4 text-[12px] font-semibold text-body hover:bg-page disabled:cursor-not-allowed disabled:opacity-50"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={isSubmitting || !actualReturnDate}
              className="min-h-9 rounded-lg bg-primary px-4 text-[12px] font-semibold text-white hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting ? 'Processing…' : 'Confirm Return'}
            </button>
          </footer>
        </form>
      </section>
    </div>
  )
}
