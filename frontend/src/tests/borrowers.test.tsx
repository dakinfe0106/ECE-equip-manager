// @vitest-environment jsdom

import { act, cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderToString } from 'react-dom/server'
import { MemoryRouter } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import AppRoutes from '../AppRoutes'
import {
  BorrowerRequestError,
  type BorrowerDetailsRecord,
  type BorrowerRecord,
} from '../features/borrowers/api'
import BorrowerPagination from '../features/borrowers/components/BorrowerPagination'
import BorrowerTable from '../features/borrowers/components/BorrowerTable'
import BorrowersPage from '../pages/BorrowersPage'
import { technicianAuth, withAuth } from './authTestUtils'

const {
  useBorrowersMock,
  fetchBorrowerDetailsMock,
  fetchAllAssetsMock,
  fetchDamageFlagsMock,
} = vi.hoisted(() => ({
  useBorrowersMock: vi.fn(),
  fetchBorrowerDetailsMock: vi.fn(),
  fetchAllAssetsMock: vi.fn(),
  fetchDamageFlagsMock: vi.fn(),
}))

vi.mock('../features/borrowers/hooks/useBorrowers', () => ({
  default: useBorrowersMock,
}))

vi.mock('../features/borrowers/api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../features/borrowers/api')>()
  return {
    ...actual,
    fetchBorrowerDetails: fetchBorrowerDetailsMock,
  }
})

vi.mock('../features/assets/api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../features/assets/api')>()
  return {
    ...actual,
    fetchAllAssets: fetchAllAssetsMock,
  }
})

vi.mock('../features/borrowers/damageFlagsApi', () => ({
  fetchDamageFlags: fetchDamageFlagsMock,
  createDamageFlag: vi.fn(),
  resolveDamageFlag: vi.fn(),
  updateDamageFlag: vi.fn(),
}))

const defaultBorrowerList = {
  borrowers: [],
  errorMessage: '',
  isLoading: true,
  pageCount: 1,
  pageSize: 20,
  totalCount: 0,
}

