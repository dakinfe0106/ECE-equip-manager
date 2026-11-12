import { useEffect, useRef, useState, type FormEvent } from 'react'
import {
  BorrowerRequestError,
  describeBorrowerDetailError,
  fetchBorrower,
  firstNameError as getFirstNameError,
  updateBorrower,
  type BorrowerDetails,
} from '../api'

const focusableSelector =
  'button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])'

interface BorrowerEditDialogProps {
  borrowerId: number
  onClose: () => void
  onSaved: () => void
}

export default function BorrowerEditDialog({
  borrowerId,
  onClose,
  onSaved,
}: BorrowerEditDialogProps) {
  const [borrower, setBorrower] = useState<BorrowerDetails | null>(null)
  const [firstName, setFirstName] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [firstNameMessage, setFirstNameMessage] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [retryVersion, setRetryVersion] = useState(0)
  const [opener] = useState(() =>
    document.activeElement instanceof HTMLElement ? document.activeElement : null,
  )
  const dialogRef = useRef<HTMLDivElement>(null)
  const closeRef = useRef(onClose)
  const savingRef = useRef(isSaving)

  useEffect(() => {
    closeRef.current = onClose
    savingRef.current = isSaving
  }, [onClose, isSaving])

  useEffect(() => {
    const controller = new AbortController()

    fetchBorrower(borrowerId, controller.signal).then(
      (details) => {
        if (controller.signal.aborted) return
        setBorrower(details)
        setFirstName(details.first_name)
        setIsLoading(false)
      },
      (error: unknown) => {
        if (controller.signal.aborted) return
        setErrorMessage(describeBorrowerDetailError(error, 'load borrower details'))
        setIsLoading(false)
      },
    )

    return () => controller.abort()
  }, [borrowerId, retryVersion])

  useEffect(() => {
    const dialog = dialogRef.current
    dialog?.focus()

    function handleKeyDown(event: globalThis.KeyboardEvent) {
      if (event.key === 'Escape') {
        event.preventDefault()
        if (!savingRef.current) closeRef.current()
        return
      }
      if (event.key !== 'Tab' || !dialog || event.defaultPrevented) return
      const items = [...dialog.querySelectorAll<HTMLElement>(focusableSelector)]
      if (items.length === 0) return
      const first = items[0]
      const last = items[items.length - 1]
      if (event.shiftKey && (document.activeElement === first || !dialog.contains(document.activeElement))) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && (document.activeElement === last || !dialog.contains(document.activeElement))) {
        event.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      opener?.focus()
    }
  }, [opener])

  const close = () => {
    if (!isSaving) onClose()
  }

  const save = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const trimmedFirstName = firstName.trim()
    setFirstNameMessage('')
    setErrorMessage('')
    setSuccessMessage('')

    if (!trimmedFirstName) {
      setFirstNameMessage('Enter a first name.')
      return
    }
    if (trimmedFirstName.length > 255) {
      setFirstNameMessage('First name must be 255 characters or fewer.')
      return
    }

    setIsSaving(true)
    try {
      const saved = await updateBorrower(borrowerId, trimmedFirstName)
      setBorrower(saved)
      setFirstName(saved.first_name)
      onSaved()
      setSuccessMessage('Borrower updated successfully.')

      try {
        const refreshed = await fetchBorrower(borrowerId)
        setBorrower(refreshed)
        setFirstName(refreshed.first_name)
      } catch (error: unknown) {
        setErrorMessage(
          `The update succeeded, but borrower details could not be refreshed. ${describeBorrowerDetailError(error, 'refresh borrower details')}`,
        )
      }
    } catch (error: unknown) {
      const fieldError = getFirstNameError(error)
      if (fieldError) setFirstNameMessage(fieldError)
      else setErrorMessage(describeBorrowerDetailError(error, 'save borrower'))
      if (error instanceof BorrowerRequestError && error.status === 400 && !fieldError) {
        setErrorMessage('The borrower update was rejected. Check the submitted information and try again.')
      }
    } finally {
      setIsSaving(false)
    }
  }

  const borrowerName = borrower
    ? [borrower.first_name, borrower.last_name].filter(Boolean).join(' ')
    : ''

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-heading/55 p-4"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) close()
      }}
    >
      <div
        ref={dialogRef}
        className="flex max-h-[calc(100vh-2rem)] w-full max-w-[650px] flex-col overflow-hidden rounded-[13px] bg-white shadow-[0_24px_70px_rgb(10_20_35_/_25%)] outline-none"
        role="dialog"
        aria-modal="true"
        aria-labelledby="borrower-edit-title"
        tabIndex={-1}
      >
        <div className="flex shrink-0 items-start justify-between gap-3 border-b border-line px-6 py-5">
          <div className="min-w-0">
            <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-muted">
              Borrower details
              {borrower && (
                <>
                  {' · UNB ID '}
                  <span className="font-mono normal-case tracking-normal">{borrower.unb_id}</span>
                </>
              )}
            </p>
            <h2 id="borrower-edit-title" className="m-0 break-words text-xl font-semibold text-heading">
              {borrower ? borrowerName : 'Borrower details'}
            </h2>
            <p className="mt-1 mb-0 text-sm text-muted">
              Update the borrower&apos;s first name.
            </p>
          </div>
          <button
            type="button"
            className="shrink-0 rounded px-2 py-1 text-muted hover:bg-page focus-visible:outline-2 focus-visible:outline-primary disabled:opacity-60"
            aria-label="Close"
            disabled={isSaving}
            onClick={close}
          >
            ×
          </button>
        </div>

        <main className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
          {isLoading && <p className="m-0 text-sm text-muted" role="status">Loading borrower details…</p>}
          {!isLoading && errorMessage && !borrower && (
            <p className="m-0 text-sm text-danger" role="alert">{errorMessage}</p>
          )}
          {!isLoading && borrower && (
            <form
              id="borrower-edit-form"
              className="space-y-5"
              noValidate
              onSubmit={(event) => { void save(event) }}
            >
              {successMessage && (
                <p
                  className="m-0 rounded-lg border border-success/20 bg-success-soft px-4 py-3 text-sm font-medium text-success"
                  role="status"
                  aria-live="polite"
                >
                  {successMessage}
                </p>
              )}

              <section aria-labelledby="borrower-information-title">
                <h3 id="borrower-information-title" className="mb-3 text-sm font-semibold text-heading">
                  Borrower information
                </h3>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label htmlFor="borrower-id" className="mb-1 block text-xs font-medium text-body">
                      Borrower ID <span className="font-normal text-muted">· Read only</span>
                    </label>
                    <input
                      id="borrower-id"
                      value={borrower.borrower_id}
                      readOnly
                      className="min-h-10 w-full rounded-lg border border-line bg-page px-3 text-sm text-muted"
                    />
                  </div>
                  <div>
                    <label htmlFor="borrower-unb-id" className="mb-1 block text-xs font-medium text-body">
                      UNB ID <span className="font-normal text-muted">· Read only</span>
                    </label>
                    <input
                      id="borrower-unb-id"
                      value={borrower.unb_id}
                      readOnly
                      className="min-h-10 w-full rounded-lg border border-line bg-page px-3 font-mono text-sm text-muted"
                    />
                  </div>
                  <div>
                    <label htmlFor="borrower-first-name" className="mb-1 block text-xs font-medium text-body">
                      First name
                    </label>
                    <input
                      id="borrower-first-name"
                      name="first_name"
                      type="text"
                      required
                      maxLength={255}
                      value={firstName}
                      aria-invalid={Boolean(firstNameMessage)}
                      aria-describedby={firstNameMessage ? 'borrower-first-name-error' : undefined}
                      className="min-h-10 w-full rounded-lg border border-input px-3 text-sm text-body focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary-soft"
                      onChange={(event) => {
                        setFirstName(event.target.value)
                        setFirstNameMessage('')
                        setErrorMessage('')
                        setSuccessMessage('')
                      }}
                    />
                    {firstNameMessage && (
                      <p id="borrower-first-name-error" className="mt-1 mb-0 text-xs text-danger" role="alert">
                        {firstNameMessage}
                      </p>
                    )}
                  </div>
                  <div>
                    <label htmlFor="borrower-last-name" className="mb-1 block text-xs font-medium text-body">
                      Last name <span className="font-normal text-muted">· Read only</span>
                    </label>
                    <input
                      id="borrower-last-name"
                      value={borrower.last_name || 'Not provided'}
                      readOnly
                      className="min-h-10 w-full rounded-lg border border-line bg-page px-3 text-sm text-muted"
                    />
                  </div>
                </div>
              </section>

              {errorMessage && <p className="m-0 text-sm text-danger" role="alert">{errorMessage}</p>}
              {isSaving && <p className="sr-only" role="status">Saving borrower changes…</p>}
            </form>
          )}
        </main>

        <footer className="flex shrink-0 flex-wrap justify-end gap-2 border-t border-line bg-white px-6 py-4">
          {!isLoading && errorMessage && !borrower && (
            <button
              type="button"
              className="min-h-9 rounded-lg border border-line px-4 text-sm font-medium text-body hover:bg-page focus-visible:outline-2 focus-visible:outline-primary"
              onClick={() => {
                setIsLoading(true)
                setErrorMessage('')
                setRetryVersion((version) => version + 1)
              }}
            >
              Try again
            </button>
          )}
          <button
            type="button"
            className="min-h-9 rounded-lg border border-line px-4 text-sm font-medium text-body hover:bg-page focus-visible:outline-2 focus-visible:outline-primary disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isSaving}
            onClick={close}
          >
            Cancel
          </button>
          {borrower && (
            <button
              type="submit"
              form="borrower-edit-form"
              className="min-h-9 rounded-lg bg-primary px-4 text-sm font-semibold text-white hover:bg-primary-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-wait disabled:opacity-60"
              disabled={isSaving}
            >
              {isSaving ? 'Saving…' : 'Save changes'}
            </button>
          )}
        </footer>
      </div>
    </div>
  )
}
