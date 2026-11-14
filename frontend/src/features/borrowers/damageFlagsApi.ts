import { apiBaseUrl } from '../../api'
import { sessionFetch } from '../auth/sessionFetch'
import type {
  DamageFlag,
  DamageFlagCollection,
  DamageFlagCreateInput,
  DamageFlagMutationResult,
  DamageFlagUpdateInput,
} from './types'

interface ApiDamageFlag extends Omit<DamageFlag, 'id'> {
  damage_flag_id: number
}

interface ApiDamageFlagCollection {
  count: number
  results: ApiDamageFlag[]
  summary: DamageFlagCollection['summary']
}

interface ApiDamageFlagMutationResult {
  damage_flag: ApiDamageFlag
  summary: DamageFlagMutationResult['summary']
}

export class DamageFlagRequestError extends Error {
  readonly status: number

  constructor(status: number, message: string) {
    super(message)
    this.name = 'DamageFlagRequestError'
    this.status = status
  }
}

async function responseError(response: Response, action: string): Promise<DamageFlagRequestError> {
  let message = `${action} failed (${response.status}).`
  try {
    const body: unknown = await response.json()
    if (typeof body === 'object' && body !== null) {
      const firstMessage = Object.values(body).flatMap((value) =>
        Array.isArray(value) ? value : [value],
      ).find((value) => typeof value === 'string')
      if (typeof firstMessage === 'string') message = firstMessage
    }
  } catch {
    // Keep the HTTP status message when the response has no JSON error body.
  }
  return new DamageFlagRequestError(response.status, message)
}

function csrfHeaders(): Headers {
  const headers = new Headers({ 'Content-Type': 'application/json' })
  if (typeof document === 'undefined') return headers

  const token = document.cookie
    .split('; ')
    .find((cookie) => cookie.startsWith('csrftoken='))
    ?.slice('csrftoken='.length)
  if (token) headers.set('X-CSRFToken', decodeURIComponent(token))
  return headers
}

function toDamageFlag(flag: ApiDamageFlag): DamageFlag {
  const { damage_flag_id, ...fields } = flag
  return { ...fields, id: String(damage_flag_id) }
}

function toMutationResult(result: ApiDamageFlagMutationResult): DamageFlagMutationResult {
  return {
    damage_flag: toDamageFlag(result.damage_flag),
    summary: result.summary,
  }
}

export async function fetchDamageFlags(borrowerId: number): Promise<DamageFlagCollection> {
  const response = await sessionFetch(
    `${apiBaseUrl}/borrowers/${borrowerId}/damage-flags/`,
    { credentials: 'include' },
  )
  if (!response.ok) throw await responseError(response, 'Damage flag lookup')

  const result = await response.json() as ApiDamageFlagCollection
  return {
    ...result,
    results: result.results.map(toDamageFlag),
  }
}

export async function createDamageFlag(
  payload: DamageFlagCreateInput,
): Promise<DamageFlagMutationResult> {
  const response = await sessionFetch(
    `${apiBaseUrl}/borrowers/${payload.borrower_id}/damage-flags/`,
    {
      method: 'POST',
      credentials: 'include',
      headers: csrfHeaders(),
      body: JSON.stringify({
        equipment_id: payload.equipment_id,
        incident_date: payload.incident_date,
        reason: payload.reason,
        notes: payload.notes ?? '',
        reviewed: payload.reviewed,
      }),
    },
  )
  if (!response.ok) throw await responseError(response, 'Damage flag creation')
  return toMutationResult(await response.json() as ApiDamageFlagMutationResult)
}

export async function updateDamageFlag(
  borrowerId: number,
  flagId: string,
  payload: DamageFlagUpdateInput,
): Promise<DamageFlagMutationResult> {
  const response = await sessionFetch(
    `${apiBaseUrl}/borrowers/${borrowerId}/damage-flags/${encodeURIComponent(flagId)}/`,
    {
      method: 'PATCH',
      credentials: 'include',
      headers: csrfHeaders(),
      body: JSON.stringify({
        equipment_id: payload.equipment_id,
        incident_date: payload.incident_date,
        reason: payload.reason,
        notes: payload.notes ?? '',
      }),
    },
  )
  if (!response.ok) throw await responseError(response, 'Damage flag update')
  return toMutationResult(await response.json() as ApiDamageFlagMutationResult)
}

export async function resolveDamageFlag(
  borrowerId: number,
  flagId: string,
  resolutionReason: string,
): Promise<DamageFlagMutationResult> {
  const response = await sessionFetch(
    `${apiBaseUrl}/borrowers/${borrowerId}/damage-flags/${encodeURIComponent(flagId)}/`,
    {
      method: 'POST',
      credentials: 'include',
      headers: csrfHeaders(),
      body: JSON.stringify({ resolution_reason: resolutionReason }),
    },
  )
  if (!response.ok) throw await responseError(response, 'Damage flag resolution')
  return toMutationResult(await response.json() as ApiDamageFlagMutationResult)
}
