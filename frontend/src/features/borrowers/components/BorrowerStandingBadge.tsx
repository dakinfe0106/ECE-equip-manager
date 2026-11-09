import type { BorrowerStanding } from '../types'

interface BorrowerStandingBadgeProps {
  standing?: BorrowerStanding
  isEligible?: boolean
}

const standingClasses: Record<Exclude<BorrowerStanding, undefined>, string> = {
  normal: 'bg-[#eaf7ee] text-[#177548]',
  warning: 'bg-[#fff0d6] text-[#ad6b00]',
  restricted: 'bg-[#fde2e2] text-[#b42318]',
}

const labels: Record<Exclude<BorrowerStanding, undefined>, string> = {
  normal: 'Normal',
  warning: 'Warning',
  restricted: 'Restricted',
}

export default function BorrowerStandingBadge({
  standing = 'normal',
  isEligible,
}: BorrowerStandingBadgeProps) {
  const label = labels[standing]
  const eligibilityText = isEligible === undefined
    ? 'Eligibility unavailable'
    : isEligible
      ? 'Eligible to borrow'
      : 'Not eligible to borrow'

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span
        className={`inline-flex items-center rounded-full px-2.5 py-1 text-[10px] font-semibold ${standingClasses[standing]}`}
      >
        {label}
      </span>
      <span className="text-[10px] text-[#59677a]">{eligibilityText}</span>
    </div>
  )
}
