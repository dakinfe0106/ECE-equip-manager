import { renderToString } from 'react-dom/server'
import { MemoryRouter } from 'react-router'
import { describe, expect, it } from 'vitest'
import AppRoutes from './authTestHelpers'

describe('Application routes', () => {
  it('renders the Dashboard at the root', () => {
    const html = renderToString(
      <MemoryRouter initialEntries={['/']}>
        <AppRoutes />
      </MemoryRouter>,
    )

    expect(html).toContain('Equipment operations')
    expect(html).toContain(
      'A live overview of inventory health and lending activity',
    )
    expect(html).toContain('Loading dashboard information')
    expect(html).toContain('brand-name')
    expect(html).toContain('class="nav-icon"')
    expect(html).not.toContain('Page not found')
  })

  it('renders a fallback with a home link for unknown paths', () => {
    const html = renderToString(
      <MemoryRouter initialEntries={['/missing']}>
        <AppRoutes />
      </MemoryRouter>,
    )

    expect(html).toContain('Page not found')
    expect(html).toContain('href="/"')
    expect(html).not.toContain('Search by Asset ID')
    expect(html).not.toContain('Test Backend Connection')
  })

  it('renders the asset creation form at /assets/new', () => {
    const html = renderToString(
      <MemoryRouter initialEntries={['/assets/new']}>
        <AppRoutes />
      </MemoryRouter>,
    )

    expect(html).toContain('Add New Asset')
    expect(html).toContain('equipment_type_id')
    expect(html).not.toContain('Page not found')
  })
})