export function safeReturnPath(value: unknown): string {
  if (typeof value !== 'string' || !value.startsWith('/') || value.startsWith('//') || /[\\\s]/.test(value)) return '/assets'
  try {
    const url = new URL(value, 'https://ems.invalid')
    if (url.origin !== 'https://ems.invalid' || /^\/login\/?$/i.test(url.pathname)) return '/assets'
    return url.pathname + url.search + url.hash
  } catch {
    return '/assets'
  }
}
