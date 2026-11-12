interface AssetPaginationProps {
  currentPage: number
  isLoading: boolean
  onPageChange: (page: number) => void
  pageCount: number
  pageSize: number
  totalCount: number
}

const pageButtonClassName =
  'min-h-[29px] rounded-lg border border-input bg-white px-[9px] text-[10px] text-body hover:enabled:border-primary hover:enabled:text-primary focus-visible:outline-2 focus-visible:outline-offset-[3px] focus-visible:outline-primary disabled:cursor-not-allowed disabled:text-subtle'

export default function AssetPagination({
  currentPage,
  isLoading,
  onPageChange,
  pageCount,
  pageSize,
  totalCount,
}: AssetPaginationProps) {
  return (
    <div className="flex min-h-[54px] items-center justify-between gap-[14px] border-t border-divider px-[17px] text-[10px] text-muted max-[520px]:flex-wrap max-[520px]:py-[10px]">
      <span className="min-w-0">
        {totalCount === 0
          ? 'No assets'
          : `Showing ${(currentPage - 1) * pageSize + 1}–${Math.min(currentPage * pageSize, totalCount)} of ${totalCount} assets`}
      </span>
      <nav className="flex items-center gap-[10px]" aria-label="Asset list pagination">
        <button
          className={pageButtonClassName}
          type="button"
          disabled={isLoading || currentPage <= 1}
          onClick={() => onPageChange(currentPage - 1)}
        >
          Previous
        </button>
        <span className="min-w-[67px] text-center text-body">
          Page {currentPage} of {pageCount}
        </span>
        <button
          className={pageButtonClassName}
          type="button"
          disabled={isLoading || currentPage >= pageCount}
          onClick={() => onPageChange(currentPage + 1)}
        >
          Next
        </button>
      </nav>
    </div>
  )
}
