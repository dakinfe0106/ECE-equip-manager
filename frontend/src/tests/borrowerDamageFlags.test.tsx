// @vitest-environment jsdom

import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'

import BorrowerStandingBadge from '../features/borrowers/components/BorrowerStandingBadge'
import ManageDamageFlagsModal from '../features/borrowers/components/ManageDamageFlagsModal'
import RecordDamageFlagModal from '../features/borrowers/components/RecordDamageFlagModal'
import type { BorrowerIdentity, DamageFlag } from '../features/borrowers/types'

const borrower: BorrowerIdentity = {
  borrower_id: 42,
  borrower_name: 'Jordan Smith',
  standing: 'warning',
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
    reviewed_by: 'tech-01',
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
    render(
      <ManageDamageFlagsModal
        borrower={borrower}
        flags={flags}
        unresolvedCount={1}
        onClose={() => {}}
        onSaveChanges={() => {}}
        onResolveFlag={() => {}}
        onSelectFlag={() => {}}
        onRecordDamageFlag={() => {}}
      />,
    )

    expect(screen.getByText('Manage damage flags')).toBeTruthy()
    expect(screen.getByText('Jordan Smith')).toBeTruthy()
    expect(screen.getByText('1')).toBeTruthy()
    expect(screen.getByText(/A damaged return is not automatically negligent/i)).toBeTruthy()
  })

  it('requires explicit selection before resolving and saves the selected incident', async () => {
    const user = userEvent.setup()
    const onSave = vi.fn()
    const multipleFlags: DamageFlag[] = [
      {
        ...flags[0],
        id: 'flag-1',
      },
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
        onSaveChanges={onSave}
        onResolveFlag={() => {}}
        onSelectFlag={() => {}}
        onRecordDamageFlag={() => {}}
      />,
    )

    const resolveButton = screen.getByRole('button', { name: /Resolve Existing Flag/i })
    expect(resolveButton.hasAttribute('disabled')).toBe(true)

    await user.click(screen.getByRole('button', { name: /Laser level/i }))

    expect(screen.getByText('Selected incident')).toBeTruthy()
    expect(screen.getAllByText('Case cracked after return').length).toBeGreaterThan(0)
    expect(screen.getByRole('button', { name: /Resolve Existing Flag/i }).hasAttribute('disabled')).toBe(false)

    const saveButton = screen.getByRole('button', { name: /Save selected flag resolution/i })
    await user.click(saveButton)

    expect(onSave).toHaveBeenCalledTimes(1)
  })
})

describe('BorrowerStandingBadge', () => {
  it('shows eligibility as unavailable when the value is missing', () => {
    render(<BorrowerStandingBadge standing="warning" />)
    expect(screen.getByText('Eligibility unavailable')).toBeTruthy()
  })
})

describe('RecordDamageFlagModal', () => {
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
  })
})
