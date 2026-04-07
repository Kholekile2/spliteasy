'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { apiFetch } from '@/lib/api'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function NewGroupPage() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      router.push('/login')
      return
    }

    try {
      const group = await apiFetch('/groups', user.id, {
        method: 'POST',
        body: JSON.stringify({ name }),
      })
      router.push(`/groups/${group.id}`)
    } catch (err: any) {
      setError(err.message)
      setLoading(false)
    }
  }

  return (
    <div className="app-shell flex flex-col">
      <nav className="app-nav">
        <div className="app-wrap flex items-center gap-4 py-4">
          <Link
            href="/dashboard"
            className="text-sm text-slate-500 transition-colors hover:text-slate-700"
          >
            {'<'} Dashboard
          </Link>
          <div className="h-4 w-px bg-slate-200" />
          <div className="flex items-center gap-2">
            <div className="brand-mark">
              <span>S</span>
            </div>
            <span className="brand-name">SplitEasy</span>
          </div>
        </div>
      </nav>

      <main className="app-wrap w-full py-10">
        <div className="max-w-lg">
          <div className="mb-8">
            <h1 className="app-title">New group</h1>
            <p className="app-subtitle">
              Give your group a name — you can invite members after creating it.
            </p>
          </div>

          <div className="app-card p-6">
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Group name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  required
                  autoFocus
                  className="app-input"
                  placeholder="e.g. Barcelona Trip, Flat 4B, Road Trip 2026"
                />
              </div>

              {error && (
                <div className="rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-600">
                  {error}
                </div>
              )}

              <div className="flex gap-3">
                <Link
                  href="/dashboard"
                  className="app-btn-secondary flex-1 text-center"
                >
                  Cancel
                </Link>
                <button
                  type="submit"
                  disabled={loading}
                  className="app-btn-primary flex-1"
                >
                  {loading ? 'Creating...' : 'Create group'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </main>
    </div>
  )
}