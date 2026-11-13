
// @vitest-environment jsdom

import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, fireEvent, cleanup, within } from '@testing-library/react'
import LoanDetailsModal from '../features/lending/components/LoanDetailsModal'
import type { LoanRecord } from '../features/lending/types'

afterEach(() => {
  cleanup()
})

const activeLoan: LoanRecord = {
  loan_id: 1,
  asset_id: 101,
  equipment_name: 'ThinkPad T14',
  borrower_id: 201,
  borrower_name: 'Kobi Mensah',
  checkout_date: '2026-11-01',
  expected_return_date: '2026-11-14',
  actual_return_date: null,
  return_condition: null,
  status: 'on_loan',
}

const returnedLoan: LoanRecord = {
  loan_id: 2,
  asset_id: 102,
  equipment_name: 'Network Tester',
  borrower_id: 203,
  borrower_name: 'Keziah Adeyemi',
  checkout_date: '2026-10-01',
  expected_return_date: '2026-10-15',
  actual_return_date: '2026-10-14',
  return_condition: 'Intact',
  status: 'returned',
}

describe('LoanDetailsModal', () => {
  it('renders nothing when loan is null', () => {
    const { container } = render(
      <LoanDetailsModal loan={null} onClose={vi.fn()} />
    )

    expect(container.firstChild).toBeNull()
  })

  it('renders the loan details', () => {
    render(
      <LoanDetailsModal loan={activeLoan} onClose={vi.fn()} />
    )

    const dialog = screen.getByRole('dialog')

    expect(within(dialog).getByText('ThinkPad T14')).toBeTruthy()
    expect(within(dialog).getByText('Kobi Mensah')).toBeTruthy()
    expect(within(dialog).getByText('201')).toBeTruthy()
    expect(within(dialog).getByText('2026-11-01')).toBeTruthy()
    expect(within(dialog).getByText('2026-11-14')).toBeTruthy()
  })

  it('displays the correct loan status', () => {
    render(
      <LoanDetailsModal loan={activeLoan} onClose={vi.fn()} />
    )

    expect(screen.getByText('Active')).toBeTruthy()
  })

  it('shows return details for a returned loan', () => {
    render(
      <LoanDetailsModal loan={returnedLoan} onClose={vi.fn()} />
    )

    expect(screen.getByText('2026-10-14')).toBeTruthy()
    expect(screen.getByText('Intact')).toBeTruthy()
    expect(screen.getByText('Actual return date')).toBeTruthy()
    expect(screen.getByText('Return condition')).toBeTruthy()
  })

  it('does not show return details for an active loan', () => {
    render(
      <LoanDetailsModal loan={activeLoan} onClose={vi.fn()} />
    )

    expect(screen.queryByText('Actual return date')).toBeNull()
    expect(screen.queryByText('Return condition')).toBeNull()
  })

  it('calls onClose when the close button is clicked', () => {
    const onClose = vi.fn()

    render(
      <LoanDetailsModal loan={activeLoan} onClose={onClose} />
    )

    fireEvent.click(
      screen.getByRole('button', { name: 'Close loan details' })
    )

    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('calls onClose when the backdrop is clicked', () => {
    const onClose = vi.fn()

    const { container } = render(
      <LoanDetailsModal loan={activeLoan} onClose={onClose} />
    )

    fireEvent.click(container.firstChild as HTMLElement)

    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('does not close when the modal content is clicked', () => {
    const onClose = vi.fn()

    render(
      <LoanDetailsModal loan={activeLoan} onClose={onClose} />
    )

    fireEvent.click(screen.getByRole('dialog'))

    expect(onClose).not.toHaveBeenCalled()
  })

  it('calls onProcessReturn with the correct loan', () => {
    const onProcessReturn = vi.fn()

    render(
      <LoanDetailsModal
        loan={activeLoan}
        onClose={vi.fn()}
        onProcessReturn={onProcessReturn}
      />
    )

    fireEvent.click(
      screen.getByRole('button', { name: 'Process Return' })
    )

    expect(onProcessReturn).toHaveBeenCalledTimes(1)
    expect(onProcessReturn).toHaveBeenCalledWith(activeLoan)
  })

  it('does not show Process Return for a returned loan', () => {
    render(
      <LoanDetailsModal loan={returnedLoan} onClose={vi.fn()} />
    )

    expect(
      screen.queryByRole('button', { name: 'Process Return' })
    ).toBeNull()
  })
})
