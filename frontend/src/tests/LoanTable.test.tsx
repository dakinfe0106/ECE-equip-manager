
 // @vitest-environment jsdom

import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import LoanTable from '../features/lending/components/LoanTable'
import type { LoanRecord } from '../features/lending/types'

afterEach(() => {
  cleanup()

})
const mockLoans: LoanRecord[] = [
  {
    loan_id: 1,
    asset_id: 101,
    asset_identifier: 'ECE-101',
    equipment_name: 'ThinkPad T14',
    borrower_id: 201,
    borrower_unb_id: 'UNB-0201',
    borrower_name: 'Kobi Mensah',
    checkout_date: '2026-11-01',
    expected_return_date: '2026-11-14',
    actual_return_date: null,
    return_condition: null,
    status: 'on_loan',
  },
  {
    loan_id: 2,
    asset_id: 102,
    asset_identifier: 'ECE-102',
    equipment_name: 'Thermal Camera',
    borrower_id: 202,
    borrower_unb_id: 'UNB-0202',
    borrower_name: 'Diana Okafor',
    checkout_date: '2026-10-20',
    expected_return_date: '2026-11-10',
    actual_return_date: null,
    return_condition: null,
    status: 'overdue',
  },
  {
    loan_id: 3,
    asset_id: 103,
    asset_identifier: 'ECE-103',
    equipment_name: 'Network Tester',
    borrower_id: 203,
    borrower_unb_id: 'UNB-0203',
    borrower_name: 'Keziah Adeyemi',
    checkout_date: '2026-10-01',
    expected_return_date: '2026-10-15',
    actual_return_date: '2026-10-14',
    return_condition: 'Intact',
    status: 'returned',
  },
]

describe('LoanTable', () => {
  it('renders all five table columns', () => {
    render(<LoanTable loans={mockLoans} onSelectLoan={vi.fn()} />)

    expect(screen.getByText('Asset')).toBeTruthy()
    expect(screen.getByText('Borrower')).toBeTruthy()
    expect(screen.getByText('Checkout Date')).toBeTruthy()
    expect(screen.getByText('Expected Return')).toBeTruthy()
    expect(screen.getByText('Status')).toBeTruthy()
  })

  it('displays the loan records', () => {
    render(<LoanTable loans={mockLoans} onSelectLoan={vi.fn()} />)

    expect(screen.getByText('ThinkPad T14')).toBeTruthy()
    expect(screen.getByText('Kobi Mensah')).toBeTruthy()
    expect(screen.getByText('2026-11-01')).toBeTruthy()
    expect(screen.getByText('2026-11-14')).toBeTruthy()

    expect(screen.getByText('Thermal Camera')).toBeTruthy()
    expect(screen.getByText('Diana Okafor')).toBeTruthy()

    expect(screen.getByText('Network Tester')).toBeTruthy()
    expect(screen.getByText('Keziah Adeyemi')).toBeTruthy()
  })

  it('displays the correct status badges', () => {
    render(<LoanTable loans={mockLoans} onSelectLoan={vi.fn()} />)

    expect(screen.getByText('Active')).toBeTruthy()
    expect(screen.getByText('Overdue')).toBeTruthy()
    expect(screen.getByText('Completed')).toBeTruthy()
  })

  it('calls onSelectLoan with the correct loan when an asset is clicked', () => {
    const onSelectLoan = vi.fn()

    render(<LoanTable loans={mockLoans} onSelectLoan={onSelectLoan} />)

    fireEvent.click(screen.getByRole('button', { name: 'ThinkPad T14' }))

    expect(onSelectLoan).toHaveBeenCalledTimes(1)
    expect(onSelectLoan).toHaveBeenCalledWith(mockLoans[0])
  })

  it('displays the empty state when there are no loans', () => {
    render(<LoanTable loans={[]} onSelectLoan={vi.fn()} />)

    expect(screen.getByText('No loans found.')).toBeTruthy()
  })


   it('allows each asset to open its own loan record', () => {
    const onSelectLoan = vi.fn()

    render(<LoanTable loans={mockLoans} onSelectLoan={onSelectLoan} />)

    fireEvent.click(screen.getByRole('button', { name: 'Thermal Camera' }))
    fireEvent.click(screen.getByRole('button', { name: 'Network Tester' }))

    expect(onSelectLoan).toHaveBeenNthCalledWith(1, mockLoans[1])
    expect(onSelectLoan).toHaveBeenNthCalledWith(2, mockLoans[2])
  })

})
