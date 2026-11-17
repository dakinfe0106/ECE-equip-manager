
import Badge, { type BadgeTone } from '../../../components/ui/Badge'
import type { LoanStatus } from '../types'

interface LoanStatusBadgeProps {
  status: LoanStatus
}

const statusConfig: Record<
  LoanStatus,
  { label: string; tone: BadgeTone }
> = {
  on_loan: {
    label: 'Active',
    tone: 'warning',
  },
  overdue: {
    label: 'Overdue',
    tone: 'danger',
  },
  returned: {
    label: 'Completed',
    tone: 'neutral',
  },
}

export default function LoanStatusBadge({
  status,
}: LoanStatusBadgeProps) {
  const { label, tone } = statusConfig[status]

  return <Badge tone={tone}>{label}</Badge>
}
