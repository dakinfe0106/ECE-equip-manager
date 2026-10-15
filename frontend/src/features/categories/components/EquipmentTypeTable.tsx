import type { EquipmentType } from '../api'

const headerClassName =
  'h-10 bg-[#f7f9fc] px-[14px] text-left text-[9px] font-[650] tracking-[0.15px] text-[#758196]'
const cellClassName = 'h-12 border-t border-[#edf0f4] px-[14px] text-[10px]'

export default function EquipmentTypeTable({ equipmentTypes }: { equipmentTypes: EquipmentType[] }) {
  return (
    <div className="min-h-0 flex-1 overflow-auto border-t border-[#e8edf3]">
      <table className="w-full border-collapse text-left text-[#4c596d] whitespace-nowrap">
        <thead>
          <tr>
            <th className={`${headerClassName} pl-[19px]`} scope="col">ID</th>
            <th className={headerClassName} scope="col">Name</th>
            <th className={headerClassName} scope="col">Description</th>
          </tr>
        </thead>
        <tbody>
          {equipmentTypes.map((equipmentType) => (
            <tr key={equipmentType.type_id} className="hover:bg-[#f8faff]">
              <td className={`${cellClassName} pl-[19px] tabular-nums text-[#8a96a7]`}>
                {equipmentType.type_id.toString().padStart(2, '0')}
              </td>
              <td className={`${cellClassName} font-[570] text-[#39465a]`}>{equipmentType.name}</td>
              <td className={`${cellClassName} whitespace-normal`}>
                {equipmentType.description || '—'}
              </td>
            </tr>
          ))}
          {equipmentTypes.length === 0 && (
            <tr>
              <td
                className="h-[116px] border-t border-[#edf0f4] px-[14px] text-center text-[10px] text-[#8792a2] whitespace-normal"
                colSpan={3}
              >
                This category has no equipment types yet.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  )
}
