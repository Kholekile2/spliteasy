'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { apiFetch } from '@/lib/api'
import AddExpense from './AddExpense'

interface Member {
  id: string
  full_name: string
  fullName: string
  email: string
}

interface Expense {
  id: string
  description: string
  amount: number
  paid_by: string
  paidBy: string
  created_at: string
  createdAt: string
}

interface Props {
  groupId: string
  userId: string
  members: Member[]
  onExpenseAdded?: () => void
}

export default function ExpenseList({ groupId, userId, members, onExpenseAdded }: Props) {
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [loading, setLoading] = useState(true)
  const [expenseToDelete, setExpenseToDelete] = useState<Expense | null>(null)
  const [deleting, setDeleting] = useState(false)

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

    // Keep UI synced even if realtime events are delayed or dropped.
    const poller = window.setInterval(() => {
      fetchExpenses()
    }, 5000)

    // Subscribe to realtime changes on the expenses table
    const supabase = createClient()
    const channel = supabase
      .channel(`expenses:${groupId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'expenses',
        },
        (payload: any) => {
          const payloadGroupId =
            payload.new?.group_id ?? payload.old?.group_id ?? payload.new?.groupId ?? payload.old?.groupId
          // Only update if this expense belongs to our group
          if (payloadGroupId === groupId) {
            fetchExpenses()
            if (onExpenseAdded) onExpenseAdded()
          }
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          fetchExpenses()
        }
      })

    // Cleanup - unsubscribe when the component unmounts
    return () => {
      window.clearInterval(poller)
      supabase.removeChannel(channel)
    }
  }, [fetchExpenses, groupId, onExpenseAdded])

  async function handleDeleteExpense() {
    if (!expenseToDelete) return
    setDeleting(true)

    try {
      await apiFetch(`/groups/${groupId}/expenses/${expenseToDelete.id}`, userId, {
        method: 'DELETE',
      })
      await fetchExpenses()
      if (onExpenseAdded) onExpenseAdded()
      setExpenseToDelete(null)
    } catch (err: any) {
      alert(err.message)
    } finally {
      setDeleting(false)
    }
  }

  function getMemberName(memberId: string) {
    const member = members.find(m => m.id === memberId)
    return member?.fullName ?? member?.full_name ?? 'Unknown'
  }

  const splitAmount = (amount: number) =>
    (amount / members.length).toFixed(2)

  return (
    <div className="grid gap-6">
      <div className="app-card p-6">
        <h3 className="mb-4 text-base font-semibold text-slate-900">
          Add an expense
        </h3>
        <AddExpense
          groupId={groupId}
          userId={userId}
          members={members}
          onExpenseAdded={fetchExpenses}
        />
      </div>

      <div className="app-card p-6">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-base font-semibold text-slate-900">
            Expenses
          </h3>
          {expenses.length > 0 && (
            <div className="text-right">
              <p className="text-xs text-slate-500">Total spent</p>
              <p className="text-sm font-bold text-slate-900">
                R{expenses.reduce((sum, e) => sum + e.amount, 0).toFixed(2)}
              </p>
            </div>
          )}
        </div>

        {loading ? (
          <p className="py-4 text-center text-sm text-slate-500">
            Loading expenses...
          </p>
        ) : expenses.length === 0 ? (
          <p className="py-4 text-center text-sm text-slate-500">
            No expenses yet. Add the first one above.
          </p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {expenses.map(expense => (
              <li key={expense.id} className="py-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-slate-900">
                      {expense.description}
                    </p>
                    <p className="mt-0.5 text-xs text-slate-500">
                      Paid by {getMemberName(expense.paidBy ?? expense.paid_by)}
                      {(expense.paidBy ?? expense.paid_by) === userId ? ' (you)' : ''}
                      {' · '}
                      {expense.createdAt || expense.created_at
                        ? new Date(expense.createdAt ?? expense.created_at).toLocaleString('en-ZA', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })
                        : 'recently'}
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1 text-right">
                    <p className="text-sm font-semibold text-slate-900">
                      R{expense.amount.toFixed(2)}
                    </p>
                    <p className="text-xs text-slate-500">
                      R{splitAmount(expense.amount)} / person
                    </p>
                    <button
                      onClick={() => setExpenseToDelete(expense)}
                      className="mt-1 text-xs text-rose-400 transition-colors hover:text-rose-600"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {expenseToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/35 px-4 backdrop-blur-sm">
          <div className="app-card w-full max-w-md p-6">
            <h4 className="text-base font-semibold text-slate-900">
              Delete expense?
            </h4>
            <p className="mt-2 text-sm text-slate-600">
              You are about to delete "{expenseToDelete.description}". This action cannot be undone.
            </p>

            <div className="mt-5 flex justify-end gap-3">
              <button
                onClick={() => setExpenseToDelete(null)}
                disabled={deleting}
                className="app-btn-secondary"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteExpense}
                disabled={deleting}
                className="rounded-xl bg-rose-600 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-rose-700 disabled:bg-rose-400"
              >
                {deleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}