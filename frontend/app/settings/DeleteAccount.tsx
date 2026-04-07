'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { apiFetch } from '@/lib/api'
import { createClient } from '@/lib/supabase/client'

interface Props {
  userId: string
}

export default function DeleteAccount({ userId }: Props) {
  const router = useRouter()
  const [showConfirm, setShowConfirm] = useState(false)
  const [deleting, setDeleting] = useState(false)

  async function handleDelete() {
    setDeleting(true)

    try {
      await apiFetch('/account', userId, {
        method: 'DELETE',
      })

      const supabase = createClient()
      await supabase.auth.signOut()

      router.push('/signup')
      router.refresh()
    } catch (err: any) {
      alert(err.message)
      setDeleting(false)
    }
  }

  return (
    <>
      <button
        onClick={() => setShowConfirm(true)}
        className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-2 text-sm font-medium text-rose-700 transition-colors hover:bg-rose-100"
      >
        Delete account
      </button>

      {showConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/35 px-4 backdrop-blur-sm">
          <div className="app-card w-full max-w-md p-6">
            <h4 className="text-base font-semibold text-slate-900">
              Delete your account?
            </h4>
            <p className="mt-2 text-sm text-slate-600">
              This will permanently delete your account and cannot be undone.
            </p>

            <div className="mt-5 flex justify-end gap-3">
              <button
                onClick={() => setShowConfirm(false)}
                disabled={deleting}
                className="app-btn-secondary"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="rounded-xl bg-rose-600 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-rose-700 disabled:bg-rose-400"
              >
                {deleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
