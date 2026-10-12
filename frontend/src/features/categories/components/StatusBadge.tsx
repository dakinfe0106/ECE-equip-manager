export default function StatusBadge({ isDeleted }: { isDeleted: boolean }) {
  return (
    <span
      className={`inline-block rounded-full px-2.5 py-0.5 text-[10px] font-semibold ${
        isDeleted ? 'bg-slate-200 text-slate-600' : 'bg-emerald-100 text-emerald-800'
      }`}
    >
      {isDeleted ? 'Deleted' : 'Active'}
    </span>
  )
}
