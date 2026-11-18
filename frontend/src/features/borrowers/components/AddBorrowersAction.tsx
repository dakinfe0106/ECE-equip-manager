import { buttonClassNames } from '../../../components/ui/buttonStyles'
import { hasPermission } from '../../auth/api'
import { useAuth } from '../../auth/useAuth'

interface AddBorrowerActionProps {
  onClick: () => void
}

export default function AddBorrowerAction({ onClick }: AddBorrowerActionProps) {
  const { user } = useAuth()
  if (!hasPermission(user, 'lending.add_borrower')) return null

  return (
    <button className={buttonClassNames.primary} type="button" onClick={onClick}>
      <svg className="h-4 w-4 fill-none stroke-current stroke-[1.8] [stroke-linecap:round]" viewBox="0 0 24 24" aria-hidden="true">
        <path d="M12 5v14M5 12h14" />
      </svg>
      Add Borrower
    </button>
  )
}