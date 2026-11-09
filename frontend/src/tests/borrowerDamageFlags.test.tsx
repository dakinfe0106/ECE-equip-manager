// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'

import BorrowerStandingBadge from '../features/borrowers/components/BorrowerStandingBadge'
import ManageDamageFlagsModal from '../features/borrowers/components/ManageDamageFlagsModal'
import RecordDamageFlagModal from '../features/borrowers/components/RecordDamageFlagModal'
import type { BorrowerIdentity, DamageFlag } from '../features/borrowers/types'

const borrower: BorrowerIdentity = {
  borrower_id: 42,
  borrower_name: 'Jordan Smith',
  standing: 'Overdue',
  is_eligible: false,
}

afterEach(() => {
  cleanup()
})

const flags: DamageFlag[] = [
  {
    id: 'flag-1',
    borrower_id: 42,
    borrower_name: 'Jordan Smith',
    equipment_id: 7,
    equipment_name: 'Cordless drill',
    incident_date: '2026-01-12',
    reason: 'Returned with cracked housing',
    notes: 'Reviewed by technician',
    status: 'unresolved',
    created_at: '2026-01-12T09:00:00Z',
    reviewed: true,
  },
  {
    id: 'flag-2',
    borrower_id: 42,
    borrower_name: 'Jordan Smith',
    equipment_id: 8,
    equipment_name: 'Laser level',
    incident_date: '2025-12-01',
    reason: 'Broken case after return',
    status: 'resolved',
    created_at: '2025-12-01T09:00:00Z',
    resolved_at: '2025-12-03T11:00:00Z',
    reviewed: true,
  },
]

