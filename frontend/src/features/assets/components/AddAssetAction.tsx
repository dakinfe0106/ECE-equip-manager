import { Link } from 'react-router'
import { buttonClassNames } from '../../../components/ui/buttonStyles'

export default function AddAssetAction() {
  return (
    <Link className={buttonClassNames.primary} to="/assets/new">
      <svg className="h-4 w-4 fill-none stroke-current stroke-[1.8] [stroke-linecap:round]" viewBox="0 0 24 24" aria-hidden="true">
        <path d="M12 5v14M5 12h14" />
      </svg>
      Add Asset
    </Link>
  )
}
