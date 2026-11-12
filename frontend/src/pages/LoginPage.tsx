import { useState } from 'react'
import type { FormEvent } from 'react'
import { Navigate } from 'react-router'
import { useAuth } from '../features/auth/useAuth'
import { describeAuthError } from '../features/auth/api'
import { SessionStatus } from '../features/auth/RequireAuth'

export default function LoginPage() {
  const { user, status, login } = useAuth()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  if (status !== 'ready') return <SessionStatus />
  if (user) return <Navigate to="/" replace />

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (isSubmitting) return
    setError('')
    if (!username.trim()) {
      setError('Enter your username.')
      return
    }
    setIsSubmitting(true)
    try {
      await login(username, password)
      setPassword('')
    } catch (failure) {
      setError(describeAuthError(failure))
    } finally {
      setIsSubmitting(false)
    }
  }

  const inputClass = 'mt-1.5 w-full rounded-lg border border-[#d9dee6] bg-white px-3 py-[11px] text-xs font-normal text-[#182230] placeholder:text-[#8b96a6] focus:border-[#2f6fed] focus:outline-none focus:ring-3 focus:ring-[#2f6fed]/15'

  return (
    <main className="grid min-h-dvh place-items-center bg-[radial-gradient(circle_at_70%_20%,#ecf3ff_0,transparent_35%)] bg-[#f5f7fa] p-6 text-[#182230]">
      <section aria-labelledby="login-heading" className="w-full max-w-[430px] rounded-2xl border border-[#e2e7ef] bg-white p-6 shadow-[0_20px_60px_rgba(30,50,80,0.12)] sm:p-8">
        <div className="mb-[35px] flex flex-col items-center gap-3 text-center">
          <div aria-hidden="true" className="grid size-[46px] place-items-center rounded-[10px] bg-linear-to-br from-[#4285f4] to-[#2057c8] text-lg font-extrabold text-white shadow-lg">E</div>
          <div>
            <p className="text-base font-bold">ECE Equipment Manager</p>
            <p className="mt-0.5 text-[10px] text-[#8b96a6]">Secure equipment operations</p>
          </div>
        </div>
        <div className="text-center">
          <p className="mb-[7px] text-[10px] font-bold tracking-[0.11em] text-[#2f6fed] uppercase">Welcome back</p>
          <h1 id="login-heading" className="text-2xl font-bold tracking-tight">Sign in to your workspace</h1>
          <p className="mt-[7px] text-xs leading-relaxed text-[#7a8595]">Enter the credentials shared with you by your team administrator.</p>
        </div>
        <form onSubmit={handleSubmit} aria-busy={isSubmitting} className="mt-[25px] grid gap-[14px]">
          <label className="text-[10px] font-bold text-[#475467]">
            Username
            <input name="username" autoComplete="username" autoCapitalize="none" spellCheck={false} required maxLength={150} value={username} onChange={(event) => setUsername(event.target.value)} placeholder="Enter username" className={inputClass} />
          </label>
          <div>
            <label htmlFor="login-password" className="text-[10px] font-bold text-[#475467]">Password</label>
            <div className="relative">
              <input id="login-password" name="password" type={showPassword ? 'text' : 'password'} autoComplete="current-password" required value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Enter password" className={`${inputClass} pr-11`} />
              {password.length > 0 && <button type="button" aria-label={showPassword ? 'Hide password' : 'Show password'} aria-controls="login-password" onClick={() => setShowPassword((visible) => !visible)} className="absolute inset-y-0 right-0 mt-1.5 flex w-10 cursor-pointer items-center justify-center rounded-r-lg text-[#7a8595] hover:text-[#182230] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#347ee9]">
                <svg aria-hidden="true" className="size-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" />
                  <circle cx="12" cy="12" r="3" />
                  {!showPassword && <path d="m3 3 18 18" />}
                </svg>
              </button>}
            </div>
          </div>
          {error && <p role="alert" className="rounded-lg border border-[#f5cfcc] bg-[#fff0ef] px-3 py-2.5 text-xs text-[#a22920]">{error}</p>}
          <button type="submit" disabled={isSubmitting} className="mt-1 min-h-[38px] cursor-pointer rounded-lg bg-[#2f6fed] px-4 py-2.5 text-xs font-semibold text-white shadow-[0_4px_10px_rgba(47,111,237,0.22)] hover:bg-[#245fcf] disabled:cursor-wait disabled:opacity-65">
            {isSubmitting ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
      </section>
    </main>
  )
}
