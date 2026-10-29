import { renderToString } from 'react-dom/server'
import { MemoryRouter } from 'react-router'
import { describe, expect, it } from 'vitest'
import AppRoutes from '../AppRoutes'
import { technicianAuth, withAuth } from './authTestUtils'

describe('Application routes', () => {
  it('renders the Dashboard at the root', () => {
    const html = renderToString(
      <MemoryRouter initialEntries={['/']}>{withAuth(<AppRoutes />)}</MemoryRouter>,
    )
    expect(html).toContain('Equipment operations')
    expect(html).toContain('A live overview of inventory health and lending activity')
    expect(html).toContain('Loading dashboard information')
    expect(html).toContain('brand-name')
    expect(html).toContain('class="nav-icon"')
    expect(html).not.toContain('Page not found')
  })

  it('renders a fallback with a home link for unknown paths', () => {
    const html = renderToString(
      <MemoryRouter initialEntries={['/missing']}>{withAuth(<AppRoutes />)}</MemoryRouter>,
    )
    expect(html).toContain('Page not found')
    expect(html).toContain('href="/"')
    expect(html).not.toContain('Search by Asset ID')
    expect(html).not.toContain('Test Backend Connection')
  })

  it('renders the asset creation form at /assets/new', () => {
    const html = renderToString(
      <MemoryRouter initialEntries={['/assets/new']}>
        {withAuth(<AppRoutes />)}
      </MemoryRouter>,
    )

    expect(html).toContain('Add New Asset')
    expect(html).toContain('equipment_type_id')
    expect(html).not.toContain('Page not found')
  })

  it('denies a view-only role access to asset creation', () => {
    const facultyAuth = {
      ...technicianAuth,
      user: {
        ...technicianAuth.user!,
        role: 'FACULTY' as const,
        role_label: 'Faculty',
      },
    }
    const html = renderToString(
      <MemoryRouter initialEntries={['/assets/new']}>
        {withAuth(<AppRoutes />, facultyAuth)}
      </MemoryRouter>,
    )

    expect(html).toContain('Access denied')
    expect(html).not.toContain('Add New Asset')
  })
})
