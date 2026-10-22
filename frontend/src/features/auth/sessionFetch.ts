export const SESSION_CHECK_EVENT = 'ems:check-session'

// A 403 can mean either an expired session or insufficient permission.
// Ask the provider to recheck /me/; never replay the original request.
export async function sessionFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const response = await fetch(input, init)
  if (response.status === 403 && typeof window !== 'undefined') {
    window.dispatchEvent(new Event(SESSION_CHECK_EVENT))
  }
  return response
}
