import DashboardSummaryCards from '../features/dashboard/components/DashboardSummaryCards'
import useDashboard from '../features/dashboard/hooks/useDashboard'

export default function DashboardPage() {
  const { summary, isLoading, errorMessage } = useDashboard()

  return (
    <section
      className="mx-auto flex h-full min-h-0 w-full max-w-[1440px] flex-col px-[34px] pb-[42px] pt-[31px] max-[980px]:px-6 max-[700px]:px-[14px] max-[700px]:pb-[30px] max-[700px]:pt-6"
      aria-labelledby="page-title"
    >
      <div className="mb-6">
        <h1
          className="m-0 text-[25px] font-[690] leading-[1.25] tracking-[-0.55px] text-[#1f2b3e]"
          id="page-title"
        >
          Equipment operations
        </h1>

        <p className="mb-0 mt-2 text-[12px] text-[#758196]">
          A live overview of inventory health and lending activity
        </p>
      </div>

      {errorMessage && (
        <p
          className="mb-4 rounded-[6px] border border-[#f3d0d2] bg-[#fff5f5] px-4 py-3 text-[12px] text-[#a5333b]"
          role="alert"
        >
          {errorMessage}
        </p>
      )}

      {isLoading && (
        <p
          className="mb-4 rounded-[6px] border border-[#d5e4fb] bg-[#f3f8ff] px-4 py-3 text-[12px] text-[#315f9f]"
          role="status"
        >
          Loading dashboard information…
        </p>
      )}

      {summary && <DashboardSummaryCards summary={summary} />}
    </section>
  )
}