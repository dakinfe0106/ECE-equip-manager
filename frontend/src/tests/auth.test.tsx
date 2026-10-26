import { afterEach, describe, expect, it, vi } from 'vitest'
import { renderToString } from 'react-dom/server'
import { MemoryRouter } from 'react-router'
import AppRoutes from '../AppRoutes'
import { signIn } from '../features/auth/api'
import { withAuth } from './authTestUtils'

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

describe('Authentication UI and API', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('renders a labelled sign-in form', () => {
    const html = renderToString(
      <MemoryRouter initialEntries={['/login']}>
        {withAuth(<AppRoutes />, {
          user: null,
          status: 'anonymous',
          error: '',
          signIn: async () => {},
          signOut: async () => {},
          retry: () => {},
        })}
      </MemoryRouter>,
    )

    expect(html).toContain('Sign in')
    expect(html).toContain('for="username"')
    expect(html).toContain('for="password"')
    expect(html).toContain('Use your authorized EMS account')
  })

  it('fetches CSRF tokens and sends credentials on sign-in', async () => {
    const mockFetch = vi.fn()
      .mockResolvedValueOnce(jsonResponse({ csrfToken: 'csrf-before-login' }))
      .mockResolvedValueOnce(jsonResponse({
        id: 1,
        username: 'shop-tech',
        permissions: ['inventory.view_asset'],
      }))
      .mockResolvedValueOnce(jsonResponse({ csrfToken: 'csrf-after-login' }))
    vi.stubGlobal('fetch', mockFetch)

    const user = await signIn('shop-tech', 'test-password')

    expect(user.username).toBe('shop-tech')
    expect(mockFetch).toHaveBeenCalledTimes(3)
    expect(mockFetch.mock.calls[1][1]?.credentials).toBe('include')
    expect(
      new Headers(mockFetch.mock.calls[1][1]?.headers).get('X-CSRFToken'),
    ).toBe('csrf-before-login')
    expect(mockFetch.mock.calls[1][1]?.body).toBe(
      JSON.stringify({ username: 'shop-tech', password: 'test-password' }),
    )
  })
})
