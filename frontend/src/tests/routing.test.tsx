import { renderToString } from 'react-dom/server'
import { MemoryRouter } from 'react-router'
import { describe, expect, it } from 'vitest'
import AppRoutes from '../AppRoutes'
import { technicianAuth, withAuth } from './authTestUtils'

describe('Application routes', () => {
  it('renders the Asset ID lookup page at the root', () => {
    const html = renderToString(
      <MemoryRouter initialEntries={['/']}>{withAuth(<AppRoutes />)}</MemoryRouter>,
    )
    expect(html).toContain('Assets')
    expect(html).toContain('Search Asset IDs')
    expect(html).toContain('Add Asset')
    expect(html).toContain('Active Records')
    expect(html).toContain('brand-name')
    expect(html).toContain('class="nav-icon"')
    expect(html).not.toContain('brand-mark')
    expect(html).not.toContain('Shop Tech')
    expect(html).not.toContain('Inventory')
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

  it('does not render protected pages for an anonymous user', () => {
    const html = renderToString(
      <MemoryRouter initialEntries={['/assets']}>
        {withAuth(<AppRoutes />, {
          ...technicianAuth,
          user: null,
          status: 'anonymous',
        })}
      </MemoryRouter>,
    )

    expect(html).not.toContain('Search Asset IDs')
    expect(html).not.toContain('ECE Equipment')
  })

  it('shows an access-denied page when the user lacks the route permission', () => {
    const html = renderToString(
      <MemoryRouter initialEntries={['/categories']}>
        {withAuth(<AppRoutes />, {
          ...technicianAuth,
          user: { id: 2, username: 'faculty', permissions: ['inventory.view_asset'] },
        })}
      </MemoryRouter>,
    )

    expect(html).toContain('Access denied')
    expect(html).not.toContain('Search categories')
  })

  it('hides navigation and creation actions unavailable to a view-only user', () => {
    const html = renderToString(
      <MemoryRouter initialEntries={['/assets']}>
        {withAuth(<AppRoutes />, {
          ...technicianAuth,
          user: {
            id: 2,
            username: 'faculty',
            permissions: ['inventory.view_asset'],
          },
        })}
      </MemoryRouter>,
    )

    expect(html).toContain('Assets')
    expect(html).not.toContain('Add Asset')
    expect(html).not.toContain('href="/categories"')
    expect(html).not.toContain('Equipment Types')
  })
})
