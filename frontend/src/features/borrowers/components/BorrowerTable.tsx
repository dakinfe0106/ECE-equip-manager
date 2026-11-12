import Badge from '../../../components/ui/Badge'
import type { BorrowerRecord } from '../api'

const headerClassName =
  'sticky top-0 z-[1] border-b border-line bg-page px-[17px] py-[11px] text-left text-[9px] font-bold uppercase tracking-[0.04em] text-muted'
const cellClassName = 'border-b border-divider px-[17px] py-[13px] text-[11px] text-muted'

interface BorrowerTableProps {
  appliedSearch: string
  borrowers: BorrowerRecord[]
  errorMessage: string
  isLoading: boolean
  onSelect: (borrower: BorrowerRecord) => void
}

export default function BorrowerTable({
  appliedSearch,
  borrowers,
  errorMessage,
  isLoading,
  onSelect,
}: BorrowerTableProps) {
  return (
    <div className="min-h-0 flex-1 overflow-auto">
      <table className="w-full border-collapse text-left whitespace-nowrap">
        <thead>
          <tr>
            <th className={headerClassName} scope="col">UNB ID</th>
            <th className={headerClassName} scope="col">Borrower Name</th>
            <th className={headerClassName} scope="col">Standing</th>
          </tr>
        </thead>
        <tbody>
          {borrowers.map((borrower) => (
            <tr key={borrower.borrower_id} className="hover:bg-page">
              <td className={`${cellClassName} font-mono font-[650] text-body`}>
                {borrower.unb_id}
              </td>
              <td className={`${cellClassName} font-[650] text-body`}>
                <button
                  type="button"
                  className="cursor-pointer rounded-sm text-left font-semibold text-body hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                  aria-label={`Edit borrower ${[borrower.first_name, borrower.last_name].filter(Boolean).join(' ')} (UNB ID ${borrower.unb_id})`}
                  onClick={() => onSelect(borrower)}
                >
                  {[borrower.first_name, borrower.last_name].filter(Boolean).join(' ')}
                </button>
              </td>
              <td className={cellClassName}>
                <Badge tone="neutral">
                  <span aria-label="Standing not available">Not available</span>
                </Badge>
              </td>
            </tr>
          ))}
          {!isLoading && borrowers.length === 0 && (
            <tr>
              <td
                className="h-[116px] px-[17px] text-center text-[11px] text-subtle whitespace-normal"
                colSpan={3}
              >
                {errorMessage
                  ? 'The borrower list could not be loaded.'
                  : appliedSearch
                    ? 'No matching borrowers were found.'
                    : 'No active borrowers are available.'}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  )
}
