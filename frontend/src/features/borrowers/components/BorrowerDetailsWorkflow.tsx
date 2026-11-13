import { useEffect, useRef, useState } from 'react'
import BorrowerDetailsModal from './BorrowerDetailsModal'
import ManageDamageFlagsModal from './ManageDamageFlagsModal'
import RecordDamageFlagModal from './RecordDamageFlagModal'
import type {
  BorrowerDetailsViewModel,
  BorrowerIdentity,
  DamageFlag,
  DamageFlagCreateInput,
  DamageFlagEquipmentOption,
  DamageFlagLoadState,
  DamageFlagUpdateInput,
} from '../types'

type WorkflowStage = 'details' | 'damageFlags' | 'recordDamageFlag' | 'editDamageFlag' | 'closed'

interface BorrowerDetailsWorkflowProps {
  borrower: BorrowerDetailsViewModel
  onClose: () => void
  onViewBorrowingRecords?: (borrowerId: number) => void
  onLoadDamageFlags?: (borrowerId: number) => Promise<DamageFlag[]>
  onCreateDamageFlag?: (payload: DamageFlagCreateInput) => Promise<DamageFlag>
  onResolveDamageFlag?: (flagId: string) => Promise<DamageFlag>
  onUpdateDamageFlag?: (flagId: string, payload: DamageFlagUpdateInput) => Promise<DamageFlag>
  equipmentOptions?: DamageFlagEquipmentOption[]
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Unexpected damage-flag service error.'
}

function toBorrowerIdentity(borrower: BorrowerDetailsViewModel): BorrowerIdentity {
  return {
    borrower_id: borrower.borrower_id,
    borrower_name: borrower.borrower_name,
    standing: borrower.standing,
  }
}

function isForBorrower(flag: DamageFlag, borrower: BorrowerDetailsViewModel): boolean {
  return flag.borrower_id === borrower.borrower_id
    && flag.borrower_name === borrower.borrower_name
}

export default function BorrowerDetailsWorkflow({
  borrower,
  onClose,
  onViewBorrowingRecords,
  onLoadDamageFlags,
  onCreateDamageFlag,
  onResolveDamageFlag,
  onUpdateDamageFlag,
  equipmentOptions,
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
      const flags = await onLoadDamageFlags(borrower.borrower_id)
      if (!Array.isArray(flags) || flags.some((flag) => !isForBorrower(flag, borrower))) {
        throw new Error('The damage flag service returned incidents for a different borrower.')
      }
      if (
        requestId === loadRequestId.current
        && currentBorrowerId.current === borrower.borrower_id
      ) {
        setDamageFlagState({ status: 'loaded', flags })
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

    const createdFlag = await onCreateDamageFlag(payload)
    if (!isForBorrower(createdFlag, borrower)) {
      throw new Error('The saved damage flag does not match the selected borrower.')
    }
    if (createdFlag.status !== 'unresolved') {
      throw new Error('The created damage flag was not confirmed as unresolved.')
    }

    setDamageFlagState((current) => {
      if (current.status !== 'loaded' || loadedBorrowerId !== borrower.borrower_id) return current
      return {
        status: 'loaded',
        flags: [...current.flags.filter((flag) => flag.id !== createdFlag.id), createdFlag],
      }
    })
  }

  const handleResolveDamageFlag = async (flagId: string): Promise<DamageFlag> => {
    if (!onResolveDamageFlag) throw new Error('Damage flag resolution is unavailable.')
    const selectedFlag = damageFlagState.status === 'loaded'
      ? damageFlagState.flags.find(
        (flag) => flag.id === flagId && flag.status === 'unresolved',
      )
      : undefined
    if (!selectedFlag || !isForBorrower(selectedFlag, borrower)) {
      throw new Error('The selected unresolved incident is unavailable for this borrower.')
    }

    const resolvedFlag = await onResolveDamageFlag(flagId)
    if (
      resolvedFlag.id !== flagId
      || resolvedFlag.status !== 'resolved'
      || !isForBorrower(resolvedFlag, borrower)
    ) {
      throw new Error('The service did not confirm resolution of the selected incident.')
    }

    setDamageFlagState((current) => {
      if (current.status !== 'loaded' || loadedBorrowerId !== borrower.borrower_id) return current
      return {
        status: 'loaded',
        flags: current.flags.map((flag) => flag.id === flagId ? resolvedFlag : flag),
      }
    })
    return resolvedFlag
  }

  const handleUpdateDamageFlag = async (
    flagId: string,
    payload: DamageFlagUpdateInput,
  ): Promise<DamageFlag> => {
    if (!onUpdateDamageFlag) throw new Error('Damage flag editing is unavailable.')
    const selectedFlag = damageFlagState.status === 'loaded'
      ? damageFlagState.flags.find((flag) => flag.id === flagId)
      : undefined
    if (!selectedFlag || !isForBorrower(selectedFlag, borrower)) {
      throw new Error('The selected incident is unavailable for this borrower.')
    }

    const updatedFlag = await onUpdateDamageFlag(flagId, payload)
    if (
      updatedFlag.id !== selectedFlag.id
      || !isForBorrower(updatedFlag, borrower)
      || updatedFlag.status !== selectedFlag.status
      || updatedFlag.reviewed !== selectedFlag.reviewed
    ) {
      throw new Error('The service did not preserve the selected incident identity and status.')
    }

    setDamageFlagState((current) => {
      if (current.status !== 'loaded' || loadedBorrowerId !== borrower.borrower_id) return current
      return {
        status: 'loaded',
        flags: current.flags.map((flag) => flag.id === flagId ? updatedFlag : flag),
      }
    })
    setSelectedDamageFlagId(flagId)
    return updatedFlag
  }

  const borrowerIdentity = toBorrowerIdentity(borrower)
  const canRecordDamageFlag = Boolean(onCreateDamageFlag && equipmentOptions)
  const selectedDamageFlag = damageFlagState.status === 'loaded'
    ? damageFlagState.flags.find((flag) => flag.id === selectedDamageFlagId)
    : undefined
  const activeStage = stageBorrowerId === borrower.borrower_id ? stage : 'details'

  return (
    <>
      {activeStage === 'details' && (
        <BorrowerDetailsModal
          borrower={borrower}
          onClose={closeWorkflow}
          onViewBorrowingRecords={onViewBorrowingRecords ? viewBorrowingRecords : undefined}
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
