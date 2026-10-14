interface AssetPaginationProps {
  currentPage: number
  isLoading: boolean
  onPageChange: (page: number) => void
  pageCount: number
  pageSize: number
  totalCount: number
}

export default function AssetPagination({
  currentPage,
  isLoading,
  onPageChange,
  pageCount,
  pageSize,
  totalCount,
}: AssetPaginationProps) {
  return (
    <div className="flex min-h-[54px] items-center justify-between gap-[14px] border-t border-[#e8edf3] px-[18px] text-[10px] text-[#7c889a]">
      <span className="min-w-0">
        {totalCount === 0
          ? 'No assets'
          : `Showing ${(currentPage - 1) * pageSize + 1}–${Math.min(currentPage * pageSize, totalCount)} of ${totalCount} assets`}
      </span>
      <nav className="flex items-center gap-[10px]" aria-label="Asset list pagination">
        <button
          className="min-h-[29px] rounded-[5px] border border-[#dce3ed] bg-white px-[9px] text-[10px] text-[#4c596d] hover:enabled:border-[#a9c5ee] hover:enabled:bg-[#f5f8fd] disabled:cursor-not-allowed disabled:text-[#aab3c0]"
          type="button"
          disabled={isLoading || currentPage <= 1}
          onClick={() => onPageChange(currentPage - 1)}
        >
          Previous
        </button>
        <span className="min-w-[67px] text-center text-[#586579]">
          Page {currentPage} of {pageCount}
        </span>
        <button
          className="min-h-[29px] rounded-[5px] border border-[#dce3ed] bg-white px-[9px] text-[10px] text-[#4c596d] hover:enabled:border-[#a9c5ee] hover:enabled:bg-[#f5f8fd] disabled:cursor-not-allowed disabled:text-[#aab3c0]"
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
