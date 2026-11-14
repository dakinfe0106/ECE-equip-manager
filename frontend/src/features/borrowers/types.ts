export type BorrowerStanding = 'Good' | 'Overdue' | 'Damage flag'
export type DamageWarningLevel = 'no_warning' | 'first_warning' | 'final_warning' | 'ineligible'

export interface BorrowerIdentity {
  borrower_id: number
  borrower_name: string
  standing?: BorrowerStanding
  unresolved_damage_flag_count?: number
  damage_warning_level?: DamageWarningLevel
  damage_eligible?: boolean
}

export interface BorrowerLoanSummary {
  loan_id: number
  equipment_name: string
  asset_identifier?: string
  checkout_date?: string
  expected_return_date?: string
}

export interface BorrowerOverdueEquipment {
  equipment_name: string
  asset_identifier?: string
  expected_return_date?: string
}

export interface BorrowerDetailsViewModel {
  borrower_id: number
  borrower_name: string
  unb_id: string
  standing?: BorrowerStanding
  certifications?: string[]
  active_loans?: BorrowerLoanSummary[]
  overdue_equipment?: BorrowerOverdueEquipment[]
  negligent_damage_flag?: boolean
  unresolved_damage_flag_count?: number
  damage_warning_level?: DamageWarningLevel
  damage_eligible?: boolean
}

export type BorrowerDetailsLoadState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'loaded' }

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
  reviewed_by?: string
  reviewed_at?: string
  updated_at?: string
  resolution_reason?: string
}

export interface DamageFlagSummary {
  unresolved_count: number
  warning_level: DamageWarningLevel
  damage_eligible: boolean
}

export interface DamageFlagCollection {
  count: number
  results: DamageFlag[]
  summary: DamageFlagSummary
}

export interface DamageFlagMutationResult {
  damage_flag: DamageFlag
  summary: DamageFlagSummary
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

export interface DamageFlagUpdateInput {
  equipment_id: number
  equipment_name?: string
  incident_date: string
  reason: string
  notes?: string
}

export interface DamageFlagEquipmentOption {
  id: number
  name: string
}

export type DamageFlagLoadState =
  | { status: 'loading' }
  | { status: 'unavailable' }
  | { status: 'error'; message: string }
  | { status: 'loaded'; flags: DamageFlag[]; summary: DamageFlagSummary }
