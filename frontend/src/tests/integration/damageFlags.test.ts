import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'
import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'
import { apiBaseUrl } from '../../api'
import {
  createDamageFlag,
  DamageFlagRequestError,
  fetchDamageFlags,
  resolveDamageFlag,
  updateDamageFlag,
} from '../../features/borrowers/damageFlagsApi'
import type {
  DamageFlagCreateInput,
  DamageFlagUpdateInput,
} from '../../features/borrowers/types'

const summary = {
  unresolved_count: 1,
  warning_level: 'first_warning' as const,
  damage_eligible: true,
}

const apiFlag = {
  damage_flag_id: 17,
  borrower_id: 42,
  borrower_name: 'Jordan Smith',
  equipment_id: 7,
  equipment_name: 'Cordless drill',
  incident_date: '2026-10-19',
  reason: 'Housing cracked',
  notes: '',
  status: 'unresolved' as const,
  created_at: '2026-10-19T10:00:00Z',
  reviewed: true,
  reviewed_by: 'shop-tech',
  reviewed_at: '2026-10-19T10:00:00Z',
  resolved_by: null,
  resolved_at: null,
  resolution_reason: '',
}

const server = setupServer(
  http.get(`${apiBaseUrl}/borrowers/:borrowerId/damage-flags/`, () => HttpResponse.json({
    count: 1,
    results: [apiFlag],
    summary,
  })),
  http.post(`${apiBaseUrl}/borrowers/:borrowerId/damage-flags/`, () => HttpResponse.json({
    damage_flag: apiFlag,
    summary,
  }, { status: 201 })),
  http.patch(`${apiBaseUrl}/borrowers/:borrowerId/damage-flags/:flagId/`, () => HttpResponse.json({
    damage_flag: apiFlag,
    summary,
  })),
  http.post(`${apiBaseUrl}/borrowers/:borrowerId/damage-flags/:flagId/`, () => HttpResponse.json({
    damage_flag: { ...apiFlag, status: 'resolved', resolution_reason: 'Closed after review.' },
    summary: { unresolved_count: 0, warning_level: 'no_warning', damage_eligible: true },
  })),
)

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))
afterEach(() => server.resetHandlers())
afterAll(() => server.close())

describe('Damage flags API client', () => {
  it('loads borrower-scoped history and maps numeric IDs for the workflow', async () => {
    const result = await fetchDamageFlags(42)

    expect(result.results[0].id).toBe('17')
    expect(result.results[0].borrower_id).toBe(42)
    expect(result.summary).toEqual(summary)
    expect(result.count).toBe(1)
  })

  it('creates a reviewed incident without sending client-controlled identity', async () => {
    let requestBody: unknown
    server.use(http.post(
      `${apiBaseUrl}/borrowers/:borrowerId/damage-flags/`,
      async ({ request }) => {
        requestBody = await request.json()
        return HttpResponse.json({ damage_flag: apiFlag, summary }, { status: 201 })
      },
    ))
    const payload: DamageFlagCreateInput = {
      borrower_id: 42,
      borrower_name: 'Jordan Smith',
      equipment_id: 7,
      incident_date: '2026-10-19',
      reason: 'Housing cracked',
      reviewed: true,
    }

    const result = await createDamageFlag(payload)

    expect(result.damage_flag.id).toBe('17')
    expect(requestBody).toEqual({
      equipment_id: 7,
      incident_date: '2026-10-19',
      reason: 'Housing cracked',
      notes: '',
      reviewed: true,
    })
  })

  it('edits an incident in place and resolves it with the supplied reason', async () => {
    const update: DamageFlagUpdateInput = {
      equipment_id: 8,
      incident_date: '2026-10-20',
      reason: 'Corrected description',
      notes: 'Updated note',
    }
    let patchUrl = ''
    let patchMethod = ''
    server.use(http.patch(
      `${apiBaseUrl}/borrowers/:borrowerId/damage-flags/:flagId/`,
      async ({ request }) => {
        patchUrl = request.url
        patchMethod = request.method
        return HttpResponse.json({ damage_flag: apiFlag, summary })
      },
    ))

    const updated = await updateDamageFlag(42, '17', update)
    expect(updated.damage_flag.id).toBe('17')
    expect(patchUrl).toBe(`${apiBaseUrl}/borrowers/42/damage-flags/17/`)
    expect(patchMethod).toBe('PATCH')

    let resolutionBody: unknown
    server.use(http.post(
      `${apiBaseUrl}/borrowers/:borrowerId/damage-flags/:flagId/`,
      async ({ request }) => {
        resolutionBody = await request.json()
        return HttpResponse.json({
          damage_flag: {
            ...apiFlag,
            status: 'resolved',
            resolution_reason: 'Closed after review.',
          },
          summary: { unresolved_count: 0, warning_level: 'no_warning', damage_eligible: true },
        })
      },
    ))
    const resolved = await resolveDamageFlag(42, '17', 'Closed after review.')

    expect(resolutionBody).toEqual({ resolution_reason: 'Closed after review.' })
    expect(resolved.damage_flag.status).toBe('resolved')
    expect(resolved.summary.unresolved_count).toBe(0)
  })

  it('surfaces API authorization and validation failures', async () => {
    server.use(http.get(
      `${apiBaseUrl}/borrowers/:borrowerId/damage-flags/`,
      () => new HttpResponse(null, { status: 403 }),
    ))
    await expect(fetchDamageFlags(42)).rejects.toBeInstanceOf(DamageFlagRequestError)

    server.use(http.post(
      `${apiBaseUrl}/borrowers/:borrowerId/damage-flags/:flagId/`,
      () => HttpResponse.json({ resolution_reason: ['A reason is required.'] }, { status: 400 }),
    ))
    await expect(resolveDamageFlag(42, '17', '')).rejects.toMatchObject({
      status: 400,
      message: 'A reason is required.',
    })
  })
})
