import { renderToString } from 'react-dom/server'
import { MemoryRouter } from 'react-router'
import { describe, expect, it } from 'vitest'
import AppRoutes from '../AppRoutes'
import { withAuth } from './authTestUtils'

describe('Loans routing', () => {
  it('renders the Lending page at /loans', () => {
    const html = renderToString(
      <MemoryRouter initialEntries={['/loans']}>
        {withAuth(<AppRoutes />)}
      </MemoryRouter>,
    )

    expect(html).toContain('Lending')
    expect(html).toContain(
      'Manage checkouts, returns, and complete lending history.',
    )
    expect(html).not.toContain('Page not found')
  })
})