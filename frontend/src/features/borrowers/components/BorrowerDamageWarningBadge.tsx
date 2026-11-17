import type { DamageWarningLevel } from '../types'

interface BorrowerDamageWarningBadgeProps {
  warningLevel?: DamageWarningLevel
}

const warningLabels: Record<DamageWarningLevel, string> = {
  no_warning: 'No warning',
  first_warning: 'First warning',
  final_warning: 'Final warning',
  ineligible: 'Ineligible for damage policy',
}

const warningClasses: Record<DamageWarningLevel, string> = {
  no_warning: 'bg-success-soft text-success',
  first_warning: 'bg-warning-soft text-warning',
  final_warning: 'bg-danger-soft text-danger',
  ineligible: 'bg-danger-soft text-danger',
}

export default function BorrowerDamageWarningBadge({
  warningLevel,
}: BorrowerDamageWarningBadgeProps) {
  if (!warningLevel) {
    return (
      <span className="inline-flex items-center rounded-full bg-neutral-soft px-2.5 py-1 text-[10px] font-semibold text-neutral">
        Damage warning unavailable
      </span>
    )
  }

  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-[10px] font-semibold ${warningClasses[warningLevel]}`}
    >
      {warningLabels[warningLevel]}
    </span>
  )
}
