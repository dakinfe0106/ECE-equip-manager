import { useEffect, useRef, useState } from 'react'
import BorrowerDetailsModal from './BorrowerDetailsModal'
import ManageDamageFlagsModal from './ManageDamageFlagsModal'
import RecordDamageFlagModal from './RecordDamageFlagModal'
import type {
  BorrowerDetailsViewModel,
  BorrowerDetailsLoadState,
  BorrowerIdentity,
  DamageFlag,
  DamageFlagCollection,
  DamageFlagCreateInput,
  DamageFlagEquipmentOption,
  DamageFlagLoadState,
  DamageFlagMutationResult,
  DamageFlagUpdateInput,
} from '../types'

type WorkflowStage = 'details' | 'damageFlags' | 'recordDamageFlag' | 'editDamageFlag' | 'closed'

interface BorrowerDetailsWorkflowProps {
  borrower: BorrowerDetailsViewModel
  onClose: () => void
  detailsLoadState?: BorrowerDetailsLoadState
  onRetryDetails?: () => void
  onViewBorrowingRecords?: (borrowerId: number) => void
  onLoadDamageFlags?: (borrowerId: number) => Promise<DamageFlagCollection>
  onCreateDamageFlag?: (payload: DamageFlagCreateInput) => Promise<DamageFlagMutationResult>
  onResolveDamageFlag?: (
    flagId: string,
    resolutionReason: string,
  ) => Promise<DamageFlagMutationResult>
  onUpdateDamageFlag?: (
    flagId: string,
    payload: DamageFlagUpdateInput,
  ) => Promise<DamageFlagMutationResult>
  equipmentOptions?: DamageFlagEquipmentOption[]
  equipmentOptionsError?: string
  onRetryEquipmentOptions?: () => void
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Unexpected damage-flag service error.'
}

function toBorrowerIdentity(borrower: BorrowerDetailsViewModel): BorrowerIdentity {
  return {
    borrower_id: borrower.borrower_id,
    borrower_name: borrower.borrower_name,
    standing: borrower.standing,
    unresolved_damage_flag_count: borrower.unresolved_damage_flag_count,
    damage_warning_level: borrower.damage_warning_level,
    damage_eligible: borrower.damage_eligible,
  }
}

function isForBorrower(flag: DamageFlag, borrower: BorrowerDetailsViewModel): boolean {
  return flag.borrower_id === borrower.borrower_id
    && flag.borrower_name === borrower.borrower_name
}

