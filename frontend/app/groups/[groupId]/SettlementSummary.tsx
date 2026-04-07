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

interface Props {
  groupId: string
  userId: string
}

export default function SettlementSummary({ groupId, userId }: Props) {
  const [settlements, setSettlements] = useState<Settlement[]>([])
  const [loading, setLoading] = useState(true)
  const [settling, setSettling] = useState<string | null>(null)
  const refreshTimerRef = useRef<number | null>(null)

  const fetchSettlements = useCallback(async () => {
    try {
      const data = await apiFetch(`/groups/${groupId}/settlements`, userId)
      setSettlements(data)
    } catch {
      setSettlements([])
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
      <div className="bg-white rounded-2xl border border-gray-200 p-6">
        <h3 className="text-base font-semibold text-gray-900 mb-4">
          Settlement summary
        </h3>
        <p className="text-sm text-gray-400 text-center py-4">
          Calculating...
        </p>
      </div>
    )
  }

  if (settlements.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-gray-200 p-6">
        <h3 className="text-base font-semibold text-gray-900 mb-4">
          Settlement summary
        </h3>
        <div className="text-center py-4">
          <p className="text-sm font-medium text-green-600">
            All settled up!
          </p>
          <p className="text-xs text-gray-400 mt-1">
            No outstanding debts in this group.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-6">
      <h3 className="text-base font-semibold text-gray-900 mb-4">
        Settlement summary
      </h3>
      <ul className="divide-y divide-gray-100">
        {settlements.map((s, index) => {
          const key = `${s.fromUserId}-${s.toUserId}`
          const isMyDebt = s.fromUserId === userId

          return (
            <li key={index} className="py-4 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center text-red-600 text-sm font-medium shrink-0">
                  {s.fromUserName?.[0]?.toUpperCase() ?? '?'}
                </div>
                <div>
                  <p className="text-sm text-gray-900">
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
                <span className="text-sm font-semibold text-red-600">
                  R{s.amount.toFixed(2)}
                </span>
                {isMyDebt && (
                  <button
                    onClick={() => handleSettle(s)}
                    disabled={settling === key}
                    className="bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white text-xs font-medium px-3 py-1.5 rounded-lg transition-colors"
                  >
                    {settling === key ? 'Settling...' : 'Settle up'}
                  </button>
                )}
              </div>
            </li>
          )
        })}
      </ul>
    </div>
  )
}