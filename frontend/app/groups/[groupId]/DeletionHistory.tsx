'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { apiFetch } from '@/lib/api'

interface DeletionRecord {
  expenseDescription: string
  expenseAmount: number
  deletedByName: string
  deletedByCurrentUser: boolean
  deletedAt: string
}

interface Props {
  groupId: string
  userId: string
}

export default function DeletionHistory({ groupId, userId }: Props) {
  const [history, setHistory] = useState<DeletionRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [show, setShow] = useState(false)

  const fetchHistory = useCallback(async () => {
    try {
      const data = await apiFetch(`/groups/${groupId}/deletion-history`, userId)
      setHistory(data)
    } catch {
      setHistory([])
    } finally {
      setLoading(false)
    }
  }, [groupId, userId])

  useEffect(() => {
    fetchHistory()

    // Fallback polling keeps the history current even if realtime is delayed.
    const poller = window.setInterval(() => {
      fetchHistory()
    }, 5000)

    const supabase = createClient()
    const channel = supabase
      .channel(`deletion-history:${groupId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'deletion_history',
          filter: `group_id=eq.${groupId}`,
        },
        () => {
          fetchHistory()
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          fetchHistory()
        }
      })

    return () => {
      window.clearInterval(poller)
      supabase.removeChannel(channel)
    }
  }, [fetchHistory, groupId])

  if (loading) {
    return (
      <div className="app-card p-6">
        <h3 className="mb-4 text-base font-semibold text-slate-900">
          Deleted expenses
        </h3>
        <p className="py-4 text-center text-sm text-slate-500">
          Loading deleted expense history...
        </p>
      </div>
    )
  }

  if (history.length === 0) return null

  return (
    <div className="app-card p-6">
      <button
        onClick={() => setShow(!show)}
        className="flex w-full items-center justify-between gap-3 text-left"
      >
        <div>
          <h3 className="text-base font-semibold text-slate-900">
            Deleted expenses
          </h3>
          <p className="mt-0.5 text-xs text-slate-500">
            {history.length} deleted expense{history.length !== 1 ? 's' : ''} recorded
          </p>
        </div>
        <span className="rounded-full bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-500">
          {show ? 'Hide' : 'Show'}
        </span>
      </button>

      {show && (
        <ul className="mt-4 divide-y divide-slate-100 border-t border-slate-100">
          {history.map((record, index) => (
            <li key={index} className="flex items-start justify-between gap-4 py-3">
              <div>
                <p className="text-sm font-medium text-slate-900 line-through decoration-rose-300 decoration-2 decoration-dashed">
                  {record.expenseDescription}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  Deleted by <span className="font-medium text-slate-700">
                    {record.deletedByCurrentUser ? 'you' : record.deletedByName}
                  </span>
                  {record.deletedAt && (
                    <span>
                      {' '}
                      ·{' '}
                      {new Date(record.deletedAt).toLocaleString('en-ZA', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  )}
                </p>
              </div>
              <span className="shrink-0 text-sm font-semibold text-slate-400 line-through decoration-rose-300 decoration-2 decoration-dashed">
                R{record.expenseAmount.toFixed(2)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
