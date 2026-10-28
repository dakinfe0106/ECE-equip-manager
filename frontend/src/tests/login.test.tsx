// @vitest-environment jsdom
import { act, cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'
import { MemoryRouter, useLocation } from 'react-router'
import AppRoutes from '../AppRoutes'
import AuthProvider from '../features/auth/AuthProvider'
import { safeReturnPath } from '../features/auth/safeReturnPath'
import { apiBaseUrl } from '../api'
import { SESSION_CHECK_EVENT, sessionFetch } from '../features/auth/sessionFetch'

const user = { id: 1, username: 'shoptech', first_name: 'Test', last_name: 'Technician', role: 'TECHNICIAN', role_label: 'Technician' }
let signedIn = false
let csrfRequests = 0
let loginRequests = 0
let receivedPassword = ''

const server = setupServer(
  http.get(`${apiBaseUrl}/auth/me/`, () => signedIn
    ? HttpResponse.json(user)
    : HttpResponse.json({ detail: 'Not authenticated.' }, { status: 403 })),
  http.get(`${apiBaseUrl}/auth/csrf/`, () => {
    csrfRequests++
    return HttpResponse.json({ csrfToken: `token-${csrfRequests}` })
  }),
  http.post(`${apiBaseUrl}/auth/login/`, async ({ request }) => {
    loginRequests++
    expect(request.credentials).toBe('include')
    expect(request.headers.get('X-CSRFToken')).toBe(`token-${csrfRequests}`)
    const body = await request.json() as { username: string; password: string }
    receivedPassword = body.password
    if (body.username !== 'shoptech' || body.password !== ' password ') {
      return HttpResponse.json({ non_field_errors: ['Incorrect username or password.'] }, { status: 400 })
    }
    signedIn = true
    return HttpResponse.json(user)
  }),
  http.post(`${apiBaseUrl}/auth/logout/`, ({ request }) => {
    expect(request.headers.get('X-CSRFToken')).toBe(`token-${csrfRequests}`)
    expect(request.credentials).toBe('include')
    signedIn = false
    return new HttpResponse(null, { status: 204 })
  }),
  http.get(`${apiBaseUrl}/assets/`, () => HttpResponse.json({ count: 0, next: null, previous: null, results: [] })),
  http.get(`${apiBaseUrl}/categories/summary/`, () => HttpResponse.json([])),
)

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))
afterEach(() => {
  cleanup()
  server.resetHandlers()
  signedIn = false
  csrfRequests = 0
  loginRequests = 0
  receivedPassword = ''
  vi.restoreAllMocks()
})
afterAll(() => server.close())

function Location() {
  const location = useLocation()
  return <output aria-label="Current URL">{location.pathname + location.search}</output>
}

function renderApp(path = '/login', state?: { from: string }) {
  return render(
    <MemoryRouter initialEntries={[{ pathname: path, state }]}>
      <AuthProvider><AppRoutes /><Location /></AuthProvider>
    </MemoryRouter>,
  )
}

async function fillLogin(password = ' password ') {
  const keyboard = userEvent.setup()
  await keyboard.type(await screen.findByLabelText('Username'), 'shoptech')
  await keyboard.type(screen.getByLabelText('Password'), password)
  return keyboard
}

