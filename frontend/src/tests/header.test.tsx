// @vitest-environment jsdom
import { cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderToString } from 'react-dom/server'
import { Link, MemoryRouter } from 'react-router'
import { afterEach, describe, expect, it } from 'vitest'
import AppRoutes from '../AppRoutes'
import Header from '../components/layout/Header'
import type { CurrentUser } from '../features/auth/api'
import { technicianAuth, withAuth } from './authTestUtils'

afterEach(cleanup)

function renderHeader(user: CurrentUser = technicianAuth.user!) {
  return render(
    <MemoryRouter>
      {withAuth(<><Header /><Link to="/assets">Open assets</Link></>, { ...technicianAuth, user })}
    </MemoryRouter>,
  )
}

describe('Shared page header', () => {
  it.each([
    ['/', 'Dashboard'],
    ['/assets', 'Assets'],
    ['/assets/new', 'Add Asset'],
    ['/loans', 'Lending'],
    ['/borrowers', 'Borrowers'],
    ['/maintenance', 'Maintenance'],
    ['/analytics', 'Analytics'],
    ['/import-export', 'Import & Export'],
    ['/users', 'Users & Access'],
  ])('appears in the application layout at %s with the current page name', (path, title) => {
    const html = renderToString(
      <MemoryRouter initialEntries={[path]}>{withAuth(<AppRoutes />, { ...technicianAuth, user: { ...technicianAuth.user!, role: 'ADMINISTRATOR', role_label: 'Administrator' } })}</MemoryRouter>,
    )
    const container = document.createElement('div')
    container.innerHTML = html
    const header = within(container).getByRole('banner', { name: 'Application header' })
    const breadcrumb = within(header).getByRole('navigation', { name: 'Breadcrumb' })
    expect(within(breadcrumb).getByText(title).getAttribute('aria-current')).toBe('page')
  })

  it.each([
    ['ADMINISTRATOR', 'Administrator'],
    ['TECHNICIAN', 'Technician'],
    ['FACULTY', 'Faculty'],
  ] as const)("uses the signed-in user's %s role from the backend", (role, role_label) => {
    renderHeader({ ...technicianAuth.user!, role, role_label })
    const header = screen.getByRole('banner', { name: 'Application header' })
    expect(within(header).getByText(role_label)).toBeTruthy()
    const avatar = within(header).getByRole('img', { name: 'Signed in as Shop Technician' })
    expect(avatar.textContent).toBe('SH')
  })

  it('uses the first two letters of the display name rather than initials', () => {
    renderHeader({ ...technicianAuth.user!, first_name: 'Admin', last_name: 'User' })
    expect(screen.getByRole('img', { name: 'Signed in as Admin User' }).textContent).toBe('AD')
  })

  it('uses the username for the avatar when the user has no name', () => {
    renderHeader({ ...technicianAuth.user!, username: 'testuser', first_name: '', last_name: '' })
    expect(screen.getByRole('img', { name: 'Signed in as testuser' }).textContent).toBe('TE')
  })

  it('updates the breadcrumb when navigating to another page', async () => {
    renderHeader()
    const keyboard = userEvent.setup()
    expect(within(screen.getByRole('navigation', { name: 'Breadcrumb' })).getByText('Dashboard')).toBeTruthy()
    await keyboard.click(screen.getByRole('link', { name: 'Open assets' }))
    expect(within(screen.getByRole('navigation', { name: 'Breadcrumb' })).getByText('Assets')).toBeTruthy()
  })

  it('clearly marks notifications as unavailable', () => {
    renderHeader()
    const bell = screen.getByRole('button', { name: 'Notifications (coming soon)' }) as HTMLButtonElement
    expect(bell.disabled).toBe(true)
    expect(bell.title).toBe('Notifications coming soon')
  })
})
