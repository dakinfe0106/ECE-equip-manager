import type { BorrowerStanding } from '../types'

interface BorrowerStandingBadgeProps {
  standing?: BorrowerStanding
}

const standingClasses: Record<BorrowerStanding, string> = {
  Good: 'bg-success-soft text-success',
  Overdue: 'bg-danger-soft text-danger',
  'Damage flag': 'bg-danger-soft text-danger',
}

const labels: Record<BorrowerStanding, string> = {
  Good: 'Good',
  Overdue: 'Overdue',
  'Damage flag': 'Damage flag',
}

export default function BorrowerStandingBadge({ standing }: BorrowerStandingBadgeProps) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {standing ? (
        <span
          className={`inline-flex items-center rounded-full px-2.5 py-1 text-[10px] font-semibold ${standingClasses[standing]}`}
        >
          {labels[standing]}
        </span>
      ) : (
        <span className="inline-flex items-center rounded-full bg-neutral-soft px-2.5 py-1 text-[10px] font-semibold text-neutral">
          Standing unavailable
        </span>
      )}
    </div>
  )
}