describe('Login and session flow', () => {
  it('only shows the password visibility button while the field contains text', async () => {
    renderApp()
    const password = await screen.findByLabelText('Password')
    expect(screen.queryByRole('button', { name: 'Show password' })).toBeNull()
    const keyboard = userEvent.setup()
    await keyboard.type(password, 'a')
    expect(screen.getByRole('button', { name: 'Show password' })).toBeTruthy()
    await keyboard.clear(password)
    expect(screen.queryByRole('button', { name: /Show password|Hide password/ })).toBeNull()
  })

  it('toggles password visibility by keyboard without changing or submitting the password', async () => {
    renderApp()
    const keyboard = await fillLogin(' synthetic password ')
    const password = screen.getByLabelText('Password')
    expect(password.getAttribute('type')).toBe('password')
    expect(password.getAttribute('autocomplete')).toBe('current-password')
    await keyboard.tab()
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Show password' }))
    await keyboard.keyboard('{Enter}')
    expect(password.getAttribute('type')).toBe('text')
    expect((password as HTMLInputElement).value).toBe(' synthetic password ')
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Hide password' }))
    await keyboard.keyboard(' ')
    expect(password.getAttribute('type')).toBe('password')
    expect((password as HTMLInputElement).value).toBe(' synthetic password ')
    expect(screen.getByRole('button', { name: 'Show password' })).toBeTruthy()
    expect(loginRequests).toBe(0)
  })

  it.each([
    ['TECHNICIAN', 'Technician'], ['FACULTY', 'Faculty'], ['ADMINISTRATOR', 'Administrator'],
  ])('shows the backend %s role with the current name and initials', async (role, role_label) => {
    signedIn = true
    server.use(http.get(`${apiBaseUrl}/auth/me/`, () => HttpResponse.json({ ...user, role, role_label })))
    renderApp('/assets')
    expect(await screen.findByText('Test Technician')).toBeTruthy()
    expect(screen.getByText(role_label)).toBeTruthy()
    expect(screen.getByText('TT')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Sign out' })).toBeTruthy()
  })

  it('falls back to the username when the user has no name', async () => {
    signedIn = true
    server.use(http.get(`${apiBaseUrl}/auth/me/`, () => HttpResponse.json({ ...user, first_name: '', last_name: '' })))
    renderApp('/assets')
    expect(await screen.findByText('shoptech')).toBeTruthy()
    expect(screen.getByText('S')).toBeTruthy()
  })

  it('renders the standalone design with required fields and autofill', async () => {
    renderApp()
    expect(await screen.findByRole('heading', { name: 'Sign in to your workspace' })).toBeTruthy()
    expect(screen.queryByRole('navigation')).toBeNull()
    expect(screen.getByLabelText('Username').getAttribute('autocomplete')).toBe('username')
    expect(screen.getByLabelText('Password').getAttribute('autocomplete')).toBe('current-password')
    expect(screen.getByLabelText('Password').getAttribute('type')).toBe('password')
    await userEvent.click(screen.getByRole('button', { name: 'Sign in' }))
    expect(loginRequests).toBe(0)
  })

  it('logs in by keyboard, preserves password whitespace, refreshes CSRF and returns to the requested page', async () => {
    renderApp('/categories')
    const keyboard = await fillLogin()
    await keyboard.keyboard('{Enter}')
    expect(await screen.findByRole('heading', { name: 'Categories' })).toBeTruthy()
    expect(screen.getByLabelText('Current URL').textContent).toBe('/categories')
    expect(receivedPassword).toBe(' password ')
    expect(csrfRequests).toBe(2)
    expect(loginRequests).toBe(1)
    expect(screen.getByText('Test Technician')).toBeTruthy()
  })

  it('defaults to the dashboard after login and restores an existing session', async () => {
    renderApp()
    const keyboard = await fillLogin()
    await keyboard.click(screen.getByRole('button', { name: 'Sign in' }))

    expect(
      await screen.findByRole('heading', { name: 'Equipment operations' }),
    ).toBeTruthy()
    expect(screen.getByLabelText('Current URL').textContent).toBe('/')

    cleanup()

    renderApp('/')
    expect(
      await screen.findByRole('heading', { name: 'Equipment operations' }),
    ).toBeTruthy()
    expect(loginRequests).toBe(1)
  })

  it('redirects signed-in visitors away from login', async () => {
    signedIn = true
    renderApp()

    expect(
      await screen.findByRole('heading', { name: 'Equipment operations' }),
    ).toBeTruthy()
    expect(loginRequests).toBe(0)
  })

  it('shows invalid credentials and allows another attempt', async () => {
    renderApp()
    const keyboard = await fillLogin('wrong')
    await keyboard.click(screen.getByRole('button', { name: 'Sign in' }))
    expect((await screen.findByRole('alert')).textContent).toBe('Incorrect username or password.')
    await keyboard.clear(screen.getByLabelText('Password'))
    await keyboard.type(screen.getByLabelText('Password'), ' password ')
    await keyboard.click(screen.getByRole('button', { name: 'Sign in' }))
    expect(
      await screen.findByRole('heading', { name: 'Equipment operations' }),
    ).toBeTruthy()
  })

  it('shows a pending state and prevents duplicate submissions', async () => {
    let finish!: () => void
    const pending = new Promise<void>((resolve) => { finish = resolve })
    server.use(http.post(`${apiBaseUrl}/auth/login/`, async () => {
      loginRequests++
      await pending
      return HttpResponse.json({}, { status: 400 })
    }))
    renderApp()
    const keyboard = await fillLogin()
    await keyboard.click(screen.getByRole('button', { name: 'Sign in' }))
    const button = await screen.findByRole('button', { name: 'Signing in…' })
    expect((button as HTMLButtonElement).disabled).toBe(true)
    await keyboard.click(button)
    expect(loginRequests).toBe(1)
    await act(async () => finish())
    expect(await screen.findByRole('alert')).toBeTruthy()
  })

  it.each([403, 503])('reports a login HTTP %s failure', async (status) => {
    server.use(http.post(`${apiBaseUrl}/auth/login/`, () => new HttpResponse(null, { status })))
    renderApp()
    const keyboard = await fillLogin()
    await keyboard.click(screen.getByRole('button', { name: 'Sign in' }))
    const alert = await screen.findByRole('alert')
    expect(alert.textContent).toContain(status === 403 ? 'security token' : 'Could not sign in')
    expect(screen.getByLabelText('Current URL').textContent).toBe('/login')
  })

  it('reports connection failures on login', async () => {
    server.use(http.post(`${apiBaseUrl}/auth/login/`, () => HttpResponse.error()))
    renderApp()
    const keyboard = await fillLogin()
    await keyboard.click(screen.getByRole('button', { name: 'Sign in' }))
    expect((await screen.findByRole('alert')).textContent).toContain('Could not reach the server')
  })

  it('provides retry when the initial session check fails', async () => {
    server.use(http.get(`${apiBaseUrl}/auth/me/`, () => new HttpResponse(null, { status: 503 })))
    renderApp('/assets')
    expect((await screen.findByRole('alert')).textContent).toContain('Could not check your session')
    expect(screen.queryByLabelText('Username')).toBeNull()
    server.resetHandlers()
    await userEvent.click(screen.getByRole('button', { name: 'Try again' }))
    expect(await screen.findByLabelText('Username')).toBeTruthy()
  })

  it('ends the session and redirects on logout', async () => {
    signedIn = true
    renderApp('/assets')
    await userEvent.click(await screen.findByRole('button', { name: 'Sign out' }))
    expect(await screen.findByLabelText('Username')).toBeTruthy()
    expect(signedIn).toBe(false)
    expect(screen.queryByRole('navigation')).toBeNull()
  })

  it('keeps the session visible when logout fails and allows retry', async () => {
    signedIn = true
    server.use(http.post(`${apiBaseUrl}/auth/logout/`, () => new HttpResponse(null, { status: 503 })))
    renderApp('/assets')
    await userEvent.click(await screen.findByRole('button', { name: 'Sign out' }))
    expect((await screen.findByRole('alert')).textContent).toContain('Could not sign out')
    expect(screen.getByRole('navigation', { name: 'Main navigation' })).toBeTruthy()
    server.resetHandlers()
    await userEvent.click(screen.getByRole('button', { name: 'Sign out' }))
    expect(await screen.findByLabelText('Username')).toBeTruthy()
  })

  it('rechecks a 403 without replaying a failed write or logging out an authorized session', async () => {
    signedIn = true
    let writes = 0
    server.use(http.patch(`${apiBaseUrl}/assets/1/`, () => {
      writes++
      return new HttpResponse(null, { status: 403 })
    }))
    renderApp('/assets')
    await screen.findByRole('navigation', { name: 'Main navigation' })
    await act(async () => {
      await sessionFetch(`${apiBaseUrl}/assets/1/`, { method: 'PATCH', credentials: 'include' })
    })
    await waitFor(() => expect(screen.getByRole('navigation', { name: 'Main navigation' })).toBeTruthy())
    expect(writes).toBe(1)
    expect(screen.queryByLabelText('Username')).toBeNull()
  })

  it('returns to login when a failed request reveals an expired session', async () => {
    signedIn = true
    renderApp('/assets')
    await screen.findByRole('navigation', { name: 'Main navigation' })
    signedIn = false
    await act(async () => window.dispatchEvent(new Event(SESSION_CHECK_EVENT)))
    expect(await screen.findByLabelText('Username')).toBeTruthy()
  })
})

describe('Return destination validation', () => {
  it.each(['https://example.com', '//example.com', '/\\example.com', '/login', '/login/', '/a/../login', '/\n/example.com'])('rejects %s', (path) => {
    expect(safeReturnPath(path)).toBe('/')
  })
  it('preserves internal paths, query strings and fragments', () => {
    expect(safeReturnPath('/assets?page=2#row')).toBe('/assets?page=2#row')
  })
})