describe('ManageDamageFlagsModal', () => {
  it('renders the borrower restriction modal and unresolved count', () => {
    const { container } = render(
      <ManageDamageFlagsModal
        borrower={borrower}
        flags={flags}
        unresolvedCount={1}
        onClose={() => {}}
        onResolveFlag={() => {}}
        onSelectFlag={() => {}}
        onRecordDamageFlag={() => {}}
      />,
    )

    expect(screen.getByText('Manage damage flags')).toBeTruthy()
    expect(screen.getByText('Jordan Smith')).toBeTruthy()
    expect(screen.getByText('1')).toBeTruthy()
    expect(screen.getByText(/A damaged return is not automatically negligent/i)).toBeTruthy()
    expect(screen.queryByText(/eligib/i)).toBeNull()

    const resolveButton = screen.getByRole('button', { name: 'Resolve Existing Flag' })
    const recordButton = screen.getByRole('button', { name: 'Record Damage Flag' })
    const buttons = Array.from(container.querySelectorAll<HTMLButtonElement>('button'))
    expect(buttons.findIndex((button) => button === resolveButton))
      .toBeLessThan(buttons.findIndex((button) => button === recordButton))
    expect(resolveButton.className).toContain('border-input')
    expect(recordButton.className).toContain('text-danger')
    expect(container.querySelector('[role="dialog"]')?.className).toContain('max-h-')
    expect(container.querySelector('[role="dialog"]')?.className).toContain('overflow-hidden')
    expect(container.querySelector('[role="dialog"] > div')?.className).toContain('overflow-y-auto')
  })

  it('only resolves the explicitly selected unresolved incident', async () => {
    const user = userEvent.setup()
    const onResolve = vi.fn()
    const multipleFlags: DamageFlag[] = [
      {
        ...flags[0],
        id: 'flag-1',
      },
      {
        ...flags[0],
        id: 'flag-2',
        equipment_name: 'Oscilloscope',
        reason: 'Screen damaged',
      },
      flags[1],
      {
        id: 'flag-3',
        borrower_id: 42,
        borrower_name: 'Jordan Smith',
        equipment_id: 12,
        equipment_name: 'Laser level',
        incident_date: '2026-02-05',
        reason: 'Case cracked after return',
        status: 'unresolved',
        created_at: '2026-02-05T10:00:00Z',
        reviewed: true,
      },
    ]

    render(
      <ManageDamageFlagsModal
        borrower={borrower}
        flags={multipleFlags}
        unresolvedCount={2}
        onClose={() => {}}
        onResolveFlag={onResolve}
        onSelectFlag={() => {}}
        onRecordDamageFlag={() => {}}
      />,
    )

    const resolveButton = screen.getByRole('button', { name: 'Resolve Existing Flag' })
    const saveButton = screen.getByRole('button', { name: /Save selected flag resolution/i })
    const resolvedIncident = screen.getByRole('button', {
      name: /Resolved incident: Laser level, Broken case after return/i,
    })
    expect(resolveButton.hasAttribute('disabled')).toBe(true)
    expect(resolvedIncident.hasAttribute('disabled')).toBe(true)

    await user.click(screen.getByRole('button', {
      name: /Select unresolved incident: Cordless drill, Returned with cracked housing/i,
    }))
    await user.click(resolveButton)
    expect(saveButton.hasAttribute('disabled')).toBe(false)

    await user.click(screen.getByRole('button', {
      name: /Select unresolved incident: Laser level, Case cracked after return/i,
    }))
    expect(saveButton.hasAttribute('disabled')).toBe(true)

    await user.click(resolveButton)
    await user.click(saveButton)

    expect(onResolve).toHaveBeenCalledTimes(1)
    expect(onResolve).toHaveBeenCalledWith('flag-3')
    expect(screen.getByText(/incident remains in history/i)).toBeTruthy()
    expect(screen.getByRole('button', {
      name: /Resolved incident: Laser level, Case cracked after return/i,
    })).toBeTruthy()
    expect(screen.getByText('Broken case after return')).toBeTruthy()
  })

  it('shows asynchronous resolution errors and prevents duplicate saves', async () => {
    const user = userEvent.setup()
    let rejectSave: (error: Error) => void = () => {}
    const onResolve = vi.fn(() => new Promise<void>((_resolve, reject) => {
      rejectSave = reject
    }))

    render(
      <ManageDamageFlagsModal
        borrower={borrower}
        flags={[flags[0]]}
        unresolvedCount={1}
        onClose={() => {}}
        onResolveFlag={onResolve}
      />,
    )

    await user.click(screen.getByRole('button', {
      name: /Select unresolved incident: Cordless drill/i,
    }))
    await user.click(screen.getByRole('button', { name: 'Resolve Existing Flag' }))
    const saveButton = screen.getByRole('button', { name: /Save selected flag resolution/i })
    await user.click(saveButton)
    await user.click(saveButton)

    expect(onResolve).toHaveBeenCalledTimes(1)
    expect(saveButton.textContent).toBe('Saving…')
    expect(saveButton.hasAttribute('disabled')).toBe(true)
    rejectSave(new Error('Resolution was rejected.'))
    expect((await screen.findByRole('alert')).textContent).toContain('Resolution was rejected.')
  })

  it('traps keyboard focus, closes on Escape, and restores focus on unmount', () => {
    const trigger = document.createElement('button')
    document.body.append(trigger)
    trigger.focus()
    const onClose = vi.fn()
    const { unmount } = render(
      <ManageDamageFlagsModal
        borrower={borrower}
        flags={[]}
        unresolvedCount={0}
        onClose={onClose}
      />,
    )

    const closeButton = screen.getByRole('button', { name: 'Close damage flag management' })
    expect(document.activeElement).toBe(closeButton)

    const cancelButton = screen.getByRole('button', { name: 'Cancel' })
    cancelButton.focus()
    fireEvent.keyDown(document, { key: 'Tab' })
    expect(document.activeElement).toBe(closeButton)
    closeButton.focus()
    fireEvent.keyDown(document, { key: 'Tab', shiftKey: true })
    expect(document.activeElement).toBe(cancelButton)

    fireEvent.keyDown(document, { key: 'Escape' })
    expect(onClose).toHaveBeenCalledTimes(1)
    unmount()
    expect(document.activeElement).toBe(trigger)
    trigger.remove()
  })
})

describe('BorrowerStandingBadge', () => {
  it('shows standing without displaying unsupported eligibility information', () => {
    render(<BorrowerStandingBadge standing="Overdue" />)
    expect(screen.getByText('Overdue')).toBeTruthy()
    expect(screen.queryByText(/eligib/i)).toBeNull()
  })

  it('shows standing as unavailable when the system has not provided one', () => {
    render(<BorrowerStandingBadge />)
    expect(screen.getByText('Standing unavailable')).toBeTruthy()
    expect(screen.queryByText(/eligib/i)).toBeNull()
  })
})

