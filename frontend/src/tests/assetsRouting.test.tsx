import { renderToString } from 'react-dom/server'
import { MemoryRouter } from 'react-router'
import { describe, expect, it } from 'vitest'
import AppRoutes from './authTestHelpers'

describe('Assets route', () => {
  it('renders the inventory table and loading state at /assets', () => {
    const html = renderToString(
      <MemoryRouter initialEntries={['/assets']}><AppRoutes /></MemoryRouter>,
    )
    expect(html).toContain('Asset Identifier')
    expect(html).toContain('Status')
    expect(html).toContain('Loading equipment records')
    expect(html).not.toContain('Page not found')
  })
})
