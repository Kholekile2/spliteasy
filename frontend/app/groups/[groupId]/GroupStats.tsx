'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { apiFetch } from '@/lib/api'

interface Expense {
  amount: number
  paidBy: string
  paid_by: string
  category: string
}

interface Member {
  id: string
  fullName?: string
  full_name?: string
}

interface Props {
  groupId: string
  userId: string
  members: Member[]
}

const CATEGORY_ICONS: Record<string, string> = {
  Food: '🍔',
  Transport: '🚗',
  Accommodation: '🏠',
  Entertainment: '🎬',
  Shopping: '🛍️',
  Utilities: '💡',
  Other: '📦',
}

export default function GroupStats({ groupId, userId, members }: Props) {
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [loading, setLoading] = useState(true)
  const [show, setShow] = useState(false)

  const fetchExpenses = useCallback(async () => {
    try {
      const data = await apiFetch(`/groups/${groupId}/expenses`, userId)
      setExpenses(data)
    } catch {
      setExpenses([])
    } finally {
      setLoading(false)
    }
  }, [groupId, userId])

  useEffect(() => {
    fetchExpenses()

    const poller = window.setInterval(() => {
      fetchExpenses()
    }, 5000)

    const supabase = createClient()
    const channel = supabase
      .channel(`group-stats:${groupId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'expenses',
          filter: `group_id=eq.${groupId}`,
        },
        () => {
          fetchExpenses()
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          fetchExpenses()
        }
      })

    return () => {
      window.clearInterval(poller)
      supabase.removeChannel(channel)
    }
  }, [fetchExpenses, groupId])

  if (loading || expenses.length === 0) return null

  const totalSpent = expenses.reduce((sum, expense) => sum + expense.amount, 0)

  const memberTotals = members
    .map(member => {
      const paid = expenses
        .filter(expense => (expense.paidBy ?? expense.paid_by) === member.id)
        .reduce((sum, expense) => sum + expense.amount, 0)

      return {
        name: member.fullName ?? member.full_name ?? 'Unknown',
        paid,
        percentage: totalSpent > 0 ? (paid / totalSpent) * 100 : 0,
        isCurrentUser: member.id === userId,
      }
    })
    .filter(member => member.paid > 0)
    .sort((a, b) => b.paid - a.paid)

  const categoryTotals: Record<string, number> = {}
  expenses.forEach(expense => {
    const category = expense.category || 'Other'
    categoryTotals[category] = (categoryTotals[category] || 0) + expense.amount
  })

  const categoryEntries = Object.entries(categoryTotals).sort((a, b) => b[1] - a[1])

  return (
    <div className="app-card overflow-hidden p-5">
      <button
        type="button"
        onClick={() => setShow(!show)}
        className="flex w-full items-center justify-between gap-3 text-left"
      >
        <div>
          <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-700">
            Group stats
          </h3>
          <p className="mt-0.5 text-xs text-slate-500">
            Total spending and category breakdown
          </p>
        </div>
        <span className="text-sm text-slate-400">{show ? '▲ Hide' : '▼ Show'}</span>
      </button>

      {show && (
        <div className="mt-4 space-y-6">
          <div className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3">
            <p className="text-sm text-slate-500">Total spent</p>
            <p className="text-lg font-bold text-slate-900">R{totalSpent.toFixed(2)}</p>
          </div>

          <div>
            <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-400">
              Who paid the most
            </p>
            <div className="space-y-2">
              {memberTotals.map((member, index) => (
                <div key={index}>
                  <div className="mb-1 flex items-center justify-between gap-3">
                    <p className="text-sm text-slate-700">
                      {member.isCurrentUser ? 'You' : member.name}
                    </p>
                    <p className="text-sm font-medium text-slate-900">
                      R{member.paid.toFixed(2)}
                    </p>
                  </div>
                  <div className="h-1.5 w-full rounded-full bg-slate-100">
                    <div
                      className="h-1.5 rounded-full bg-sky-500"
                      style={{ width: `${member.percentage}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {categoryEntries.length > 0 && (
            <div>
              <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-400">
                Spending by category
              </p>
              <div className="space-y-2">
                {categoryEntries.map(([category, amount]) => (
                  <div key={category} className="flex items-center justify-between gap-3 rounded-xl bg-slate-50 px-3 py-2">
                    <div className="flex items-center gap-2">
                      <span>{CATEGORY_ICONS[category] ?? '📦'}</span>
                      <p className="text-sm text-slate-700">{category}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <p className="text-sm font-medium text-slate-900">
                        R{amount.toFixed(2)}
                      </p>
                      <p className="text-xs text-slate-400">
                        {((amount / totalSpent) * 100).toFixed(0)}%
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
