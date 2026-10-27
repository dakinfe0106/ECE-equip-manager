// Shared so buttons and button-styled links (`Link`) look the same.
const baseClassName =
  'inline-flex min-h-[38px] items-center justify-center gap-[7px] rounded-lg border px-[15px] text-[12px] font-[650] transition-colors focus-visible:outline-2 focus-visible:outline-offset-[3px] focus-visible:outline-primary disabled:cursor-not-allowed disabled:opacity-60'

export const buttonClassNames = {
  primary: `${baseClassName} border-primary bg-primary text-white shadow-[0_4px_10px_rgb(47_111_237_/_22%)] hover:bg-primary-hover`,
  secondary: `${baseClassName} border-input bg-white text-body hover:enabled:border-primary hover:enabled:text-primary`,
}
