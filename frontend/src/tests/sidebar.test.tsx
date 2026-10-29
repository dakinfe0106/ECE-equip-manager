// @vitest-environment jsdom
import { cleanup, render, screen, within } from '@testing-library/react'
import { renderToString } from 'react-dom/server'
import { MemoryRouter } from 'react-router'
import { afterEach, describe, expect, it } from 'vitest'
import AppRoutes from '../AppRoutes'
import Sidebar from '../components/layout/Sidebar'
import type { CurrentUser } from '../features/auth/api'
import { technicianAuth, withAuth } from './authTestUtils'

afterEach(cleanup)

function authFor(role: CurrentUser['role']) {
  return { ...technicianAuth, user: { ...technicianAuth.user!, role } }
}

function pageHtml(path: string, role: CurrentUser['role'] = 'ADMINISTRATOR') {
  return renderToString(
    <MemoryRouter initialEntries={[path]}>{withAuth(<AppRoutes />, authFor(role))}</MemoryRouter>,
  )
}

describe('Sidebar navigation', () => {
  it.each([
    ['ADMINISTRATOR', ['Dashboard', 'Assets', 'Lending', 'Borrowers', 'Maintenance', 'Analytics', 'Import & Export', 'Users & Access']],
    ['TECHNICIAN', ['Dashboard', 'Assets', 'Lending', 'Borrowers', 'Maintenance', 'Analytics', 'Import & Export']],
    ['FACULTY', ['Dashboard', 'Assets', 'Analytics']],
  ] as const)('shows the documented navigation for %s', (role, labels) => {
    render(<MemoryRouter>{withAuth(<Sidebar />, authFor(role))}</MemoryRouter>)
    const nav = screen.getByRole('navigation', { name: 'Main navigation' })
    expect(within(nav).getAllByRole('link').map((link) => link.getAttribute('aria-label'))).toEqual(labels)
    expect(screen.queryByRole('group', { name: 'Administration' }) !== null).toBe(role === 'ADMINISTRATOR')
    expect(screen.getByRole('link', { name: 'ECE Equipment Manager home' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Sign out' })).toBeTruthy()
  })

  it('highlights the current page and shows the first two letters of the name', () => {
    render(<MemoryRouter initialEntries={['/borrowers']}>{withAuth(<Sidebar />, {
      ...authFor('ADMINISTRATOR'), user: { ...technicianAuth.user!, role: 'ADMINISTRATOR', first_name: 'Admin', last_name: 'User' },
    })}</MemoryRouter>)
    expect(screen.getByRole('link', { name: 'Borrowers' }).getAttribute('aria-current')).toBe('page')
    expect(screen.getByRole('link', { name: 'Dashboard' }).getAttribute('aria-current')).toBeNull()
    expect(screen.getByText('AD')).toBeTruthy()
  })
})

describe('Demo page routes', () => {
  it.each([
    ['/loans', 'Lending'], ['/borrowers', 'Borrowers'], ['/maintenance', 'Maintenance'],
    ['/analytics', 'Analytics'], ['/import-export', 'Import & Export'], ['/users', 'Users & Access'],
  ])('renders an honest placeholder at %s', (path, title) => {
    const html = pageHtml(path)
    const container = document.createElement('div')
    container.innerHTML = html
    expect(within(container).getByRole('heading', { name: title, level: 1 })).toBeTruthy()
    expect(within(container).getByText('This page is still in progress.')).toBeTruthy()
    expect(within(container).getByRole('banner', { name: 'Application header' })).toBeTruthy()
  })

  it.each(['/loans', '/borrowers', '/maintenance', '/import-export', '/users'])('denies Faculty direct access to %s', (path) => {
    const html = pageHtml(path, 'FACULTY')
    expect(html).toContain('Access denied')
    expect(html).not.toContain('This page is still in progress.')
  })

  it('denies Technicians direct access to Users & Access', () => {
    expect(pageHtml('/users', 'TECHNICIAN')).toContain('Access denied')
  })

  it('allows Faculty to view the Analytics placeholder', () => {
    expect(pageHtml('/analytics', 'FACULTY')).toContain('This page is still in progress.')
  })

  it.each(['/categories', '/equipment-types'])('retires the frontend route %s', (path) => {
    expect(pageHtml(path)).toContain('Page not found')
  })

  it('requires login before showing placeholder pages', async () => {
    render(<MemoryRouter initialEntries={['/users']}>{withAuth(<AppRoutes />, {
      ...technicianAuth, user: null,
    })}</MemoryRouter>)
    expect(await screen.findByRole('heading', { name: 'Sign in to your workspace' })).toBeTruthy()
    expect(screen.queryByText('This page is still in progress.')).toBeNull()
    expect(screen.queryByRole('complementary')).toBeNull()
  })
})
