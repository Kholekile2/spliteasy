'use client'

import { useState, useEffect } from 'react'
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

  useEffect(() => {
    async function fetchSettlements() {
      try {
        const data = await apiFetch(`/groups/${groupId}/settlements`, userId)
        setSettlements(data)
      } catch {
        setSettlements([])
      } finally {
        setLoading(false)
      }
    }

    fetchSettlements()
  }, [groupId, userId])

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
        {settlements.map((s, index) => (
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
            <span className="text-sm font-semibold text-red-600 shrink-0">
              R{s.amount.toFixed(2)}
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}