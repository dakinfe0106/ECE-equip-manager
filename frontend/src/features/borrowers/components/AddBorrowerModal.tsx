// @vitest-environment jsdom

import { useState, useRef, useEffect, type FormEvent } from 'react'
import type { BorrowerCreateInput } from '../api'
import { BorrowerRequestError } from '../api'

interface AddBorrowerModalProps {
  onClose: () => void
  onSave: (data: BorrowerCreateInput) => Promise<void>
}

export default function AddBorrowerModal({ onClose, onSave }: AddBorrowerModalProps) {
  const [unbId, setUnbId] = useState('')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const modalRef = useRef<HTMLElement>(null)

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    modalRef.current?.focus()
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!unbId.trim()) {
      setError('Enter a UNB ID.')
      return
    }
    if (!firstName.trim()) {
      setError('Enter a first name.')
      return
    }

    try {
      setSubmitting(true)
      setError('')
      await onSave({
        unb_id: unbId.trim(),
        first_name: firstName.trim(),
        last_name: lastName.trim() || undefined,
      })
      onClose()
    } catch (err: unknown) {
      if (err instanceof BorrowerRequestError && err.fieldErrors) {
        const messages = Object.entries(err.fieldErrors)
          .map(([field, errs]) => {
            const formatted = Array.isArray(errs) ? errs.join(' ') : String(errs)
            return field === 'non_field_errors' ? formatted : `${formatted}`
          })
          .join(' ')
        setError(messages || `Borrower request failed (${err.status})`)
      } else if (err instanceof Error) {
        setError(err.message)
      } else {
        setError('Could not create borrower. Please try again.')
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[rgb(9_18_32_/_48%)] p-5 backdrop-blur-[2px]"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <section
        ref={modalRef}
        role="dialog"
        aria-labelledby="add-borrower-title"
        aria-modal="true"
        tabIndex={-1}
        className="flex max-h-[min(780px,calc(100dvh-40px))] w-[min(650px,calc(100vw-40px))] flex-col overflow-hidden rounded-[13px] border border-line bg-white shadow-[0_24px_70px_rgb(10_20_35_/_25%)] outline-none"
      >
        <header className="flex shrink-0 items-start justify-between gap-3 border-b border-[#e8ebf0] px-[22px] py-5">
          <div>
            <p className="mb-[7px] text-[11px] font-[750] uppercase tracking-[0.11em] text-primary">
              NEW RECORD
            </p>
            <h2 id="add-borrower-title" className="m-0 text-[14px] font-[650] tracking-[-0.01em] text-[#202a38]">
              Add Borrower
            </h2>
          </div>
          <button
            type="button"
            aria-label="Close add borrower"
            onClick={onClose}
            className="grid place-items-center rounded-lg border-0 bg-transparent p-[7px] text-[#637083] hover:bg-[#eef2f7] focus-visible:outline-2 focus-visible:outline-primary focus-visible:outline-offset-[3px]"
          >
            <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </header>

        <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <div className="min-h-0 flex-1 overflow-y-auto px-[22px] py-[21px]">
            {error && (
              <p className="mb-4 rounded-lg border border-danger/20 bg-danger-soft px-4 py-3 text-[11px] text-danger" role="alert">
                {error}
              </p>
            )}

            <div className="grid grid-cols-1 gap-x-[15px] gap-y-[15px] sm:grid-cols-2">
              <div>
                <label htmlFor="add-unb-id" className="mb-[6px] block text-[10px] font-[650] text-body">
                  UNB ID *
                </label>
                <input
                  id="add-unb-id"
                  type="text"
                  required
                  maxLength={100}
                  value={unbId}
                  onChange={(e) => setUnbId(e.target.value)}
                  placeholder="e.g., 3519271"
                  className="w-full rounded-lg border border-input bg-white px-[11px] py-[10px] text-[12px] text-body outline-none focus:border-primary focus:shadow-[0_0_0_3px_var(--color-primary-soft)] placeholder:text-subtle"
                />
              </div>

              <div>
                <label htmlFor="add-first-name" className="mb-[6px] block text-[10px] font-[650] text-body">
                  First Name *
                </label>
                <input
                  id="add-first-name"
                  type="text"
                  required
                  maxLength={255}
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="e.g., Kobi"
                  className="w-full rounded-lg border border-input bg-white px-[11px] py-[10px] text-[12px] text-body outline-none focus:border-primary focus:shadow-[0_0_0_3px_var(--color-primary-soft)] placeholder:text-subtle"
                />
              </div>

              <div>
                <label htmlFor="add-last-name" className="mb-[6px] block text-[10px] font-[650] text-body">
                  Last Name *
                </label>
                <input
                  id="add-last-name"
                  type="text"
                  required
                  maxLength={255}
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="e.g., Mensah"
                  className="w-full rounded-lg border border-input bg-white px-[11px] py-[10px] text-[12px] text-body outline-none focus:border-primary focus:shadow-[0_0_0_3px_var(--color-primary-soft)] placeholder:text-subtle"
                />
              </div>

              <div>
                <dt className="mb-[6px] text-[10px] font-[650] text-body">
                  Eligibility Status *
                </dt>
                <dd className="m-0 rounded-lg border border-input bg-page px-[11px] py-[10px] text-[12px] text-muted">
                  Eligible (Automatic)
                </dd>
              </div>

              <div className="sm:col-span-2">
                <dt className="mb-[6px] text-[10px] font-[650] text-body">
                  Certifications
                </dt>
                <dd className="m-0 rounded-lg border border-input bg-page px-[11px] py-[10px] text-[12px] text-muted">
                  Certification management available upon record creation.
                </dd>
              </div>
            </div>
          </div>

          <footer className="flex min-h-[70px] shrink-0 items-center justify-end gap-[9px] border-t border-[#e8ebf0] bg-[#fafbfc] px-[22px] py-[15px]">
            <button
              type="button"
              onClick={onClose}
              className="inline-flex min-h-[38px] items-center justify-center gap-[7px] whitespace-nowrap rounded-lg border border-input bg-white px-[15px] text-[12px] font-[650] text-body hover:bg-page focus-visible:outline-2 focus-visible:outline-primary focus-visible:outline-offset-[3px]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex min-h-[38px] items-center justify-center gap-[7px] whitespace-nowrap rounded-lg border border-primary bg-primary px-[15px] text-[12px] font-[650] text-white shadow-[0_4px_10px_rgb(47_111_237_/_22%)] hover:bg-primary-hover focus-visible:outline-2 focus-visible:outline-offset-[3px] focus-visible:outline-primary disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? 'Saving...' : 'Save'}
            </button>
          </footer>
        </form>
      </section>
    </div>
  )
}