export default function BorrowerDetailsWorkflow({
  borrower,
  onClose,
  detailsLoadState,
  onRetryDetails,
  onViewBorrowingRecords,
  onLoadDamageFlags,
  onCreateDamageFlag,
  onResolveDamageFlag,
  onUpdateDamageFlag,
  equipmentOptions,
  equipmentOptionsError,
  onRetryEquipmentOptions,
}: BorrowerDetailsWorkflowProps) {
  const [stage, setStage] = useState<WorkflowStage>('details')
  const [damageFlagState, setDamageFlagState] = useState<DamageFlagLoadState>({
    status: 'unavailable',
  })
  const [loadedBorrowerId, setLoadedBorrowerId] = useState<number | undefined>()
  const [selectedDamageFlagId, setSelectedDamageFlagId] = useState<string | undefined>()
  const loadRequestId = useRef(0)
  const currentBorrowerId = useRef(borrower.borrower_id)
  const [stageBorrowerId, setStageBorrowerId] = useState(borrower.borrower_id)
  const [damageSummary, setDamageSummary] = useState<{
    unresolved_damage_flag_count: number
    damage_warning_level: NonNullable<BorrowerDetailsViewModel['damage_warning_level']>
    damage_eligible: boolean
  }>()
  const openerRef = useRef<HTMLElement | null>(
    typeof document !== 'undefined' && document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null,
  )

  useEffect(() => () => {
    loadRequestId.current += 1
    if (openerRef.current?.isConnected) openerRef.current.focus()
  }, [])

  useEffect(() => {
    if (currentBorrowerId.current !== borrower.borrower_id) {
      currentBorrowerId.current = borrower.borrower_id
      loadRequestId.current += 1
    }
  }, [borrower.borrower_id])

  const transitionTo = (nextStage: WorkflowStage) => {
    setStage(nextStage)
    setStageBorrowerId(borrower.borrower_id)
  }

  const loadFlags = async () => {
    transitionTo('damageFlags')
    const requestId = ++loadRequestId.current
    if (!onLoadDamageFlags) {
      setLoadedBorrowerId(undefined)
      setDamageFlagState({ status: 'unavailable' })
      return
    }

    setLoadedBorrowerId(borrower.borrower_id)
    setDamageFlagState({ status: 'loading' })
    try {
      const result = await onLoadDamageFlags(borrower.borrower_id)
      if (!Array.isArray(result.results) || result.results.some((flag) => !isForBorrower(flag, borrower))) {
        throw new Error('The damage flag service returned incidents for a different borrower.')
      }
      if (
        requestId === loadRequestId.current
        && currentBorrowerId.current === borrower.borrower_id
      ) {
        setDamageFlagState({
          status: 'loaded',
          flags: result.results,
          summary: result.summary,
        })
        setDamageSummary({
          unresolved_damage_flag_count: result.summary.unresolved_count,
          damage_warning_level: result.summary.warning_level,
          damage_eligible: result.summary.damage_eligible,
        })
      }
    } catch (error: unknown) {
      if (
        requestId === loadRequestId.current
        && currentBorrowerId.current === borrower.borrower_id
      ) {
        setDamageFlagState({ status: 'error', message: getErrorMessage(error) })
      }
    }
  }

  const closeDamageFlags = () => {
    loadRequestId.current += 1
    transitionTo('details')
  }

  const closeWorkflow = () => {
    if (openerRef.current?.isConnected) openerRef.current.focus()
    transitionTo('closed')
    onClose()
  }

  const viewBorrowingRecords = (borrowerId: number) => {
    if (!onViewBorrowingRecords || borrowerId !== borrower.borrower_id) return
    closeWorkflow()
    onViewBorrowingRecords(borrowerId)
  }

  const handleCreateDamageFlag = async (payload: DamageFlagCreateInput) => {
    if (!onCreateDamageFlag) throw new Error('Damage flag recording is unavailable.')
    if (
      payload.borrower_id !== borrower.borrower_id
      || payload.borrower_name !== borrower.borrower_name
    ) {
      throw new Error('The damage flag borrower does not match the selected borrower.')
    }

    const result = await onCreateDamageFlag(payload)
    const createdFlag = result.damage_flag
    if (!isForBorrower(createdFlag, borrower)) {
      throw new Error('The saved damage flag does not match the selected borrower.')
    }
    if (createdFlag.status !== 'unresolved') {
      throw new Error('The created damage flag was not confirmed as unresolved.')
    }
    setDamageSummary({
      unresolved_damage_flag_count: result.summary.unresolved_count,
      damage_warning_level: result.summary.warning_level,
      damage_eligible: result.summary.damage_eligible,
    })

    setDamageFlagState((current) => {
      if (current.status !== 'loaded' || loadedBorrowerId !== borrower.borrower_id) return current
      return {
        status: 'loaded',
        flags: [...current.flags.filter((flag) => flag.id !== createdFlag.id), createdFlag],
        summary: result.summary,
      }
    })
  }

  const handleResolveDamageFlag = async (
    flagId: string,
    resolutionReason: string,
  ): Promise<DamageFlagMutationResult> => {
    if (!onResolveDamageFlag) throw new Error('Damage flag resolution is unavailable.')
    const selectedFlag = damageFlagState.status === 'loaded'
      ? damageFlagState.flags.find(
        (flag) => flag.id === flagId && flag.status === 'unresolved',
      )
      : undefined
    if (!selectedFlag || !isForBorrower(selectedFlag, borrower)) {
      throw new Error('The selected unresolved incident is unavailable for this borrower.')
    }

    const result = await onResolveDamageFlag(flagId, resolutionReason)
    const resolvedFlag = result.damage_flag
    if (
      resolvedFlag.id !== flagId
      || resolvedFlag.status !== 'resolved'
      || !isForBorrower(resolvedFlag, borrower)
    ) {
      throw new Error('The service did not confirm resolution of the selected incident.')
    }
    setDamageSummary({
      unresolved_damage_flag_count: result.summary.unresolved_count,
      damage_warning_level: result.summary.warning_level,
      damage_eligible: result.summary.damage_eligible,
    })

    setDamageFlagState((current) => {
      if (current.status !== 'loaded' || loadedBorrowerId !== borrower.borrower_id) return current
      return {
        status: 'loaded',
        flags: current.flags.map((flag) => flag.id === flagId ? resolvedFlag : flag),
        summary: result.summary,
      }
    })
    return result
  }

  const handleUpdateDamageFlag = async (
    flagId: string,
    payload: DamageFlagUpdateInput,
  ): Promise<DamageFlagMutationResult> => {
    if (!onUpdateDamageFlag) throw new Error('Damage flag editing is unavailable.')
    const selectedFlag = damageFlagState.status === 'loaded'
      ? damageFlagState.flags.find((flag) => flag.id === flagId)
      : undefined
    if (!selectedFlag || !isForBorrower(selectedFlag, borrower)) {
      throw new Error('The selected incident is unavailable for this borrower.')
    }

    const result = await onUpdateDamageFlag(flagId, payload)
    const updatedFlag = result.damage_flag
    if (
      updatedFlag.id !== selectedFlag.id
      || !isForBorrower(updatedFlag, borrower)
      || updatedFlag.status !== selectedFlag.status
      || updatedFlag.reviewed !== selectedFlag.reviewed
    ) {
      throw new Error('The service did not preserve the selected incident identity and status.')
    }
    setDamageSummary({
      unresolved_damage_flag_count: result.summary.unresolved_count,
      damage_warning_level: result.summary.warning_level,
      damage_eligible: result.summary.damage_eligible,
    })

    setDamageFlagState((current) => {
      if (current.status !== 'loaded' || loadedBorrowerId !== borrower.borrower_id) return current
      return {
        status: 'loaded',
        flags: current.flags.map((flag) => flag.id === flagId ? updatedFlag : flag),
        summary: result.summary,
      }
    })
    setSelectedDamageFlagId(flagId)
    return result
  }

  const borrowerWithDamageSummary = { ...borrower, ...damageSummary }
  const borrowerIdentity = toBorrowerIdentity(borrowerWithDamageSummary)
  const canRecordDamageFlag = Boolean(onCreateDamageFlag && equipmentOptions?.length)
  const selectedDamageFlag = damageFlagState.status === 'loaded'
    ? damageFlagState.flags.find((flag) => flag.id === selectedDamageFlagId)
    : undefined
  const activeStage = stageBorrowerId === borrower.borrower_id ? stage : 'details'

  return (
    <>
      {activeStage === 'details' && (
        <BorrowerDetailsModal
          borrower={borrowerWithDamageSummary}
          onClose={closeWorkflow}
          onViewBorrowingRecords={onViewBorrowingRecords ? viewBorrowingRecords : undefined}
          detailsLoadState={detailsLoadState}
          onRetryDetails={onRetryDetails}
          onManageDamageFlags={(borrowerId) => {
            if (borrowerId !== borrower.borrower_id) return
            void loadFlags()
          }}
          restoreFocusOnUnmount={false}
        />
      )}
      {activeStage === 'damageFlags' && (
        <ManageDamageFlagsModal
          key={borrower.borrower_id}
          borrower={borrowerIdentity}
          dataState={loadedBorrowerId === borrower.borrower_id
            ? damageFlagState
            : { status: 'unavailable' }}
          onClose={closeDamageFlags}
          onRetry={() => {
            void loadFlags()
          }}
          equipmentOptionsError={equipmentOptionsError}
          equipmentOptionsEmpty={equipmentOptions?.length === 0}
          onRetryEquipmentOptions={onRetryEquipmentOptions}
          initialSelectedFlagId={selectedDamageFlagId}
          onSelectFlag={setSelectedDamageFlagId}
          onEditFlag={onUpdateDamageFlag && equipmentOptions
            ? (flagId) => {
              const flag = damageFlagState.status === 'loaded'
                ? damageFlagState.flags.find((item) => item.id === flagId)
                : undefined
              if (!flag) return
              setSelectedDamageFlagId(flagId)
              transitionTo('editDamageFlag')
            }
            : undefined}
          onResolveFlag={onResolveDamageFlag ? handleResolveDamageFlag : undefined}
          onRecordDamageFlag={canRecordDamageFlag
            ? () => transitionTo('recordDamageFlag')
            : undefined}
          restoreFocusOnUnmount={false}
        />
      )}
      {activeStage === 'recordDamageFlag' && onCreateDamageFlag && equipmentOptions && (
        <RecordDamageFlagModal
          key={borrower.borrower_id}
          borrower={borrowerIdentity}
          equipmentOptions={equipmentOptions}
          onCancel={() => transitionTo('damageFlags')}
          onSave={handleCreateDamageFlag}
          restoreFocusOnUnmount={false}
        />
      )}
      {activeStage === 'editDamageFlag' && selectedDamageFlag && onUpdateDamageFlag && equipmentOptions && (
        <RecordDamageFlagModal
          key={`edit-${borrower.borrower_id}-${selectedDamageFlag.id}`}
          mode="edit"
          borrower={borrowerIdentity}
          equipmentOptions={equipmentOptions}
          editingFlag={selectedDamageFlag}
          onCancel={() => transitionTo('damageFlags')}
          onUpdate={handleUpdateDamageFlag}
          restoreFocusOnUnmount={false}
        />
      )}
    </>
  )
}
