import type { DamageFlag } from '../types'

interface DamageFlagListProps {
  flags: DamageFlag[]
  selectedFlagId?: string
  onSelectFlag?: (flagId: string) => void
  onResolveFlag?: (flagId: string) => void
}

function formatDate(dateValue: string): string {
  if (!dateValue) return 'Unknown date'

  const date = new Date(dateValue)
  if (Number.isNaN(date.getTime())) return dateValue

  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(date)
}

export default function DamageFlagList({
  flags,
  selectedFlagId,
  onSelectFlag,
  onResolveFlag,
}: DamageFlagListProps) {
  const unresolvedFlags = flags.filter((flag) => flag.status === 'unresolved')
  const resolvedFlags = flags.filter((flag) => flag.status === 'resolved')

  const renderFlag = (flag: DamageFlag, isResolved = false) => {
    const isSelected = selectedFlagId === flag.id

    return (
      <div
        key={flag.id}
        className={`rounded-[8px] border p-3 ${isSelected ? 'border-[#2672e8] bg-[#f3f8ff]' : 'border-[#e8edf3] bg-white'}`}
      >
        <div className="flex items-start justify-between gap-3">
          <button
            type="button"
            onClick={() => onSelectFlag?.(flag.id)}
            className="flex-1 text-left"
            aria-pressed={isSelected}
          >
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-semibold uppercase tracking-[0.25px] text-[#5f7188]">
                {flag.equipment_name ?? 'Unknown equipment'}
              </span>
              <span className="rounded-full bg-[#eef3fb] px-2 py-0.5 text-[9px] font-semibold text-[#44638d]">
                {isResolved ? 'Resolved' : 'Open'}
              </span>
            </div>
            <p className="mt-1 text-[11px] text-[#344054]">{flag.reason}</p>
            <p className="mt-1 text-[9px] text-[#7a8699]">
              {formatDate(flag.incident_date)} • {flag.reviewed ? 'Reviewed' : 'Pending review'}
            </p>
          </button>

          {!isResolved && onResolveFlag && (
            <button
              type="button"
              onClick={() => onResolveFlag(flag.id)}
              className="rounded-[6px] border border-[#dce3ed] bg-white px-2 py-1 text-[10px] font-semibold text-[#59677a]"
            >
              Resolve
            </button>
          )}
        </div>

        {flag.notes && <p className="mt-2 text-[10px] text-[#697586]">Note: {flag.notes}</p>}
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <section>
        <h3 className="mb-2 text-[10px] font-[650] uppercase tracking-[0.25px] text-[#7d8ca2]">
          Unresolved negligent damage
        </h3>
        <div className="space-y-2">
          {unresolvedFlags.length === 0 ? (
            <p className="rounded-[8px] border border-dashed border-[#dce3ed] bg-[#f7f9fb] p-3 text-[10px] text-[#6b7787]">
              No unresolved damage flags.
            </p>
          ) : (
            unresolvedFlags.map((flag) => renderFlag(flag, false))
          )}
        </div>
      </section>

      <section>
        <h3 className="mb-2 text-[10px] font-[650] uppercase tracking-[0.25px] text-[#7d8ca2]">
          Incident history
        </h3>
        <div className="space-y-2">
          {resolvedFlags.length === 0 ? (
            <p className="rounded-[8px] border border-dashed border-[#dce3ed] bg-[#f7f9fb] p-3 text-[10px] text-[#6b7787]">
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
