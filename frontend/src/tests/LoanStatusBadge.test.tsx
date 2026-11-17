// @vitest-environment jsdom

import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import LoanStatusBadge from '../features/lending/components/LoanStatusBadge'

describe('LoanStatusBadge', () => {
  it('displays Active for an on_loan status', () => {
    render(<LoanStatusBadge status="on_loan" />)

    const badge = screen.getByText('Active')

    expect(badge).toBeTruthy()
    expect(badge.className).toContain('text-warning')
  })

  it('displays Overdue for an overdue status', () => {
    render(<LoanStatusBadge status="overdue" />)

    const badge = screen.getByText('Overdue')

    expect(badge).toBeTruthy()
    expect(badge.className).toContain('text-danger')
  })

  it('displays Completed for a returned status', () => {
    render(<LoanStatusBadge status="returned" />)

    const badge = screen.getByText('Completed')

    expect(badge).toBeTruthy()
    expect(badge.className).toContain('text-neutral')
  })
})
