import { apiBaseUrl } from '../../api'
import { sessionFetch } from '../auth/sessionFetch'
import type { DamageFlag, DamageFlagApiResponse, DamageFlagCreateInput } from './types'

/**
 * Provisional API contract for the damage-flag feature.
 * This is intentionally not treated as the final production contract until the
 * Borrower and checkout work lands. It will be replaced once the upstream API is
 * defined by the owning feature teams.
 */
const DAMAGE_FLAG_ENDPOINT = `${apiBaseUrl}/borrowers/damage-flags/`

async function parseErrorMessage(response: Response, action: string): Promise<string> {
  try {
    const body: unknown = await response.json()
    if (typeof body === 'object' && body !== null) {
      const messages = Object.values(body).flatMap((value) => {
        if (Array.isArray(value)) return value.filter((entry): entry is string => typeof entry === 'string')
        return typeof value === 'string' ? [value] : []
      })
      const [firstMessage] = messages
      if (firstMessage) return firstMessage
    }
  } catch {
    // Ignore JSON parsing failures; use the default HTTP message below.
  }

  return `${action} failed (${response.status}).`
}

export async function fetchDamageFlags(): Promise<DamageFlag[]> {
  const response = await sessionFetch(DAMAGE_FLAG_ENDPOINT, { credentials: 'include' })
  if (!response.ok) {
    throw new Error(await parseErrorMessage(response, 'Damage flag lookup'))
  }

  const body = (await response.json()) as DamageFlagApiResponse | DamageFlag[]
  if (Array.isArray(body)) return body
  return body.data ?? []
}

export async function createDamageFlag(payload: DamageFlagCreateInput): Promise<DamageFlag> {
  const csrfToken = document.cookie
    .split('; ')
    .find((cookie) => cookie.startsWith('csrftoken='))
    ?.slice('csrftoken='.length)

  const response = await sessionFetch(DAMAGE_FLAG_ENDPOINT, {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(csrfToken ? { 'X-CSRFToken': decodeURIComponent(csrfToken) } : {}),
    },
    body: JSON.stringify(payload),
  })

  if (!response.ok) {
    throw new Error(await parseErrorMessage(response, 'Damage flag creation'))
  }

  return response.json() as Promise<DamageFlag>
}

export async function resolveDamageFlag(flagId: string): Promise<DamageFlag> {
  const csrfToken = document.cookie
    .split('; ')
    .find((cookie) => cookie.startsWith('csrftoken='))
    ?.slice('csrftoken='.length)

  const response = await sessionFetch(`${DAMAGE_FLAG_ENDPOINT}${flagId}/resolve/`, {
    method: 'PATCH',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(csrfToken ? { 'X-CSRFToken': decodeURIComponent(csrfToken) } : {}),
    },
  })

  if (!response.ok) {
    throw new Error(await parseErrorMessage(response, 'Damage flag resolution'))
  }

  return response.json() as Promise<DamageFlag>
}
