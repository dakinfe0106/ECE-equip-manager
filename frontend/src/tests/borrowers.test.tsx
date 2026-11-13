import { renderToString } from 'react-dom/server'
import { MemoryRouter } from 'react-router'
import { describe, expect, it } from 'vitest'
import AppRoutes from '../AppRoutes'
import type { BorrowerRecord } from '../features/borrowers/api'
import BorrowerPagination from '../features/borrowers/components/BorrowerPagination'
import BorrowerTable from '../features/borrowers/components/BorrowerTable'
import { technicianAuth, withAuth } from './authTestUtils'

function renderAtBorrowers(auth = technicianAuth): string {
  return renderToString(
    <MemoryRouter initialEntries={['/borrowers']}>
      {withAuth(<AppRoutes />, auth)}
    </MemoryRouter>,
  )
}

describe('Borrowers route', () => {
  it('renders the borrower list loading state and role-gated navigation', () => {
    const html = renderAtBorrowers()

    expect(html).toContain('>Borrowers</h1>')
    expect(html).toContain('Search name or UNB ID...')
    expect(html).toContain('Loading borrower records')
    expect(html).toContain('UNB ID')
    expect(html).toContain('Borrower Name')
    expect(html).toContain('Standing')
    expect(html).toContain('href="/borrowers"')
    expect(html).not.toContain('Add Borrower')
    expect(html).not.toContain('Eligibility')
    expect(html).not.toContain('Page not found')
  })

  it('denies Faculty access and hides borrower navigation', () => {
    const facultyAuth = {
      ...technicianAuth,
      user: {
        ...technicianAuth.user!,
        role: 'FACULTY' as const,
        role_label: 'Faculty',
      },
    }
    const html = renderAtBorrowers(facultyAuth)

    expect(html).toContain('Access denied')
    expect(html).not.toContain('href="/borrowers"')
    expect(html).not.toContain('Loading borrower records')
  })

  it('allows Administrator access', () => {
    const adminAuth = {
      ...technicianAuth,
      user: {
        ...technicianAuth.user!,
        role: 'ADMINISTRATOR' as const,
        role_label: 'Administrator',
      },
    }

    expect(renderAtBorrowers(adminAuth)).toContain('Loading borrower records')
  })
})

describe('BorrowerTable', () => {
  const borrower: BorrowerRecord = {
    borrower_id: 1,
    unb_id: '0000101',
    first_name: 'Ada',
    last_name: 'Lovelace',
  }

  function renderTable(
    borrowers: BorrowerRecord[],
    options: { errorMessage?: string; appliedSearch?: string } = {},
  ): string {
    return renderToString(
      <BorrowerTable
        appliedSearch={options.appliedSearch ?? ''}
        borrowers={borrowers}
        errorMessage={options.errorMessage ?? ''}
        isLoading={false}
      />,
    )
  }

  it('renders borrower identity and an accessible neutral standing placeholder', () => {
    const html = renderTable([borrower])

    expect(html).toContain('0000101')
    expect(html).toContain('Ada Lovelace')
    expect(html).toContain('aria-label="Standing not available"')
    expect(html).toContain('Not available')
  })

  it('shows a distinct empty message for a search with no matches', () => {
    expect(renderTable([], { appliedSearch: 'not found' })).toContain(
      'No matching borrowers were found.',
    )
  })

  it('shows a load-failure message instead of the empty message on error', () => {
    const html = renderTable([], { errorMessage: 'Request failed.' })

    expect(html).toContain('The borrower list could not be loaded.')
    expect(html).not.toContain('No active borrowers are available.')
  })

  it('renders pagination controls for the current result page', () => {
    const html = renderToString(
      <BorrowerPagination
        currentPage={2}
        isLoading={false}
        onPageChange={() => {}}
        pageCount={3}
        pageSize={20}
        totalCount={45}
      />,
    )

    expect(html).toContain('Showing 21–40 of 45 borrowers')
    expect(html).toMatch(/Page <!-- -->2<!-- --> of <!-- -->3/)
    expect(html).toContain('aria-label="Borrower list pagination"')
  })
})
