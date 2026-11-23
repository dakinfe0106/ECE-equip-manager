import PageIntro from '../components/ui/PageIntro'
import { navigationItems } from '../components/layout/navigation'
import { useAuth } from '../features/auth/useAuth'
import { hasPermission } from '../features/auth/api'
import DashboardSummaryCards from '../features/dashboard/components/DashboardSummaryCards'
import EquipmentAvailability from '../features/dashboard/components/EquipmentAvailability'
import { RecentLendingPreview, UpcomingReturnsPreview } from '../features/dashboard/components/DashboardPreviewPanels'
import useDashboard from '../features/dashboard/hooks/useDashboard'
import useLoans from '../features/lending/hooks/useLoans'
import { defaultLoanFilters, type LoanFilters } from '../features/lending/types'

const overdueFilters: LoanFilters = { ...defaultLoanFilters, loanState: 'overdue' }

export default function DashboardPage() {
  const { user } = useAuth()
  const { summary, isLoading, errorMessage, retry } = useDashboard()
  const lendingRoles = navigationItems.find((item) => item.path === '/loans')?.roles
  const showLendingPreview = !!user && !!lendingRoles?.includes(user.role)
  const canViewMaintenance = !!user && hasPermission(user, 'maintenance.view_maintenancerecord')
  const lending = useLoans(defaultLoanFilters, '', 0, showLendingPreview)
  const overdue = useLoans(overdueFilters, '', 0, showLendingPreview)
  const overdueCount = overdue.isLoading ? 'Loading…' : overdue.errorMessage ? 'Unavailable' : overdue.loans.length

  return (
    <section className="mx-auto w-full max-w-[1500px] px-[34px] pt-[34px] pb-[50px] max-[760px]:px-4 max-[760px]:pt-6" aria-labelledby="page-title">
      <p className="mb-[7px] text-[11px] font-bold tracking-[0.11em] text-primary uppercase">Overview</p>
      <PageIntro title="Equipment operations" description="A live overview of inventory health and lending activity." />
      {errorMessage && (
        <div className="mb-4 flex flex-wrap items-center gap-3 rounded-lg border border-danger/20 bg-danger-soft px-4 py-3 text-xs text-danger">
          <p role="alert">{errorMessage}</p>
          <button type="button" onClick={retry} className="rounded-md border border-current px-3 py-1 font-semibold">Retry</button>
        </div>
      )}
      {isLoading && <p className="mb-4 rounded-lg border border-primary/20 bg-primary-soft px-4 py-3 text-xs text-primary" role="status">Loading dashboard information…</p>}
      <DashboardSummaryCards summary={summary} canViewMaintenance={canViewMaintenance} overdueCount={showLendingPreview ? overdueCount : undefined} />
      <div className={`mt-[17px] grid gap-[17px] ${showLendingPreview ? 'grid-cols-2 max-[1100px]:grid-cols-1' : 'grid-cols-1'}`}>
        <EquipmentAvailability summary={summary} isLoading={isLoading} />
        {showLendingPreview && <UpcomingReturnsPreview {...lending} />}
      </div>
      {showLendingPreview && <RecentLendingPreview {...lending} />}
    </section>
  )
}
