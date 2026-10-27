import type { ReactNode } from 'react'

interface PanelProps {
  children: ReactNode
  className?: string
  label?: string
}

export default function Panel({ children, className = '', label }: PanelProps) {
  return (
    <section
      className={`rounded-[11px] border border-line bg-white shadow-[0_1px_2px_rgb(16_24_40_/_2.5%)] ${className}`}
      aria-label={label}
    >
      {children}
    </section>
  )
}
