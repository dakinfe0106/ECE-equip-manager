import DashboardSummaryCards from '../features/dashboard/components/DashboardSummaryCards'
import useDashboard from '../features/dashboard/hooks/useDashboard'

export default function DashboardPage() {
  const { summary, isLoading, errorMessage } = useDashboard()

  return (
    <section
      className="mx-auto flex h-full min-h-0 w-full max-w-[1500px] flex-col px-[34px] pb-[50px] pt-[34px]"
      aria-labelledby="page-title"
    >
      <div className="mb-[27px]">
        <p className="mb-[7px] mt-0 text-[11px] font-[750] uppercase tracking-[0.11em] text-[#2f6fed]">
          Overview
        </p>

        <h1
          id="page-title"
          className="m-0 text-[27px] leading-[1.2] tracking-[-0.035em] text-[#101828]"
        >
          Equipment operations
        </h1>

        <p className="mb-0 mt-[7px] text-[13px] text-[#7a8595]">
          A live overview of inventory health and lending activity.
        </p>
      </div>

      {errorMessage && (
        <p
          className="mb-4 rounded-[8px] border border-[#f3d0d2] bg-[#fff5f5] px-4 py-3 text-[12px] text-[#a5333b]"
          role="alert"
        >
          {errorMessage}
        </p>
      )}

      {isLoading && (
        <p
          className="mb-4 rounded-[8px] border border-[#d5e4fb] bg-[#f3f8ff] px-4 py-3 text-[12px] text-[#315f9f]"
          role="status"
        >
          Loading dashboard information…
        </p>
      )}

      {summary && <DashboardSummaryCards summary={summary} />}
    </section>
  )
}