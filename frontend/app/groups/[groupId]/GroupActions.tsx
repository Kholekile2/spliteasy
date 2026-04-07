'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { apiFetch } from '@/lib/api'

interface Props {
  groupId: string
  userId: string
  createdBy: string
}

export default function GroupActions({ groupId, userId, createdBy }: Props) {
  const router = useRouter()
  const [confirmAction, setConfirmAction] = useState<'leave' | 'delete' | null>(null)
  const [loading, setLoading] = useState(false)
  const isCreator = createdBy === userId

  async function handleLeaveGroup() {
    setLoading(true)

    try {
      await apiFetch(`/groups/${groupId}/leave`, userId, {
        method: 'DELETE',
      })
      router.push('/dashboard')
      router.refresh()
    } catch (err: any) {
      alert(err.message)
    } finally {
      setLoading(false)
      setConfirmAction(null)
    }
  }

  async function handleDeleteGroup() {
    setLoading(true)

    try {
      await apiFetch(`/groups/${groupId}`, userId, {
        method: 'DELETE',
      })
      router.push('/dashboard')
      router.refresh()
    } catch (err: any) {
      alert(err.message)
    } finally {
      setLoading(false)
      setConfirmAction(null)
    }
  }

  return (
    <>
      <button
        onClick={() => setConfirmAction(isCreator ? 'delete' : 'leave')}
        disabled={loading}
        className={`rounded-xl px-4 py-2 text-sm font-medium transition-colors disabled:opacity-60 ${
          isCreator
            ? 'border border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100'
            : 'border border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
        }`}
      >
        {isCreator ? 'Delete group' : 'Leave group'}
      </button>

      {confirmAction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/35 px-4 backdrop-blur-sm">
          <div className="app-card w-full max-w-md p-6">
            <h4 className="text-base font-semibold text-slate-900">
              {confirmAction === 'delete' ? 'Delete this group?' : 'Leave this group?'}
            </h4>
            <p className="mt-2 text-sm text-slate-600">
              {confirmAction === 'delete'
                ? 'This will permanently delete the group and all related expenses, splits, and settlements. This cannot be undone.'
                : 'You will lose access to this group and its expenses. You can only rejoin if someone invites you again.'}
            </p>

            <div className="mt-5 flex justify-end gap-3">
              <button
                onClick={() => setConfirmAction(null)}
                disabled={loading}
                className="app-btn-secondary"
              >
                Cancel
              </button>
              <button
                onClick={confirmAction === 'delete' ? handleDeleteGroup : handleLeaveGroup}
                disabled={loading}
                className="rounded-xl bg-rose-600 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-rose-700 disabled:bg-rose-400"
              >
                {loading
                  ? confirmAction === 'delete'
                    ? 'Deleting...'
                    : 'Leaving...'
                  : confirmAction === 'delete'
                    ? 'Delete group'
                    : 'Leave group'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
