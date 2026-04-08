'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { apiFetch } from '@/lib/api'

interface Props {
  groupId: string
  userId: string
}

export default function InviteMember({ groupId, userId }: Props) {
  const [email, setEmail] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setSuccess(null)

    try {
      await apiFetch(`/groups/${groupId}/members`, userId, {
        method: 'POST',
        body: JSON.stringify({ email }),
      })

      setSuccess(`${email} has been added to the group.`)
      setEmail('')
      router.refresh()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleInvite} className="space-y-4 min-w-0">
      <div className="flex min-w-0 flex-col gap-3 sm:flex-row">
        <input
          type="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          required
          className="app-input min-w-0 flex-1"
          placeholder="friend@example.com"
        />
        <button
          type="submit"
          disabled={loading}
          className="app-btn-primary shrink-0 whitespace-nowrap sm:w-auto"
        >
          {loading ? 'Adding...' : 'Add member'}
        </button>
      </div>

      {error && (
        <div className="rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-600">
          {error}
        </div>
      )}

      {success && (
        <div className="rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {success}
        </div>
      )}
    </form>
  )
}
