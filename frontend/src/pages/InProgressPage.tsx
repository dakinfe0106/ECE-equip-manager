import PageIntro from '../components/ui/PageIntro'

export default function InProgressPage({ title }: { title: string }) {
  return (
    <section aria-labelledby="page-title" className="mx-auto w-full max-w-[1500px] px-[34px] pt-[34px] pb-[50px] max-[760px]:px-4 max-[760px]:pt-6">
      <PageIntro title={title} description="This page is still in progress." />
    </section>
  )
}