describe('RecordDamageFlagModal', () => {
  it('keeps its header and actions fixed while the form body scrolls', () => {
    const { container } = render(
      <RecordDamageFlagModal
        borrower={borrower}
        equipmentOptions={[]}
        onCancel={() => {}}
        onSave={() => {}}
      />,
    )

    const dialog = container.querySelector('[role="dialog"]')
    const form = dialog?.querySelector('form')
    const body = form?.firstElementChild
    const actions = form?.lastElementChild
    expect(dialog?.className).toContain('max-h-')
    expect(dialog?.className).toContain('overflow-hidden')
    expect(body?.className).toContain('overflow-y-auto')
    expect(actions?.className).toContain('shrink-0')
    expect(screen.getByRole('dialog').querySelector('#incident-date')?.parentElement?.className)
      .not.toContain('grid')
  })

  it('requires inspection review confirmation before saving', async () => {
    const user = userEvent.setup()
    const onSave = vi.fn()

    render(
      <RecordDamageFlagModal
        borrower={borrower}
        equipmentOptions={[{ id: 7, name: 'Cordless drill' }, { id: 12, name: 'Laser level' }]}
        onCancel={() => {}}
        onSave={onSave}
      />,
    )

    await user.selectOptions(screen.getByRole('combobox'), '7')
    await user.type(screen.getByLabelText(/Incident date/i), '2026-01-12')
    await user.type(screen.getByLabelText(/Reason/i), 'Cracked housing after return')

    await user.click(screen.getByRole('button', { name: 'Save' }))

    expect(screen.getByText(/Negligence review confirmation is required/i)).toBeTruthy()
    expect(onSave).not.toHaveBeenCalled()
  })

  it('records a validated incident', async () => {
    const user = userEvent.setup()
    const onSave = vi.fn()

    render(
      <RecordDamageFlagModal
        borrower={borrower}
        equipmentOptions={[{ id: 7, name: 'Cordless drill' }]}
        onCancel={() => {}}
        onSave={onSave}
      />,
    )

    await user.selectOptions(screen.getByRole('combobox'), '7')
    await user.type(screen.getByLabelText(/Incident date/i), '2026-01-12')
    await user.type(screen.getByLabelText(/Reason/i), 'Cracked housing after return')
    await user.click(screen.getByRole('checkbox'))
    await user.click(screen.getByRole('button', { name: 'Save' }))

    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({
        borrower_id: borrower.borrower_id,
        equipment_id: 7,
        reason: 'Cracked housing after return',
        reviewed: true,
      }),
    )
    expect(onSave.mock.calls[0][0]).not.toHaveProperty('reviewed_by')
    expect(screen.getByRole('status').textContent).toBe('Damage flag recorded.')
    await user.click(screen.getByRole('button', { name: 'Saved' }))
    expect(onSave).toHaveBeenCalledTimes(1)
  })

  it('shows asynchronous save errors without duplicating submissions', async () => {
    const user = userEvent.setup()
    let rejectSave: (error: Error) => void = () => {}
    const onSave = vi.fn(() => new Promise<void>((_resolve, reject) => {
      rejectSave = reject
    }))

    render(
      <RecordDamageFlagModal
        borrower={borrower}
        equipmentOptions={[{ id: 7, name: 'Cordless drill' }]}
        onCancel={() => {}}
        onSave={onSave}
      />,
    )

    await user.selectOptions(screen.getByRole('combobox'), '7')
    await user.type(screen.getByLabelText(/Incident date/i), '2026-01-12')
    await user.type(screen.getByLabelText(/Reason/i), 'Cracked housing after return')
    await user.click(screen.getByRole('checkbox'))
    await user.click(screen.getByRole('button', { name: 'Save' }))
    await user.click(screen.getByRole('button', { name: 'Saving…' }))

    expect(onSave).toHaveBeenCalledTimes(1)
    rejectSave(new Error('Damage flag could not be saved.'))
    await waitFor(() => {
      expect(screen.getByRole('alert').textContent).toContain('Damage flag could not be saved.')
    })
  })
})
