import type { ReactNode } from 'react'

export type BadgeTone = 'success' | 'warning' | 'danger' | 'neutral'

const toneClassNames: Record<BadgeTone, string> = {
  success: 'badge-success bg-success-soft text-success',
  warning: 'badge-warning bg-warning-soft text-warning',
  danger: 'badge-danger bg-danger-soft text-danger',
  neutral: 'badge-neutral bg-neutral-soft text-neutral',
}

interface BadgeProps {
  children: ReactNode
  tone: BadgeTone
}

export default function Badge({ children, tone }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center gap-[5px] rounded-full px-[7px] py-1 text-[9px] font-[650] ${toneClassNames[tone]}`}
    >
      <span className="h-[5px] w-[5px] rounded-full bg-current" aria-hidden="true" />
      {children}
    </span>
  )
}
