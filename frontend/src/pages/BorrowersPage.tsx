import { useState, type FormEvent } from 'react'
import PageIntro from '../components/ui/PageIntro'
import Panel from '../components/ui/Panel'
import BorrowerPagination from '../features/borrowers/components/BorrowerPagination'
import BorrowerSearchToolbar from '../features/borrowers/components/BorrowerSearchToolbar'
import BorrowerTable from '../features/borrowers/components/BorrowerTable'
import useBorrowers from '../features/borrowers/hooks/useBorrowers'

export default function BorrowersPage() {
  const [search, setSearch] = useState('')
  const [appliedSearch, setAppliedSearch] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const {
    borrowers,
    errorMessage,
    isLoading,
    pageCount,
    pageSize,
    totalCount,
  } = useBorrowers(currentPage, appliedSearch)

  const searchBorrowers = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setCurrentPage(1)
    setAppliedSearch(search.trim())
  }

  const clearSearch = () => {
    setSearch('')
    setCurrentPage(1)
    setAppliedSearch('')
  }

  return (
    <section
      className="mx-auto flex h-full min-h-0 w-full max-w-[1500px] flex-col px-[34px] pt-[34px] pb-[50px] max-[760px]:px-4 max-[760px]:pt-6 max-[760px]:pb-10"
      aria-labelledby="page-title"
    >
      <PageIntro
        title="Borrowers"
        description="Find borrowers and review their records."
      />

      <Panel className="flex min-h-0 flex-1 flex-col overflow-hidden" label="Borrower search results">
        <BorrowerSearchToolbar
          isLoading={isLoading}
          onSearch={searchBorrowers}
          onSearchChange={setSearch}
          onClear={clearSearch}
          search={search}
        />

        {errorMessage && (
          <p
            className="mx-[17px] mt-[13px] mb-0 rounded-lg border border-danger/20 bg-danger-soft px-[11px] py-[9px] text-[11px] text-danger"
            role="alert"
          >
            <strong>Unable to load borrowers.</strong> {errorMessage}
          </p>
        )}
        {isLoading && (
          <p
            className="mx-[17px] mt-[13px] mb-0 rounded-lg border border-primary/20 bg-primary-soft px-[11px] py-[9px] text-[11px] text-primary"
            role="status"
          >
            Loading borrower records…
          </p>
        )}

        <BorrowerTable
          appliedSearch={appliedSearch}
          borrowers={borrowers}
          errorMessage={errorMessage}
          isLoading={isLoading}
        />
        <BorrowerPagination
          currentPage={currentPage}
          isLoading={isLoading}
          onPageChange={setCurrentPage}
          pageCount={pageCount}
          pageSize={pageSize}
          totalCount={totalCount}
        />
      </Panel>
    </section>
  )
}
