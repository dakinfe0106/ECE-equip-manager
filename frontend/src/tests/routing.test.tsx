import { renderToString } from 'react-dom/server'
import { MemoryRouter } from 'react-router'
import { describe, expect, it } from 'vitest'
import AppRoutes from '../AppRoutes'

describe('Application routes', () => {
  it('renders the Asset ID lookup page at the root', () => {
    const html = renderToString(<MemoryRouter initialEntries={['/']}><AppRoutes /></MemoryRouter>)
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
    const html = renderToString(<MemoryRouter initialEntries={['/missing']}><AppRoutes /></MemoryRouter>)
    expect(html).toContain('Page not found')
    expect(html).toContain('href="/"')
    expect(html).not.toContain('Search by Asset ID')
  })
})
