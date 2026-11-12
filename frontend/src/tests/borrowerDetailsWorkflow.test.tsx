// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ComponentProps } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import BorrowerDetailsWorkflow from '../features/borrowers/components/BorrowerDetailsWorkflow'
import type {
  BorrowerDetailsViewModel,
  DamageFlag,
  DamageFlagCreateInput,
} from '../features/borrowers/types'

const borrower: BorrowerDetailsViewModel = {
  borrower_id: 42,
  borrower_name: 'Jordan Smith',
  unb_id: '0000142',
  standing: 'Overdue',
}

const firstFlag: DamageFlag = {
  id: 'flag-1',
  borrower_id: borrower.borrower_id,
  borrower_name: borrower.borrower_name,
  equipment_id: 7,
  equipment_name: 'Cordless drill',
  incident_date: '2026-01-12',
  reason: 'Returned with cracked housing',
  status: 'unresolved',
  created_at: '2026-01-12T09:00:00Z',
  reviewed: true,
}

const secondFlag: DamageFlag = {
  ...firstFlag,
  id: 'flag-2',
  equipment_id: 8,
  equipment_name: 'Laser level',
  reason: 'Broken case after return',
}

const createdFlag: DamageFlag = {
  ...firstFlag,
  id: 'flag-3',
  equipment_id: 9,
  equipment_name: 'Oscilloscope',
  incident_date: '2026-03-15',
  reason: 'Screen damaged',
}

function renderWorkflow(overrides: Partial<ComponentProps<typeof BorrowerDetailsWorkflow>> = {}) {
  const onClose = vi.fn()
  const onViewBorrowingRecords = vi.fn()
  const result = render(
    <BorrowerDetailsWorkflow
      borrower={borrower}
      onClose={onClose}
      onViewBorrowingRecords={onViewBorrowingRecords}
      {...overrides}
    />,
  )
  return { ...result, onClose, onViewBorrowingRecords }
}

afterEach(() => {
  cleanup()
})

