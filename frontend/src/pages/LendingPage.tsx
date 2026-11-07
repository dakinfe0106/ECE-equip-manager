import PageIntro from '../components/ui/PageIntro'
import Panel from '../components/ui/Panel'
import useLoans from '../features/lending/hooks/useLoans'

export default function LendingPage() {
  const { loans, isLoading, errorMessage } = useLoans()

  return (
    <section
      className="mx-auto w-full max-w-[1500px] px-[34px] pb-[50px] pt-[34px]"
      aria-labelledby="page-title"
    >
      <PageIntro
        title="Lending"
        description="Manage checkouts, returns, and complete lending history."
      />

      <Panel>
        {isLoading && (
          <div className="py-8 text-center text-[12px] text-muted">
            Loading lending records...
          </div>
        )}

        {errorMessage && (
          <div
            role="alert"
            className="m-4 rounded-[8px] border border-danger/20 bg-danger-soft px-4 py-3 text-[12px] text-danger"
          >
            <strong className="block">Unable to load lending records</strong>
            <span>{errorMessage}</span>
          </div>
        )}

        {!isLoading && !errorMessage && loans.length === 0 && (
          <div className="py-8 text-center text-[12px] text-muted">
            No lending records found.
          </div>
        )}

        {!isLoading && !errorMessage && loans.length > 0 && (
          <div className="py-8 text-center text-[12px] text-muted">
            {loans.length} lending record{loans.length === 1 ? '' : 's'} loaded.
          </div>
        )}
      </Panel>
    </section>
  )
}