import { Link } from 'react-router'

export default function AddAssetAction() {
  return (
      <Link
        className="inline-flex min-h-9 items-center justify-center gap-[7px] rounded-[6px] border border-[#276fdd] bg-[#2875e4] px-3 text-[11px] font-semibold text-white transition-colors hover:bg-[#1c64cc] focus-visible:outline-2 focus-visible:outline-[#347ee9] focus-visible:outline-offset-[3px]"
        to="/assets/new"
      >
        <svg className="h-[14px] w-[14px] fill-none stroke-current [stroke-linecap:round] stroke-[1.8]" viewBox="0 0 20 20" aria-hidden="true">
          <path d="M10 4v12M4 10h12" />
        </svg>
        Add Asset
      </Link>
  )
}