describe('BorrowerDetailsWorkflow', () => {
  it('closes before navigating to borrowing records for the selected borrower', async () => {
    const user = userEvent.setup()
    const calls: string[] = []
    const onClose = vi.fn(() => calls.push('close'))
    const onViewBorrowingRecords = vi.fn((borrowerId: number) => {
      calls.push(`navigate:${borrowerId}`)
    })
    renderWorkflow({ onClose, onViewBorrowingRecords })

    await user.click(screen.getByRole('button', { name: 'View Borrowing Records' }))

    expect(onClose).toHaveBeenCalledOnce()
    expect(onViewBorrowingRecords).toHaveBeenCalledOnce()
    expect(onViewBorrowingRecords).toHaveBeenCalledWith(borrower.borrower_id)
    expect(calls).toEqual(['close', `navigate:${borrower.borrower_id}`])
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('keeps borrower identity consistent while navigating and recording an incident', async () => {
    const user = userEvent.setup()
    const onLoadDamageFlags = vi.fn().mockResolvedValue([firstFlag])
    const onCreateDamageFlag = vi.fn(async (input: DamageFlagCreateInput) => ({
      ...createdFlag,
      borrower_id: input.borrower_id,
      borrower_name: input.borrower_name,
    }))
    renderWorkflow({
      onLoadDamageFlags,
      onCreateDamageFlag,
      equipmentOptions: [{ id: 9, name: 'Oscilloscope' }],
    })

    expect(screen.getAllByRole('dialog')).toHaveLength(1)

    await user.click(screen.getByRole('button', { name: 'Manage Damage Flags' }))
    expect(onLoadDamageFlags).toHaveBeenCalledWith(borrower.borrower_id)
    expect(screen.getAllByRole('dialog')).toHaveLength(1)
    expect(screen.getByText('Jordan Smith')).toBeTruthy()
    expect(screen.getByText('1')).toBeTruthy()

    await user.click(screen.getByRole('button', { name: 'Record Damage Flag' }))
    expect(screen.getAllByRole('dialog')).toHaveLength(1)
    expect(screen.getByRole('dialog', { name: 'Record damage flag' })).toBeTruthy()
    await user.selectOptions(screen.getByRole('combobox', { name: 'Equipment' }), '9')
    await user.type(screen.getByLabelText(/Incident date/i), '2026-03-15')
    await user.type(screen.getByLabelText('Reason'), 'Screen damaged')
    await user.click(screen.getByRole('checkbox'))
    await user.click(screen.getByRole('button', { name: 'Save' }))

    await waitFor(() => expect(onCreateDamageFlag).toHaveBeenCalledWith(
      expect.objectContaining({
        borrower_id: borrower.borrower_id,
        borrower_name: borrower.borrower_name,
        equipment_id: 9,
        reviewed: true,
      }),
    ))
    expect(screen.getByRole('status').textContent).toBe('Damage flag recorded.')
    await user.click(screen.getByRole('button', { name: 'Cancel' }))

    expect(screen.getAllByRole('dialog')).toHaveLength(1)
    expect(screen.getByRole('dialog', { name: 'Manage damage flags' })).toBeTruthy()
    expect(screen.getByText('2')).toBeTruthy()
    expect(screen.getByText('Oscilloscope')).toBeTruthy()
    await user.click(screen.getByRole('button', { name: 'Close damage flag management' }))

    expect(screen.getByRole('dialog', { name: 'Jordan Smith' })).toBeTruthy()
    expect(screen.getByText('0000142')).toBeTruthy()
  })

  it('does not show counts or empty history while loading, and shows empty only after success', async () => {
    const user = userEvent.setup()
    let finishLoading: (flags: DamageFlag[]) => void = () => {}
    renderWorkflow({
      onLoadDamageFlags: () => new Promise((resolve) => {
        finishLoading = resolve
      }),
    })

    await user.click(screen.getByRole('button', { name: 'Manage Damage Flags' }))
    expect(screen.getByRole('status').textContent).toContain('Loading')
    expect(screen.queryByText('Unresolved negligent damage flags')).toBeNull()
    expect(screen.queryByText('No unresolved damage flags.')).toBeNull()
    expect(screen.getAllByRole('dialog')).toHaveLength(1)

    finishLoading([])
    expect(await screen.findByText('No unresolved damage flags.')).toBeTruthy()
    expect(screen.getByText('0')).toBeTruthy()
  })

  it('distinguishes unavailable data and supports retry after load errors', async () => {
    const user = userEvent.setup()
    const { rerender } = renderWorkflow()
    await user.click(screen.getByRole('button', { name: 'Manage Damage Flags' }))
    expect(screen.getByRole('status').textContent).toContain('unavailable')
    expect(screen.queryByText('0')).toBeNull()
    expect(screen.getAllByRole('dialog')).toHaveLength(1)

    const onLoadDamageFlags = vi.fn()
      .mockRejectedValueOnce(new Error('Service is offline.'))
      .mockResolvedValueOnce([firstFlag])
    rerender(
      <BorrowerDetailsWorkflow
        borrower={borrower}
        onClose={() => {}}
        onViewBorrowingRecords={() => {}}
        onLoadDamageFlags={onLoadDamageFlags}
      />,
    )
    await user.click(screen.getByRole('button', { name: 'Close damage flag management' }))
    await user.click(screen.getByRole('button', { name: 'Manage Damage Flags' }))
    expect(await screen.findByRole('alert')).toHaveProperty(
      'textContent',
      expect.stringContaining('Service is offline.'),
    )
    expect(screen.queryByText('0')).toBeNull()

    await user.click(screen.getByRole('button', { name: 'Retry' }))
    expect(await screen.findByText('Cordless drill')).toBeTruthy()
    expect(onLoadDamageFlags).toHaveBeenCalledTimes(2)
    expect(onLoadDamageFlags).toHaveBeenNthCalledWith(2, borrower.borrower_id)
  })

  it('resolves only the selected incident after persistence confirms it', async () => {
    const user = userEvent.setup()
    const onResolveDamageFlag = vi.fn(async (flagId: string) => ({
      ...(flagId === secondFlag.id ? secondFlag : firstFlag),
      id: flagId,
      status: 'resolved' as const,
      resolved_at: '2026-03-20T12:00:00Z',
    }))
    renderWorkflow({
      onLoadDamageFlags: async () => [firstFlag, secondFlag],
      onResolveDamageFlag,
    })

    await user.click(screen.getByRole('button', { name: 'Manage Damage Flags' }))
    await user.click(screen.getByRole('button', {
      name: /Select unresolved incident: Laser level, Broken case after return/,
    }))
    await user.click(screen.getByRole('button', { name: 'Resolve Existing Flag' }))
    await user.click(screen.getByRole('button', { name: /Save selected flag resolution/ }))

    await waitFor(() => expect(onResolveDamageFlag).toHaveBeenCalledWith(secondFlag.id))
    expect(await screen.findByText(/incident remains in history/i)).toBeTruthy()
    expect(screen.getByRole('button', {
      name: /Resolved incident: Laser level, Broken case after return/,
    })).toBeTruthy()
    expect(screen.getByRole('button', {
      name: /Select unresolved incident: Cordless drill, Returned with cracked housing/,
    })).toBeTruthy()
  })

  it('keeps incidents unchanged and reports a failed resolve or create', async () => {
    const user = userEvent.setup()
    const onResolveDamageFlag = vi.fn().mockRejectedValue(new Error('Resolve failed.'))
    const onCreateDamageFlag = vi.fn().mockRejectedValue(new Error('Create failed.'))
    renderWorkflow({
      onLoadDamageFlags: async () => [firstFlag],
      onResolveDamageFlag,
      onCreateDamageFlag,
      equipmentOptions: [{ id: 9, name: 'Oscilloscope' }],
    })

    await user.click(screen.getByRole('button', { name: 'Manage Damage Flags' }))
    await user.click(screen.getByRole('button', {
      name: /Select unresolved incident: Cordless drill/,
    }))
    await user.click(screen.getByRole('button', { name: 'Resolve Existing Flag' }))
    await user.click(screen.getByRole('button', { name: /Save selected flag resolution/ }))
    expect(await screen.findByRole('alert')).toHaveProperty(
      'textContent',
      expect.stringContaining('Resolve failed.'),
    )
    expect(screen.getByRole('button', {
      name: /Select unresolved incident: Cordless drill/,
    })).toBeTruthy()

    await user.click(screen.getByRole('button', { name: 'Record Damage Flag' }))
    await user.selectOptions(screen.getByRole('combobox', { name: 'Equipment' }), '9')
    await user.type(screen.getByLabelText(/Incident date/i), '2026-03-15')
    await user.type(screen.getByLabelText('Reason'), 'Screen damaged')
    await user.click(screen.getByRole('checkbox'))
    await user.click(screen.getByRole('button', { name: 'Save' }))
    expect(await screen.findByRole('alert')).toHaveProperty(
      'textContent',
      expect.stringContaining('Create failed.'),
    )
    expect(onCreateDamageFlag).toHaveBeenCalledTimes(1)
  })

  it('keeps one accessible dialog active and restores focus when the workflow exits', async () => {
    const user = userEvent.setup()
    const trigger = document.createElement('button')
    document.body.append(trigger)
    trigger.focus()
    const { onClose } = renderWorkflow({
      onLoadDamageFlags: async () => [firstFlag],
      onCreateDamageFlag: async () => createdFlag,
      equipmentOptions: [{ id: 9, name: 'Oscilloscope' }],
    })
    await user.click(screen.getByRole('button', { name: 'Manage Damage Flags' }))
    expect(screen.getAllByRole('dialog')).toHaveLength(1)
    await user.click(screen.getByRole('button', { name: 'Record Damage Flag' }))
    expect(screen.getAllByRole('dialog')).toHaveLength(1)
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(screen.getByRole('dialog', { name: 'Manage damage flags' })).toBeTruthy()
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(screen.getByRole('dialog', { name: 'Jordan Smith' })).toBeTruthy()

    fireEvent.keyDown(document, { key: 'Escape' })
    expect(onClose).toHaveBeenCalledTimes(1)
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(document.activeElement).toBe(trigger)
    trigger.remove()
  })
})
