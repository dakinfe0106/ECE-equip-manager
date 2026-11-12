import type { DamageFlag } from '../types'

interface DamageFlagListProps {
  flags: DamageFlag[]
  selectedFlagId?: string
  onSelectFlag?: (flagId: string) => void
}

function formatDate(dateValue: string): string {
  if (!dateValue) return 'Unknown date'

  const date = new Date(`${dateValue}T00:00:00Z`)
  if (Number.isNaN(date.getTime())) return dateValue

  return new Intl.DateTimeFormat('en-US', {
    timeZone: 'UTC',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(date)
}

export default function DamageFlagList({
  flags,
  selectedFlagId,
  onSelectFlag,
}: DamageFlagListProps) {
  const unresolvedFlags = flags.filter((flag) => flag.status === 'unresolved')
  const resolvedFlags = flags.filter((flag) => flag.status === 'resolved')

  const renderFlag = (flag: DamageFlag, isResolved = false) => {
    const isSelected = selectedFlagId === flag.id

    return (
      <div
        key={flag.id}
        className={`rounded-[8px] border p-3 ${isSelected ? 'border-primary bg-primary-soft' : 'border-line bg-white'}`}
      >
        <div className="flex items-start gap-3">
          <button
            type="button"
            onClick={() => {
              onSelectFlag?.(flag.id)
            }}
            className="flex-1 text-left"
            aria-pressed={isSelected}
            aria-label={`Select ${isResolved ? 'resolved' : 'unresolved'} incident: ${flag.equipment_name ?? 'Unknown equipment'}, ${flag.reason}`}
          >
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-semibold uppercase tracking-[0.25px] text-muted">
                {flag.equipment_name ?? 'Unknown equipment'}
              </span>
              <span className="rounded-full bg-neutral-soft px-2 py-0.5 text-[9px] font-semibold text-neutral">
                {isResolved ? 'Resolved' : 'Open'}
              </span>
            </div>
            <p className="mt-1 text-[11px] text-body">{flag.reason}</p>
            <p className="mt-1 text-[9px] text-muted">
              {formatDate(flag.incident_date)} • {flag.reviewed ? 'Reviewed' : 'Pending review'}
            </p>
          </button>
        </div>

        {flag.notes && <p className="mt-2 text-[10px] text-muted">Note: {flag.notes}</p>}
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <section>
        <h3 className="mb-2 text-[10px] font-[650] uppercase tracking-[0.25px] text-muted">
          Unresolved negligent damage
        </h3>
        <div className="space-y-2">
          {unresolvedFlags.length === 0 ? (
            <p className="rounded-[8px] border border-dashed border-line bg-page p-3 text-[10px] text-muted">
              No unresolved damage flags.
            </p>
          ) : (
            unresolvedFlags.map((flag) => renderFlag(flag, false))
          )}
        </div>
      </section>

      <section>
        <h3 className="mb-2 text-[10px] font-[650] uppercase tracking-[0.25px] text-muted">
          Incident history
        </h3>
        <div className="space-y-2">
          {resolvedFlags.length === 0 ? (
            <p className="rounded-[8px] border border-dashed border-line bg-page p-3 text-[10px] text-muted">
              No resolved flags yet.
            </p>
          ) : (
            resolvedFlags.map((flag) => renderFlag(flag, true))
          )}
        </div>
      </section>
    </div>
  )
}
