import Panel from '../../../components/ui/Panel'

export default function ImportRecordsPanel() {
  return (
    <Panel label="Import records" className="p-[22px]">
      <div className="mx-auto w-full max-w-[590px] rounded-[9px] border border-line bg-page p-4">
        <h2 className="m-0 text-[13px] font-semibold text-body">Spreadsheet import is not available yet</h2>
        <p className="mt-1 mb-0 text-[11px] text-muted">
          Importing assets from an Excel spreadsheet is still in progress. Use the Export Records tab to download current records.
        </p>
      </div>
    </Panel>
  )
}
