export default function StatusBadge({ isDeleted }: { isDeleted: boolean }) {
  return (
    <span
      className={`inline-flex min-w-[68px] items-center justify-center rounded-xl px-2 py-1 text-[9px] font-[650] ${
        isDeleted ? 'bg-[#e8ebf0] text-[#5b6574]' : 'bg-[#def5e8] text-[#16864f]'
      }`}
    >
      {isDeleted ? 'Deleted' : 'Active'}
    </span>
  )
}
