// @vitest-environment jsdom

import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, it, expect, vi } from 'vitest'
import AddBorrowerModal from '../features/borrowers/components/AddBorrowerModal'
import BorrowerDetailsModal from '../features/borrowers/components/BorrowerDetailsModal'
import { BorrowerRequestError } from '../features/borrowers/api'

afterEach(() => {
  cleanup()
})

describe('AddBorrowerModal', () => {
  it('renders all required fields and buttons', () => {
    const onClose = vi.fn()
    const onSave = vi.fn().mockResolvedValue(undefined)

    render(<AddBorrowerModal onClose={onClose} onSave={onSave} />)

    expect(screen.getByRole('heading', { name: /add borrower/i })).toBeTruthy()
    expect(screen.getByLabelText(/unb id \*/i)).toBeTruthy()
    expect(screen.getByLabelText(/first name \*/i)).toBeTruthy()
    expect(screen.getByLabelText(/last name \*/i)).toBeTruthy()
    expect(screen.getByRole('button', { name: /save/i })).toBeTruthy()
    expect(screen.getByRole('button', { name: /cancel/i })).toBeTruthy()
  })

  it('submits form successfully with valid inputs and trims whitespace', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()
    const onSave = vi.fn().mockResolvedValue(undefined)

    render(<AddBorrowerModal onClose={onClose} onSave={onSave} />)

    await user.type(screen.getByLabelText(/unb id \*/i), '  998877  ')
    await user.type(screen.getByLabelText(/first name \*/i), '  Jane  ')
    await user.type(screen.getByLabelText(/last name \*/i), '  Doe  ')

    await user.click(screen.getByRole('button', { name: /^save$/i }))

    await waitFor(() => {
      expect(onSave).toHaveBeenCalledWith({
        unb_id: '998877',
        first_name: 'Jane',
        last_name: 'Doe',
      })
      expect(onClose).toHaveBeenCalled()
    })
  })

  it('prevents submission when UNB ID or First Name is only whitespace', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()
    const onSave = vi.fn()

    render(<AddBorrowerModal onClose={onClose} onSave={onSave} />)

    await user.type(screen.getByLabelText(/unb id \*/i), '   ')
    await user.type(screen.getByLabelText(/first name \*/i), 'Jane')
    await user.type(screen.getByLabelText(/last name \*/i), 'Doe')
    await user.click(screen.getByRole('button', { name: /^save$/i }))

    const alert = await screen.findByRole('alert')
    expect(alert.textContent).toMatch(/enter a unb id/i)
    expect(onSave).not.toHaveBeenCalled()
  })

  it('displays backend field errors (such as duplicate UNB ID) in the error banner', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()
    const errorResponse = new BorrowerRequestError(400, {
      unb_id: ['A borrower with this UNB ID already exists.'],
    })
    const onSave = vi.fn().mockRejectedValue(errorResponse)

    render(<AddBorrowerModal onClose={onClose} onSave={onSave} />)

    await user.type(screen.getByLabelText(/unb id \*/i), '377665')
    await user.type(screen.getByLabelText(/first name \*/i), 'Test')
    await user.type(screen.getByLabelText(/last name \*/i), 'User')

    await user.click(screen.getByRole('button', { name: /^save$/i }))

    const alert = await screen.findByRole('alert')
    expect(alert.textContent).toMatch(/a borrower with this unb id already exists/i)
    expect(onClose).not.toHaveBeenCalled()
  })

  it('closes modal when cancel button is clicked or Escape is pressed', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()
    const onSave = vi.fn()

    render(<AddBorrowerModal onClose={onClose} onSave={onSave} />)

    await user.click(screen.getByRole('button', { name: /cancel/i }))
    expect(onClose).toHaveBeenCalledTimes(1)

    await user.keyboard('{Escape}')
    expect(onClose).toHaveBeenCalledTimes(2)
  })
})

describe('BorrowerDetailsModal - Manual Enrollment Badge', () => {
  const baseBorrower = {
    borrower_id: 1,
    borrower_name: 'Kobi Mensah',
    unb_id: '3519271',
  }

  it('displays the "Manually added" badge when is_manual_enrollment is true', () => {
    render(
      <BorrowerDetailsModal
        borrower={{ ...baseBorrower, is_manual_enrollment: true }}
        onClose={vi.fn()}
        onManageDamageFlags={vi.fn()}
      />
    )

    expect(screen.getByText(/manually added/i)).toBeTruthy()
  })

  it('hides the "Manually added" badge when is_manual_enrollment is false', () => {
    render(
      <BorrowerDetailsModal
        borrower={{ ...baseBorrower, is_manual_enrollment: false }}
        onClose={vi.fn()}
        onManageDamageFlags={vi.fn()}
      />
    )

    expect(screen.queryByText(/manually added/i)).toBeNull()
  })
})