beforeEach(() => {
  useBorrowersMock.mockReturnValue(defaultBorrowerList)
  fetchBorrowerDetailsMock.mockImplementation(async (borrowerId: number) => ({
    borrower_id: borrowerId,
    unb_id: borrowerId === 22 ? '0000022' : '0000023',
    first_name: borrowerId === 22 ? 'Ada' : 'Riley',
    last_name: borrowerId === 22 ? 'Lovelace' : '',
    negligent_damage_flag: false,
    unresolved_damage_flag_count: 0,
    damage_warning_level: 'no_warning',
    damage_eligible: true,
  }))
  fetchAllAssetsMock.mockResolvedValue([])
  fetchDamageFlagsMock.mockResolvedValue({
    count: 0,
    results: [],
    summary: {
      unresolved_count: 0,
      warning_level: 'no_warning',
      damage_eligible: true,
    },
  })
})

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

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
        onViewDetails={() => {}}
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

  it('passes the selected borrower record from an accessible row action', async () => {
    const user = userEvent.setup()
    const onViewDetails = vi.fn()
    const secondBorrower = { ...borrower, borrower_id: 22, unb_id: '0000022' }
    render(
      <BorrowerTable
        appliedSearch=""
        borrowers={[borrower, secondBorrower]}
        errorMessage=""
        isLoading={false}
        onViewDetails={onViewDetails}
      />,
    )

    await user.click(screen.getByRole('button', {
      name: 'View details for Ada Lovelace, UNB ID 0000022',
    }))

    expect(onViewDetails).toHaveBeenCalledOnce()
    expect(onViewDetails).toHaveBeenCalledWith(secondBorrower)
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

describe('BorrowersPage details integration', () => {
  const duplicateNameBorrowers: BorrowerRecord[] = [
    {
      borrower_id: 1,
      unb_id: '0000101',
      first_name: 'Ada',
      last_name: 'Lovelace',
    },
    {
      borrower_id: 22,
      unb_id: '0000022',
      first_name: 'Ada',
      last_name: 'Lovelace',
    },
    { borrower_id: 23, unb_id: '0000023', first_name: 'Riley', last_name: '' },
  ]

  it('opens the selected borrower details with unique identity and API-backed damage status', async () => {
    const user = userEvent.setup()
    useBorrowersMock.mockReturnValue({
      ...defaultBorrowerList,
      borrowers: duplicateNameBorrowers,
      isLoading: false,
      totalCount: duplicateNameBorrowers.length,
    })
    render(<BorrowersPage />)

    const detailActions = screen.getAllByRole('button', {
      name: 'View details for Ada Lovelace, UNB ID 0000101',
    })
    expect(detailActions).toHaveLength(1)
    await user.click(screen.getByRole('button', {
      name: 'View details for Ada Lovelace, UNB ID 0000022',
    }))

    expect(await screen.findByRole('dialog', { name: 'Ada Lovelace' })).toBeTruthy()
    expect(fetchBorrowerDetailsMock).toHaveBeenCalledWith(22, expect.any(AbortSignal))
    expect(screen.getByText('Borrower details · UNB ID 0000022')).toBeTruthy()
    expect(screen.getAllByText('Standing unavailable')).toHaveLength(2)
    expect(await screen.findByText('No flag recorded')).toBeTruthy()
    expect(screen.getByText(/unresolved incidents/)).toBeTruthy()
    expect(screen.getByText('No warning')).toBeTruthy()
    expect(screen.getByText('Damage-based checkout status: Eligible')).toBeTruthy()
    expect(screen.queryByText(/Overall eligibility/i)).toBeNull()
    expect(screen.getByText('Certification information unavailable.')).toBeTruthy()
    expect(screen.getByText('Active loan information unavailable.')).toBeTruthy()
    expect(screen.getByText('Overdue equipment information unavailable.')).toBeTruthy()
    expect(screen.getByText('This stored indicator is separate from incident history and does not affect warning calculations.')).toBeTruthy()

    const borrowingRecordsButton = screen.getByRole('button', { name: 'View Borrowing Records' })
    expect(borrowingRecordsButton.hasAttribute('disabled')).toBe(true)
    expect(screen.getByText(
      'Borrowing records are unavailable until the Lending page is implemented.',
    )).toBeTruthy()

    await user.click(screen.getByRole('button', { name: 'Manage Damage Flags' }))
    expect(await screen.findByText('No unresolved damage flags.')).toBeTruthy()
    expect(fetchDamageFlagsMock).toHaveBeenCalledWith(22)
    expect(screen.getByRole('button', { name: 'Record Damage Flag' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Resolve Existing Flag' }).hasAttribute('disabled')).toBe(true)
  })

  it('supports a borrower with no last name and closes the details workflow', async () => {
    const user = userEvent.setup()
    useBorrowersMock.mockReturnValue({
      ...defaultBorrowerList,
      borrowers: duplicateNameBorrowers,
      isLoading: false,
      totalCount: duplicateNameBorrowers.length,
    })
    render(<BorrowersPage />)

    await user.click(screen.getByRole('button', {
      name: 'View details for Riley, UNB ID 0000023',
    }))
    expect(await screen.findByRole('dialog', { name: 'Riley' })).toBeTruthy()
    expect(screen.getByText('Borrower details · UNB ID 0000023')).toBeTruthy()

    await user.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('shows a retryable detail error and does not apply a late response after close', async () => {
    const user = userEvent.setup()
    fetchBorrowerDetailsMock
      .mockRejectedValueOnce(new BorrowerRequestError(404))
      .mockResolvedValueOnce({
        borrower_id: 22,
        unb_id: '0000022',
        first_name: 'Ada',
        last_name: 'Lovelace',
        negligent_damage_flag: true,
      })
    useBorrowersMock.mockReturnValue({
      ...defaultBorrowerList,
      borrowers: duplicateNameBorrowers,
      isLoading: false,
      totalCount: duplicateNameBorrowers.length,
    })
    render(<BorrowersPage />)

    await user.click(screen.getByRole('button', {
      name: 'View details for Ada Lovelace, UNB ID 0000022',
    }))
    expect((await screen.findByRole('alert')).textContent).toContain(
      'Unable to load borrower details. This borrower is no longer available.',
    )
    await user.click(screen.getByRole('button', { name: 'Retry' }))
    expect(await screen.findByText('Flag recorded')).toBeTruthy()

    await user.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('ignores stale details when a different borrower is selected', async () => {
    const user = userEvent.setup()
    let resolveFirstRequest: ((record: BorrowerDetailsRecord) => void) | undefined
    let firstRequestSignal: AbortSignal | undefined
    fetchBorrowerDetailsMock.mockImplementation((borrowerId: number, signal: AbortSignal) => {
      if (borrowerId === 22) {
        firstRequestSignal = signal
        return new Promise((resolve) => {
          resolveFirstRequest = resolve
        })
      }
      return Promise.resolve({
        borrower_id: borrowerId,
        unb_id: '0000023',
        first_name: 'Riley',
        last_name: '',
        negligent_damage_flag: false,
        unresolved_damage_flag_count: 0,
        damage_warning_level: 'no_warning',
        damage_eligible: true,
      })
    })
    useBorrowersMock.mockReturnValue({
      ...defaultBorrowerList,
      borrowers: duplicateNameBorrowers,
      isLoading: false,
      totalCount: duplicateNameBorrowers.length,
    })
    render(<BorrowersPage />)

    await user.click(screen.getByRole('button', {
      name: 'View details for Ada Lovelace, UNB ID 0000022',
    }))
    expect(screen.getByRole('status').textContent).toBe('Loading borrower details…')
    await user.click(screen.getByRole('button', {
      name: 'View details for Riley, UNB ID 0000023',
    }))

    expect(await screen.findByRole('dialog', { name: 'Riley' })).toBeTruthy()
    expect(firstRequestSignal?.aborted).toBe(true)
    await act(async () => {
      resolveFirstRequest?.({
        borrower_id: 22,
        unb_id: '0000022',
        first_name: 'Ada',
        last_name: 'Lovelace',
        negligent_damage_flag: true,
        unresolved_damage_flag_count: 2,
        damage_warning_level: 'final_warning',
        damage_eligible: true,
      })
    })
    expect(screen.getByText('No flag recorded')).toBeTruthy()
    expect(screen.queryByText('Flag recorded')).toBeNull()
    expect(screen.getByText('Borrower details · UNB ID 0000023')).toBeTruthy()
  })
})
