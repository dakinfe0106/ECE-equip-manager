import { buttonClassNames } from '../../../components/ui/buttonStyles'

interface AssetLoadErrorProps {
  isLoading: boolean
  message: string
  onRetry: () => void
}

export default function AssetLoadError({ isLoading, message, onRetry }: AssetLoadErrorProps) {
  return (
    <div
      className="mx-[17px] mt-[13px] flex items-center justify-between gap-4 rounded-lg border border-danger/20 bg-danger-soft px-[13px] py-[11px] max-[520px]:flex-col max-[520px]:items-stretch"
      role="alert"
    >
      <div className="min-w-0">
        <p className="m-0 text-[12px] font-[650] text-danger">Unable to load assets</p>
        <p className="mt-[3px] mb-0 text-[11px] text-danger">{message}</p>
      </div>
      <button
        className={buttonClassNames.secondary}
        type="button"
        disabled={isLoading}
        onClick={onRetry}
      >
        Try again
      </button>
    </div>
  )
}
