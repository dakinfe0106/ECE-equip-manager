import { renderToString } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'

import LoanFilters from '../features/lending/components/LoanFilters'
import {
  defaultLoanFilters,
  type LoanFilters as LoanFiltersType,
} from '../features/lending/types'

describe('LoanFilters', () => {
  const mockFilters: LoanFiltersType = {
    ...defaultLoanFilters,
  }

  it('renders all loan state options', () => {
    const html = renderToString(
      <LoanFilters
        filters={mockFilters}
        onApply={vi.fn()}
        onClose={vi.fn()}
      />,
    )

    expect(html).toContain('All loan states')
    expect(html).toContain('Active')
    expect(html).toContain('Overdue')
    expect(html).toContain('Completed')
  })

  it('renders all asset status options', () => {
    const html = renderToString(
      <LoanFilters
        filters={mockFilters}
        onApply={vi.fn()}
        onClose={vi.fn()}
      />,
    )

    expect(html).toContain('All statuses')
    expect(html).toContain('Available')
    expect(html).toContain('On Loan')

    const selects =
      html.match(/<select[^>]*>[\s\S]*?<\/select>/g) ?? []

    expect(selects).toHaveLength(2)
    expect(selects[1]).not.toContain('value="overdue"')
  })

  it('renders previously selected filter values', () => {
    const selectedFilters: LoanFiltersType = {
      loanState: 'overdue',
      expectedReturnDateFrom: '2026-11-01',
      expectedReturnDateTo: '2026-11-30',
      assetStatus: 'on_loan',
    }

    const html = renderToString(
      <LoanFilters
        filters={selectedFilters}
        onApply={vi.fn()}
        onClose={vi.fn()}
      />,
    )

    expect(html).toContain('value="overdue"')
    expect(html).toContain('value="2026-11-01"')
    expect(html).toContain('value="2026-11-30"')
    expect(html).toContain('value="on_loan"')
  })

  it('renders the expected return date range inputs', () => {
    const html = renderToString(
      <LoanFilters
        filters={mockFilters}
        onApply={vi.fn()}
        onClose={vi.fn()}
      />,
    )

    expect((html.match(/type="date"/g) ?? [])).toHaveLength(2)
    expect(html).toContain('From')
    expect(html).toContain('To')
  })
})