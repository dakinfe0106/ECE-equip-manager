import { useEffect, useRef, useState, type FormEvent } from 'react'
import { buttonClassNames } from '../../../components/ui/buttonStyles'
import {
  BorrowerRequestError,
  createBorrower,
  type BorrowerRecord,
} from '../api'

const focusableSelector =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

interface AddBorrowerModalProps {
  onClose: () => void
  onCreated: (borrower: BorrowerRecord) => void
}

function getCreateErrorMessage(error: unknown): string {
  if (error instanceof BorrowerRequestError && error.status === 403) {
    if (error.message.toLowerCase().includes('csrf')) {
      return 'The request could not be verified. Refresh the page and try again.'
    }
    return 'Your account does not have permission to add borrowers.'
  }
  if (error instanceof BorrowerRequestError) {
    return error.message
  }
  return 'Could not connect to borrower records. Please try again.'
}

export default function AddBorrowerModal({ onClose, onCreated }: AddBorrowerModalProps) {
  const [unbId, setUnbId] = useState('')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [opener] = useState(() =>
    document.activeElement instanceof HTMLElement ? document.activeElement : null,
  )
  const dialogRef = useRef<HTMLDivElement>(null)

  const requestClose = () => {
    if (!isSubmitting) onClose()
  }
  const requestCloseRef = useRef(requestClose)
  useEffect(() => {
    requestCloseRef.current = requestClose
  })

  useEffect(() => {
    const dialog = dialogRef.current

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        event.preventDefault()
        requestCloseRef.current()
        return
      }
      if (event.key !== 'Tab' || !dialog) return
      const focusable = [...dialog.querySelectorAll<HTMLElement>(focusableSelector)]
      if (focusable.length === 0) return
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      const active = document.activeElement
      if (event.shiftKey && (active === first || !dialog.contains(active))) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && (active === last || !dialog.contains(active))) {
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

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')

    if (!unbId.trim() || !firstName.trim()) {
      setError('Please complete all required fields.')
      return
    }

    setIsSubmitting(true)
    try {
      const created = await createBorrower({
        unb_id: unbId.trim(),
        first_name: firstName.trim(),
        last_name: lastName.trim(),
      })
      onCreated(created)
    } catch (submitError: unknown) {
      setError(getCreateErrorMessage(submitError))
    } finally {
      setIsSubmitting(false)
    }
  }

  const inputClassName =
    'min-h-[38px] w-full rounded-lg border border-input bg-white px-[11px] py-[9px] text-[12px] text-body outline-none placeholder:text-subtle focus:border-primary focus:shadow-[0_0_0_3px_var(--color-primary-soft)]'

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-heading/55 p-4"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) requestClose()
      }}
    >
      <div
        ref={dialogRef}
        className="w-full max-w-[600px] overflow-hidden rounded-[13px] bg-white shadow-[0_24px_70px_rgb(10_20_35_/_25%)]"
        role="dialog"
        aria-modal="true"
        aria-labelledby="add-borrower-title"
      >
        <header className="flex items-start justify-between gap-4 border-b border-line px-[22px] py-5">
          <div>
            <p className="m-0 mb-[7px] text-[11px] font-bold tracking-[0.11em] text-primary uppercase">
              New record
            </p>
            <h2 className="m-0 text-[14px] font-semibold tracking-[-0.01em] text-heading" id="add-borrower-title">
              Add Borrower
            </h2>
          </div>
          <button
            className="grid size-8 place-items-center rounded-md border-0 bg-transparent text-2xl leading-none text-neutral hover:bg-page focus-visible:outline-2 focus-visible:outline-primary"
            type="button"
            aria-label="Close add borrower dialog"
            disabled={isSubmitting}
            onClick={requestClose}
          >
            ×
          </button>
        </header>

        <form onSubmit={handleSubmit} noValidate>
          <div className="grid grid-cols-2 gap-[15px] px-[22px] pt-[21px] max-[600px]:grid-cols-1">
            <div className="flex min-w-0 flex-col gap-1.5">
              <label className="text-[10px] font-[650] text-body" htmlFor="borrower-unb-id">
                UNB ID <span className="text-danger">*</span>
              </label>
              <input
                id="borrower-unb-id"
                name="unb_id"
                className={inputClassName}
                value={unbId}
                onChange={(event) => {
                  setUnbId(event.target.value)
                  setError('')
                }}
                placeholder="e.g., 3519271"
                maxLength={100}
                autoFocus
                required
              />
            </div>

            <div className="flex min-w-0 flex-col gap-1.5">
              <label className="text-[10px] font-[650] text-body" htmlFor="borrower-first-name">
                First Name <span className="text-danger">*</span>
              </label>
              <input
                id="borrower-first-name"
                name="first_name"
                className={inputClassName}
                value={firstName}
                onChange={(event) => {
                  setFirstName(event.target.value)
                  setError('')
                }}
                placeholder="e.g., Kobi"
                maxLength={255}
                required
              />
            </div>

            <div className="flex min-w-0 flex-col gap-1.5">
              <label className="text-[10px] font-[650] text-body" htmlFor="borrower-last-name">
                Last Name
              </label>
              <input
                id="borrower-last-name"
                name="last_name"
                className={inputClassName}
                value={lastName}
                onChange={(event) => setLastName(event.target.value)}
                placeholder="e.g., Mensah"
                maxLength={255}
              />
            </div>
          </div>

          {error && (
            <p
              className="mx-[22px] mt-4 mb-0 rounded-lg border border-danger/20 bg-danger-soft px-3 py-2 text-[11px] text-danger"
              role="alert"
            >
              {error}
            </p>
          )}

          <div className="mt-[18px] flex justify-end gap-[9px] border-t border-line bg-page px-[22px] py-[15px]">
            <button
              className={buttonClassNames.secondary}
              type="button"
              disabled={isSubmitting}
              onClick={requestClose}
            >
              Cancel
            </button>
            <button
              className={buttonClassNames.primary}
              type="submit"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Saving…' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}