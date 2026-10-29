import type { ReactNode } from 'react'

interface PageIntroProps {
  title: string
  description: string
  actions?: ReactNode
}

export default function PageIntro({ title, description, actions }: PageIntroProps) {
  return (
    <div className="mb-[27px] flex flex-wrap items-end justify-between gap-x-6 gap-y-[18px] max-[760px]:items-start max-[520px]:block">
      <div className="min-w-[260px] flex-1">
        <h1
          className="m-0 text-[27px] font-bold leading-[1.2] tracking-[-0.035em] text-heading max-[760px]:text-[23px]"
          id="page-title"
        >
          {title}
        </h1>
        <p className="mt-[7px] mb-0 text-[13px] text-muted">{description}</p>
      </div>
      {actions && (
        <div className="flex shrink-0 items-center gap-[9px] max-[520px]:mt-[18px] max-[520px]:[&>*]:flex-1">
          {actions}
        </div>
      )}
    </div>
  )
}
