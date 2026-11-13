import { useState } from 'react'
import PageIntro from '../components/ui/PageIntro'
import Panel from '../components/ui/Panel'
import { hasPermission } from '../features/auth/api'
import { useAuth } from '../features/auth/useAuth'
import MaintenanceRecordDialog from '../features/maintenance/components/MaintenanceRecordDialog'

export default function MaintenancePage() {
  const { user } = useAuth()
  const [isCreating, setIsCreating] = useState(false)
  const [statusMessage, setStatusMessage] = useState('')
  const canCreate = hasPermission(user, 'maintenance.add_maintenancerecord')

  return (
    <section
      className="mx-auto flex h-full min-h-0 w-full max-w-[1500px] flex-col px-[34px] pt-[34px] pb-[50px] max-[760px]:px-4 max-[760px]:pt-6 max-[760px]:pb-10"
      aria-labelledby="page-title"
    >
      <PageIntro
        title="Maintenance"
        description="Create a maintenance record for equipment requiring service."
        actions={canCreate ? (
          <button
            className="min-h-10 rounded-lg bg-primary px-4 text-[12px] font-semibold text-white hover:bg-primary-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            type="button"
            onClick={() => {
              setStatusMessage('')
              setIsCreating(true)
            }}
          >
            + New Maintenance
          </button>
        ) : undefined}
      />

      <Panel className="flex min-h-[220px] flex-col items-center justify-center gap-3 p-6 text-center">
        <h2 className="m-0 text-[15px] font-semibold text-heading">
          Start an equipment maintenance record
        </h2>
        <p className="m-0 max-w-[480px] text-[12px] text-muted">
          Select available equipment, assign a responsible technician, and record
          the maintenance type, priority, and start date.
        </p>
        {canCreate && (
          <button
            className="min-h-9 rounded-lg border border-input bg-white px-4 text-[11px] font-semibold text-body hover:border-primary"
            type="button"
            onClick={() => setIsCreating(true)}
          >
            Create maintenance record
          </button>
        )}
        {statusMessage && (
          <p className="m-0 text-[11px] text-success" role="status">
            {statusMessage}
          </p>
        )}
      </Panel>

      {isCreating && (
        <MaintenanceRecordDialog
          onClose={() => setIsCreating(false)}
          onCreated={() => {
            setIsCreating(false)
            setStatusMessage(
              'Maintenance record created. Equipment is now under maintenance.',
            )
          }}
        />
      )}
    </section>
  )
}
