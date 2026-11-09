// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import BorrowerDetailsModal from '../features/borrowers/components/BorrowerDetailsModal'
import type { BorrowerDetailsViewModel } from '../features/borrowers/types'

const borrower: BorrowerDetailsViewModel = {
  borrower_id: 42,
  borrower_name: 'Jordan Smith',
  unb_id: '0000142',
  standing: 'Overdue',
  certifications: ['Lab Safety', 'Electrical'],
  active_loans: [
    {
      loan_id: 5,
      equipment_name: 'Oscilloscope',
      asset_identifier: 'ECE-OSC-005',
      checkout_date: '2026-10-01',
      expected_return_date: '2026-10-15',
    },
  ],
  overdue_equipment: [
    {
      equipment_name: 'Thermal Camera',
      asset_identifier: 'ECE-CAM-002',
      expected_return_date: '2026-10-20',
    },
  ],
  negligent_damage_flag: true,
}

afterEach(() => {
  cleanup()
})

describe('BorrowerDetailsModal', () => {
  it('renders supplied borrower information without adding eligibility', () => {
    render(
      <BorrowerDetailsModal
        borrower={borrower}
        onClose={() => {}}
        onViewBorrowingRecords={() => {}}
        onManageDamageFlags={() => {}}
      />,
    )

    expect(screen.getByRole('dialog', { name: 'Jordan Smith' })).toBeTruthy()
    expect(screen.getByText(/Borrower details · UNB ID 0000142/)).toBeTruthy()
    expect(screen.getByText('0000142')).toBeTruthy()
    expect(screen.getAllByText('Overdue')).toHaveLength(2)
    expect(screen.getByText('Lab Safety, Electrical')).toBeTruthy()
    expect(screen.getByText('Oscilloscope')).toBeTruthy()
    expect(screen.getByText('ECE-OSC-005')).toBeTruthy()
    expect(screen.getByText('Thermal Camera')).toBeTruthy()
    expect(screen.getByText('Flag recorded')).toBeTruthy()
    expect(screen.queryByText(/eligible/i)).toBeNull()
    expect(screen.getByRole('button', { name: /View Borrowing Records/ })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Manage Damage Flags' })).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Save Changes' })).toBeNull()
  })

  it('reports omitted data as unavailable and supplied empty or false values accurately', () => {
    render(
      <BorrowerDetailsModal
        borrower={{
          borrower_id: 42,
          borrower_name: 'Jordan Smith',
          unb_id: '0000142',
          active_loans: [],
          overdue_equipment: [],
          negligent_damage_flag: false,
        }}
        onClose={() => {}}
        onViewBorrowingRecords={() => {}}
        onManageDamageFlags={() => {}}
      />,
    )

    expect(screen.getAllByText('Standing unavailable')).toHaveLength(2)
    expect(screen.getByText('Certification information unavailable.')).toBeTruthy()
    expect(screen.getByText('No active loans.')).toBeTruthy()
    expect(screen.getByText('No overdue equipment.')).toBeTruthy()
    expect(screen.getByText('No flag recorded')).toBeTruthy()
    expect(screen.queryByText(/eligible/i)).toBeNull()
  })

  it('distinguishes an empty certification list from unavailable information', () => {
    render(
      <BorrowerDetailsModal
        borrower={{ ...borrower, certifications: [] }}
        onClose={() => {}}
        onViewBorrowingRecords={() => {}}
        onManageDamageFlags={() => {}}
      />,
    )

    expect(screen.getByText('No certifications recorded.')).toBeTruthy()
    expect(screen.queryByText('Certification information unavailable.')).toBeNull()
  })

  it('passes the borrower ID to each integration callback', async () => {
    const user = userEvent.setup()
    const onViewBorrowingRecords = vi.fn()
    const onManageDamageFlags = vi.fn()

    render(
      <BorrowerDetailsModal
        borrower={borrower}
        onClose={() => {}}
        onViewBorrowingRecords={onViewBorrowingRecords}
        onManageDamageFlags={onManageDamageFlags}
      />,
    )

    await user.click(screen.getByRole('button', { name: 'View Borrowing Records' }))
    await user.click(screen.getByRole('button', { name: 'Manage Damage Flags' }))

    expect(onViewBorrowingRecords).toHaveBeenCalledOnce()
    expect(onViewBorrowingRecords).toHaveBeenCalledWith(42)
    expect(onManageDamageFlags).toHaveBeenCalledOnce()
    expect(onManageDamageFlags).toHaveBeenCalledWith(42)
  })

  it('traps focus, closes with Escape, and restores focus after closing', async () => {
    const user = userEvent.setup()
    const trigger = document.createElement('button')
    document.body.append(trigger)
    trigger.focus()
    const onClose = vi.fn()
    const { unmount } = render(
      <BorrowerDetailsModal
        borrower={borrower}
        onClose={onClose}
        onViewBorrowingRecords={() => {}}
        onManageDamageFlags={() => {}}
      />,
    )

    const closeButton = screen.getByRole('button', { name: 'Close borrower details' })
    expect(document.activeElement).toBe(closeButton)

    const cancelButton = screen.getByRole('button', { name: 'Cancel' })
    cancelButton.focus()
    fireEvent.keyDown(document, { key: 'Tab' })
    expect(document.activeElement).toBe(closeButton)

    await user.keyboard('{Escape}')
    expect(onClose).toHaveBeenCalledOnce()

    unmount()
    expect(document.activeElement).toBe(trigger)
    trigger.remove()
  })

  it('closes from the cancel button and backdrop', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()
    const { container } = render(
      <BorrowerDetailsModal
        borrower={borrower}
        onClose={onClose}
        onViewBorrowingRecords={() => {}}
        onManageDamageFlags={() => {}}
      />,
    )

    await user.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(onClose).toHaveBeenCalledOnce()

    onClose.mockClear()
    fireEvent.mouseDown(container.firstElementChild!)
    expect(onClose).toHaveBeenCalledOnce()
  })
})
