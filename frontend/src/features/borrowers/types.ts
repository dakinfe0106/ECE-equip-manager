export type BorrowerStanding = 'Good' | 'Overdue' | 'Damage flag'

export interface BorrowerIdentity {
  borrower_id: number
  borrower_name: string
  standing?: BorrowerStanding
  is_eligible?: boolean
}

export type DamageFlagStatus = 'unresolved' | 'resolved'

export interface DamageFlag {
  id: string
  borrower_id: number
  borrower_name: string
  equipment_id?: number | null
  equipment_name?: string
  incident_date: string
  reason: string
  notes?: string
  status: DamageFlagStatus
  created_at: string
  resolved_at?: string | null
  resolved_by?: string | null
  reviewed?: boolean

}

export interface DamageFlagCreateInput {
  borrower_id: number
  borrower_name: string
  equipment_id: number
  equipment_name?: string
  incident_date: string
  reason: string
  notes?: string
  reviewed: boolean
}

export interface DamageFlagApiResponse {
  data: DamageFlag[]
  count: number
  unresolved_count: number
}
