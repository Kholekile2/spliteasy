'use client'

import { useState, useEffect, useCallback } from 'react'
import { apiFetch } from '@/lib/api'
import AddExpense from './AddExpense'

interface Member {
  id: string
  full_name?: string
  fullName?: string
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
}

export default function ExpenseList({ groupId, userId, members }: Props) {
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [loading, setLoading] = useState(true)

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
  }, [fetchExpenses])

  function getMemberName(memberId: string) {
    const member = members.find(m => m.id === memberId)
    return member?.full_name ?? member?.fullName ?? 'Unknown'
  }

  const splitAmount = (amount: number) =>
    (amount / members.length).toFixed(2)

  return (
    <div className="grid gap-6">
      {/* Add expense form */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6">
        <h3 className="text-base font-semibold text-gray-900 mb-4">
          Add an expense
        </h3>
        <AddExpense
          groupId={groupId}
          userId={userId}
          members={members}
          onExpenseAdded={fetchExpenses}
        />
      </div>

      {/* Expense list */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6">
        <h3 className="text-base font-semibold text-gray-900 mb-4">
          Expenses
        </h3>

        {loading ? (
          <p className="text-sm text-gray-400 text-center py-4">
            Loading expenses...
          </p>
        ) : expenses.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-4">
            No expenses yet. Add the first one above.
          </p>
        ) : (
          <ul className="divide-y divide-gray-100">
            {expenses.map(expense => (
              <li key={expense.id} className="py-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {expense.description}
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      Paid by {getMemberName(expense.paidBy ?? expense.paid_by)}
                      {(expense.paidBy ?? expense.paid_by) === userId ? ' (you)' : ''}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-semibold text-gray-900">
                      R{expense.amount.toFixed(2)}
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      R{splitAmount(expense.amount)} / person
                    </p>
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