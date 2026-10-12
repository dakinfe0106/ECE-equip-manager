import { renderToString } from 'react-dom/server'
import { MemoryRouter } from 'react-router'
import { describe, expect, it } from 'vitest'
import AppRoutes from '../AppRoutes'

describe('Application routes', () => {
  it('renders the existing health-check page at the root', () => {
    const html = renderToString(<MemoryRouter initialEntries={['/']}><AppRoutes /></MemoryRouter>)
    expect(html).toContain('Test Backend Connection')
    expect(html).not.toContain('Page not found')
  })

  it('renders a fallback with a home link for unknown paths', () => {
    const html = renderToString(<MemoryRouter initialEntries={['/missing']}><AppRoutes /></MemoryRouter>)
    expect(html).toContain('Page not found')
    expect(html).toContain('href="/"')
    expect(html).not.toContain('Test Backend Connection')
  })
})
