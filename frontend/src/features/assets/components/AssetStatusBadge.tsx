import Badge, { type BadgeTone } from '../../../components/ui/Badge'
import { assetStatusLabels, type AssetStatus } from '../api'

const statusTones: Record<AssetStatus, BadgeTone> = {
  Available: 'success',
  On_Loan: 'warning',
  Under_Maintenance: 'danger',
  Retired: 'neutral',
}

export default function AssetStatusBadge({ status }: { status: AssetStatus }) {
  return <Badge tone={statusTones[status]}>{assetStatusLabels[status]}</Badge>
}
