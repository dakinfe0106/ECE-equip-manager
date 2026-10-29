import type { CurrentUser } from './api'

export function getUserDisplay(user: CurrentUser | null) {
  const displayName = [user?.first_name, user?.last_name].filter(Boolean).join(' ').trim() || user?.username || ''
  const avatarText = Array.from(displayName.replace(/\s/g, '')).slice(0, 2).join('').toUpperCase()
  return { displayName, avatarText }
}
