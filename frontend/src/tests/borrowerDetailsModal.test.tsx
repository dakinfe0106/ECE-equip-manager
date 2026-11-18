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
  it('renders supplied borrower information including eligibility status', () => {
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
    expect(screen.getByText('Eligibility Status *')).toBeTruthy()
    expect(screen.getByText('Oscilloscope')).toBeTruthy()
    expect(screen.getByText('ECE-OSC-005')).toBeTruthy()
    expect(screen.getByText('Thermal Camera')).toBeTruthy()
    expect(screen.getByText('Flag recorded')).toBeTruthy()
    expect(screen.getByRole('button', { name: /View Borrowing Records/ })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Manage Damage Flags' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Save Changes' })).toBeTruthy()
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
    expect(screen.getByText('Eligibility Status *')).toBeTruthy()
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
    expect(closeButton.querySelector('svg path')?.getAttribute('d')).toBe('M18 6L6 18M6 6l12 12')
    expect(closeButton.className).toContain('text-[#637083]')
    expect(closeButton.className).toContain('hover:bg-[#eef2f7]')
    expect(closeButton.closest('[role="dialog"]')?.parentElement?.className).toContain('p-5')
    expect(closeButton.closest('[role="dialog"]')?.parentElement?.className).toContain('backdrop-blur-[2px]')
    expect(screen.getByRole('dialog').querySelector('footer')?.className).toContain('min-h-[70px]')

    const saveButton = screen.getByRole('button', { name: 'Save Changes' })
    saveButton.focus()
    fireEvent.keyDown(document, { key: 'Tab' })
    expect(document.activeElement).toBe(closeButton)

    await user.keyboard('{Escape}')
    expect(onClose).toHaveBeenCalledOnce()

    unmount()
    expect(document.activeElement).toBe(trigger)
    trigger.remove()
  })

  it('closes from the close action and backdrop', async () => {
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

    await user.click(screen.getByRole('button', { name: 'Close borrower details' }))
    expect(onClose).toHaveBeenCalledOnce()

    onClose.mockClear()
    fireEvent.mouseDown(container.firstElementChild!)
    expect(onClose).toHaveBeenCalledOnce()
  })

  it('disables the Save Changes button when no changes have been made', () => {
    render(
      <BorrowerDetailsModal
        borrower={borrower}
        onClose={() => {}}
        onManageDamageFlags={() => {}}
        onSave={() => {}}
      />,
    )

    const saveButton = screen.getByRole('button', { name: 'Save Changes' }) as HTMLButtonElement
    expect(saveButton.disabled).toBe(true)
  })

  it('enables the Save Changes button when first name is edited and triggers onSave successfully', async () => {
    const user = userEvent.setup()
    const onSave = vi.fn().mockResolvedValue(undefined)

    render(
      <BorrowerDetailsModal
        borrower={borrower}
        onClose={() => {}}
        onManageDamageFlags={() => {}}
        onSave={onSave}
      />,
    )

    const firstNameInput = screen.getByRole('textbox', { name: /First name/i })
    const saveButton = screen.getByRole('button', { name: 'Save Changes' }) as HTMLButtonElement

    expect(saveButton.disabled).toBe(true)

    await user.clear(firstNameInput)
    await user.type(firstNameInput, 'Jonathan')

    expect(saveButton.disabled).toBe(false)

    await user.click(saveButton)

    expect(onSave).toHaveBeenCalledOnce()
    expect(onSave).toHaveBeenCalledWith({ first_name: 'Jonathan' })
    expect(await screen.findByText('Borrower updated')).toBeTruthy()
    expect(screen.getByText('Your changes have been saved successfully.')).toBeTruthy()
  })

  it('displays an error and prevents saving if the first name is empty or whitespace', async () => {
    const user = userEvent.setup()
    const onSave = vi.fn()

    render(
      <BorrowerDetailsModal
        borrower={borrower}
        onClose={() => {}}
        onManageDamageFlags={() => {}}
        onSave={onSave}
      />,
    )

    const firstNameInput = screen.getByRole('textbox', { name: /First name/i })
    const saveButton = screen.getByRole('button', { name: 'Save Changes' })

    await user.clear(firstNameInput)
    await user.type(firstNameInput, '   ')
    await user.click(saveButton)

    expect(screen.getByText('Enter a first name.')).toBeTruthy()
    expect(onSave).not.toHaveBeenCalled()
  })

  it('displays an error message when saving fails', async () => {
    const user = userEvent.setup()
    const onSave = vi.fn().mockRejectedValue(new Error('Network error while updating.'))

    render(
      <BorrowerDetailsModal
        borrower={borrower}
        onClose={() => {}}
        onManageDamageFlags={() => {}}
        onSave={onSave}
      />,
    )

    const firstNameInput = screen.getByRole('textbox', { name: /First name/i })
    const saveButton = screen.getByRole('button', { name: 'Save Changes' })

    await user.clear(firstNameInput)
    await user.type(firstNameInput, 'Jonathan')
    await user.click(saveButton)

    expect(await screen.findByText('Network error while updating.')).toBeTruthy()
    expect(screen.queryByText('Your changes have been saved successfully.')).toBeNull()
  })
})