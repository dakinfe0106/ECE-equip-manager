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
    <div className="table-footer">
      <span>
        {totalCount === 0
          ? 'No assets'
          : `Showing ${(currentPage - 1) * pageSize + 1}–${Math.min(currentPage * pageSize, totalCount)} of ${totalCount} assets`}
      </span>
      <div className="pagination-controls" aria-label="Asset list pagination">
        <button
          className="page-button"
          type="button"
          disabled={isLoading || currentPage <= 1}
          onClick={() => onPageChange(currentPage - 1)}
        >
          Previous
        </button>
        <span className="page-indicator">Page {currentPage} of {pageCount}</span>
        <button
          className="page-button"
          type="button"
          disabled={isLoading || currentPage >= pageCount}
          onClick={() => onPageChange(currentPage + 1)}
        >
          Next
        </button>
      </div>
    </div>
  )
}
