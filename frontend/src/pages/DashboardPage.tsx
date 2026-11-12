import PageIntro from '../components/ui/PageIntro'
import { navigationItems } from '../components/layout/navigation'
import { useAuth } from '../features/auth/useAuth'
import DashboardSummaryCards from '../features/dashboard/components/DashboardSummaryCards'
import EquipmentAvailability from '../features/dashboard/components/EquipmentAvailability'
import { RecentLendingPreview, UpcomingReturnsPreview } from '../features/dashboard/components/DashboardPreviewPanels'
import useDashboard from '../features/dashboard/hooks/useDashboard'

export default function DashboardPage() {
  const { user } = useAuth()
  const { summary, isLoading, errorMessage } = useDashboard()
  const lendingRoles = navigationItems.find((item) => item.path === '/loans')?.roles
  const showLendingPreview = !!user && !!lendingRoles?.includes(user.role)

  return (
    <section className="mx-auto w-full max-w-[1500px] px-[34px] pt-[34px] pb-[50px] max-[760px]:px-4 max-[760px]:pt-6" aria-labelledby="page-title">
      <p className="mb-[7px] text-[11px] font-bold tracking-[0.11em] text-primary uppercase">Overview</p>
      <PageIntro title="Equipment operations" description="A live overview of inventory health and lending activity." />
      {errorMessage && <p className="mb-4 rounded-lg border border-danger/20 bg-danger-soft px-4 py-3 text-xs text-danger" role="alert">{errorMessage}</p>}
      {isLoading && <p className="mb-4 rounded-lg border border-primary/20 bg-primary-soft px-4 py-3 text-xs text-primary" role="status">Loading dashboard information…</p>}
      <DashboardSummaryCards summary={summary} showLendingPreview={showLendingPreview} />
      <div className={`mt-[17px] grid gap-[17px] ${showLendingPreview ? 'grid-cols-2 max-[1100px]:grid-cols-1' : 'grid-cols-1'}`}>
        <EquipmentAvailability summary={summary} isLoading={isLoading} />
        {showLendingPreview && <UpcomingReturnsPreview />}
      </div>
      {showLendingPreview && <RecentLendingPreview />}
    </section>
  )
}
