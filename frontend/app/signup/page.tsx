'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function SignUpPage() {
  const router = useRouter()
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSignUp(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const supabase = createClient()
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName } },
    })

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    router.push('/dashboard')
  }

  return (
    <div className="app-shell flex flex-col">
      <div className="app-wrap p-6">
        <div className="flex items-center gap-2">
          <div className="brand-mark">
            <span>S</span>
          </div>
          <span className="brand-name">SplitEasy</span>
        </div>
      </div>

      <div className="flex flex-1 items-center justify-center p-4">
        <div className="app-card w-full max-w-md p-8">
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-slate-900">Create your account</h1>
            <p className="mt-1 text-sm text-slate-500">
              Start splitting expenses with friends in minutes.
            </p>
          </div>

          <form onSubmit={handleSignUp} className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Full name
              </label>
              <input
                type="text"
                value={fullName}
                onChange={e => setFullName(e.target.value)}
                required
                className="app-input"
                placeholder="Kholekile Mpengesi"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Email address
              </label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                className="app-input"
                placeholder="you@example.com"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                minLength={6}
                className="app-input"
                placeholder="At least 6 characters"
              />
            </div>

            {error && (
              <div className="rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-600">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="app-btn-primary w-full"
            >
              {loading ? 'Creating account...' : 'Create account'}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-slate-500">
            Already have an account?{' '}
            <Link href="/login" className="font-medium text-sky-600 hover:underline">
              Log in
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}