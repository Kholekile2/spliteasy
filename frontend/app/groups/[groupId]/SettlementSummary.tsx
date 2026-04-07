'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { apiFetch } from '@/lib/api'

interface Settlement {
  fromUserId: string
  toUserId: string
  fromUserName: string
  toUserName: string
  amount: number
}

interface SettlementHistoryItem extends Settlement {
  settledAt: string | null
}

interface Props {
  groupId: string
  userId: string
}

export default function SettlementSummary({ groupId, userId }: Props) {
  const [settlements, setSettlements] = useState<Settlement[]>([])
  const [history, setHistory] = useState<SettlementHistoryItem[]>([])
  const [loading, setLoading] = useState(true)
  const [settling, setSettling] = useState<string | null>(null)
  const refreshTimerRef = useRef<number | null>(null)

  const fetchSettlements = useCallback(async () => {
    try {
      const [currentSettlements, settlementHistory] = await Promise.all([
        apiFetch(`/groups/${groupId}/settlements`, userId),
        apiFetch(`/groups/${groupId}/settlements/history`, userId),
      ])

      setSettlements(currentSettlements)
      setHistory(settlementHistory)
    } catch {
      setSettlements([])
      setHistory([])
    } finally {
      setLoading(false)
    }
  }, [groupId, userId])

  useEffect(() => {
    fetchSettlements()

    // Fallback polling keeps settlements synced if realtime misses events.
    const poller = window.setInterval(() => {
      fetchSettlements()
    }, 5000)

    const scheduleRefresh = () => {
      if (refreshTimerRef.current) {
        window.clearTimeout(refreshTimerRef.current)
      }

      refreshTimerRef.current = window.setTimeout(() => {
        fetchSettlements()
      }, 250)
    }

    const supabase = createClient()
    const channel = supabase
      .channel(`settlements:${groupId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'expenses',
        },
        (payload: any) => {
          const payloadGroupId = payload.new?.group_id || payload.old?.group_id
          if (payloadGroupId === groupId) {
            scheduleRefresh()
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'expense_splits',
        },
        () => {
          // Splits are part of the debt calculation; refresh when they change.
          scheduleRefresh()
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'settlements',
        },
        (payload: any) => {
          const payloadGroupId = payload.new?.group_id || payload.old?.group_id
          if (payloadGroupId === groupId) {
            scheduleRefresh()
          }
        }
      )
      .subscribe((status: string) => {
        console.log('Settlement realtime status:', status)
        if (status === 'SUBSCRIBED') {
          fetchSettlements()
        }
      })

    return () => {
      window.clearInterval(poller)
      if (refreshTimerRef.current) {
        window.clearTimeout(refreshTimerRef.current)
      }
      supabase.removeChannel(channel)
    }
  }, [fetchSettlements, groupId])

  async function handleSettle(settlement: Settlement) {
    const key = `${settlement.fromUserId}-${settlement.toUserId}`
    setSettling(key)

    try {
      await apiFetch(`/groups/${groupId}/settle`, userId, {
        method: 'POST',
        body: JSON.stringify({
          fromUser: settlement.fromUserId,
          toUser: settlement.toUserId,
          amount: settlement.amount,
        }),
      })

      await fetchSettlements()
    } catch (err: any) {
      alert(err.message)
    } finally {
      setSettling(null)
    }
  }

  if (loading) {
    return (
      <div className="app-card p-6">
        <h3 className="mb-4 text-base font-semibold text-slate-900">
          Settlement summary
        </h3>
        <p className="py-4 text-center text-sm text-slate-500">
          Calculating...
        </p>
      </div>
    )
  }

  if (settlements.length === 0) {
    return (
      <div className="app-card p-6">
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-base font-semibold text-slate-900">
            Settlement summary
          </h3>
          <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700">
            All settled
          </span>
        </div>
        <div className="py-4 text-center">
          <p className="text-sm font-medium text-emerald-600">
            All settled up!
          </p>
          <p className="mt-1 text-xs text-slate-500">
            No outstanding debts in this group.
          </p>
        </div>

        <div className="mt-4 border-t border-slate-100 pt-4">
          <h4 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-700">
            Recent settlements
          </h4>

          {history.length === 0 ? (
            <p className="py-3 text-center text-sm text-slate-500">
              No settlement history yet.
            </p>
          ) : (
            <ul className="space-y-3">
              {history.map((item, index) => (
                <li key={`${item.fromUserId}-${item.toUserId}-${item.settledAt ?? index}`} className="flex gap-3">
                  <div className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-xs font-semibold text-emerald-700">
                    ✓
                  </div>
                  <div className="min-w-0 flex-1 rounded-2xl bg-slate-50 px-3 py-2.5">
                    <p className="text-sm text-slate-900">
                      <span className="font-medium">
                        {item.fromUserId === userId ? 'You' : item.fromUserName}
                      </span>{' '}
                      settled with{' '}
                      <span className="font-medium">
                        {item.toUserId === userId ? 'you' : item.toUserName}
                      </span>
                    </p>
                    <div className="mt-1 flex items-center justify-between gap-3 text-xs text-slate-500">
                      <span>R{item.amount.toFixed(2)}</span>
                      <span>
                        {item.settledAt
                          ? new Date(item.settledAt).toLocaleString('en-ZA', {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })
                          : 'recently'}
                      </span>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="app-card p-6">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-base font-semibold text-slate-900">
          Settlement summary
        </h3>
        <span className="rounded-full bg-sky-50 px-2.5 py-1 text-xs font-medium text-sky-700">
          {settlements.length} open
        </span>
      </div>
      <ul className="divide-y divide-slate-100">
        {settlements.map((s, index) => {
          const key = `${s.fromUserId}-${s.toUserId}`
          const isMyDebt = s.fromUserId === userId

          return (
            <li key={index} className="py-4 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-rose-100 text-sm font-medium text-rose-600">
                  {s.fromUserName?.[0]?.toUpperCase() ?? '?'}
                </div>
                <div>
                  <p className="text-sm text-slate-900">
                    <span className="font-medium">
                      {s.fromUserId === userId ? 'You' : s.fromUserName}
                    </span>
                    {' '}owe{s.fromUserId === userId ? '' : 's'}{' '}
                    <span className="font-medium">
                      {s.toUserId === userId ? 'you' : s.toUserName}
                    </span>
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 shrink-0">
                <span className="text-sm font-semibold text-rose-600">
                  R{s.amount.toFixed(2)}
                </span>
                {isMyDebt && (
                  <button
                    onClick={() => handleSettle(s)}
                    disabled={settling === key}
                    className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-emerald-700 disabled:bg-emerald-400"
                  >
                    {settling === key ? 'Settling...' : 'Settle up'}
                  </button>
                )}
              </div>
            </li>
          )
        })}
      </ul>

      <div className="mt-5 border-t border-slate-100 pt-4">
        <h4 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-700">
          Recent settlements
        </h4>

        {history.length === 0 ? (
          <p className="py-3 text-center text-sm text-slate-500">
            No settlement history yet.
          </p>
        ) : (
          <ul className="space-y-3">
            {history.map((item, index) => (
              <li key={`${item.fromUserId}-${item.toUserId}-${item.settledAt ?? index}`} className="flex gap-3">
                <div className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-xs font-semibold text-emerald-700">
                  ✓
                </div>
                <div className="min-w-0 flex-1 rounded-2xl bg-slate-50 px-3 py-2.5">
                  <p className="text-sm text-slate-900">
                    <span className="font-medium">
                      {item.fromUserId === userId ? 'You' : item.fromUserName}
                    </span>{' '}
                    settled with{' '}
                    <span className="font-medium">
                      {item.toUserId === userId ? 'you' : item.toUserName}
                    </span>
                  </p>
                  <div className="mt-1 flex items-center justify-between gap-3 text-xs text-slate-500">
                    <span>R{item.amount.toFixed(2)}</span>
                    <span>
                      {item.settledAt
                        ? new Date(item.settledAt).toLocaleString('en-ZA', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })
                        : 'recently'}
                    </span>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}