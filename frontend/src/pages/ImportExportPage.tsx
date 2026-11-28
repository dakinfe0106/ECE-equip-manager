import { useSearchParams } from 'react-router'
import PageIntro from '../components/ui/PageIntro'
import ExportRecordsPanel from '../features/importExport/components/ExportRecordsPanel'
import ImportRecordsPanel from '../features/importExport/components/ImportRecordsPanel'

const tabs = [
  { id: 'import', label: 'Import Records' },
  { id: 'export', label: 'Export Records' },
] as const

export default function ImportExportPage() {
  const [params, setParams] = useSearchParams()
  const selected = params.get('tab') === 'export' ? 'export' : 'import'

  return (
    <section aria-labelledby="page-title" className="mx-auto w-full max-w-[1500px] px-[34px] pt-[34px] pb-[50px] max-[760px]:px-4 max-[760px]:pt-6">
      <PageIntro title="Import & Export" description="Move validated operational records in and out of the equipment manager." />
      <nav className="mb-5 flex gap-6 overflow-x-auto border-b border-line" aria-label="Import and export">
        {tabs.map(tab => <button key={tab.id} type="button" aria-pressed={selected === tab.id}
          className={`shrink-0 border-b-2 px-1 py-3 text-xs font-semibold focus-visible:outline-2 focus-visible:outline-primary ${selected === tab.id ? 'border-primary text-primary' : 'border-transparent text-muted hover:text-body'}`}
          onClick={() => setParams(tab.id === 'import' ? {} : { tab: tab.id })}>{tab.label}</button>)}
      </nav>
      {selected === 'import' ? <ImportRecordsPanel /> : <ExportRecordsPanel />}
    </section>
  )
}
