import PageIntro from '../components/ui/PageIntro'
import Panel from '../components/ui/Panel'

export default function LendingPage() {
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
        <div className="py-8 text-center text-[12px] text-muted">
          Loan records will appear here.
        </div>
      </Panel>
    </section>
  )
}