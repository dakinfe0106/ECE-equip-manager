
/**
 * The status values returned by the Loans API.
 */
export type LoanStatus = 'on_loan' | 'overdue' | 'returned'

/**
 * Friendly loan-state options displayed in the filter dropdown.
 */
export type LoanStateFilter = 'all' | LoanStatus

/**
 * Asset-status options displayed in the Lending filter.
 *
 * Note: "overdue" is derived from the associated loan.
 * It is not a stored Asset.status value in the database.
 */
export type LoanAssetStatusFilter =
  | 'all'
  | 'available'
  | 'on_loan'
  | 'overdue'

/**
 * A loan record returned by the backend.
 */
export interface LoanRecord {
  loan_id: number
  asset_id: number
  asset_identifier: string
  equipment_name: string
  borrower_id: number
  borrower_unb_id: string
  borrower_name: string
  checkout_date: string
  expected_return_date: string
  actual_return_date: string | null
  return_condition: 'Intact' | 'Damaged' | null
  status: LoanStatus
}

/**
 * Filters selected by the user.
 * Empty strings mean no date boundary has been selected.
 */
export interface LoanFilters {
  loanState: LoanStateFilter
  expectedReturnDateFrom: string
  expectedReturnDateTo: string
  assetStatus: LoanAssetStatusFilter
}

/**
 * Default values used when the filter popover is first opened
 * or when the user clicks Reset.
 */
export const defaultLoanFilters: LoanFilters = {
  loanState: 'all',
  expectedReturnDateFrom: '',
  expectedReturnDateTo: '',
  assetStatus: 'all',
}
