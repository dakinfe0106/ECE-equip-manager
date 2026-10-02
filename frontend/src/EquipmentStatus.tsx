type EquipmentStatusType =
  | 'Available'
  | 'On Loan'
  | 'Under Maintenance'
  | 'Retired'

interface EquipmentStatusProps {
  equipmentName: string
  status: EquipmentStatusType
}

function EquipmentStatus({
  equipmentName,
  status,
}: EquipmentStatusProps) {
  return (
    <div className="equipment-status">
      <h2>{equipmentName}</h2>
      <p>
        Status: <strong>{status}</strong>
      </p>
    </div>
  )
}

export default EquipmentStatus
