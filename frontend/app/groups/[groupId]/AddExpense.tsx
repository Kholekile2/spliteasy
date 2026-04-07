'use client'

import { useState } from 'react'
import { apiFetch } from '@/lib/api'

interface Member {
  id: string
  full_name?: string
  fullName?: string
  email: string
}

interface Props {
  groupId: string
  userId: string
  members: Member[]
  onExpenseAdded: () => void
}

export default function AddExpense({ groupId, userId, members, onExpenseAdded }: Props) {
  const [description, setDescription] = useState('')
  const [amount, setAmount] = useState('')
  const [paidBy, setPaidBy] = useState(userId)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const parsedAmount = parseFloat(amount)
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      setError('Please enter a valid amount greater than zero.')
      setLoading(false)
      return
    }

    try {
      await apiFetch(`/groups/${groupId}/expenses`, userId, {
        method: 'POST',
        body: JSON.stringify({
          description,
          amount: parsedAmount,
          paidBy,
        }),
      })

      setDescription('')
      setAmount('')
      setPaidBy(userId)
      onExpenseAdded()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="mb-1 block text-sm font-medium text-slate-700">
          Description
        </label>
        <input
          type="text"
          value={description}
          onChange={e => setDescription(e.target.value)}
          required
          className="app-input"
          placeholder="e.g. Dinner, Groceries, Petrol"
        />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-slate-700">
          Amount (R)
        </label>
        <input
          type="number"
          value={amount}
          onChange={e => setAmount(e.target.value)}
          required
          min="0.01"
          step="0.01"
          className="app-input"
          placeholder="0.00"
        />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-slate-700">
          Paid by
        </label>
        <select
          value={paidBy}
          onChange={e => setPaidBy(e.target.value)}
          className="app-select"
        >
          {members.map(member => (
            <option key={member.id} value={member.id}>
              {(member.full_name ?? member.fullName ?? member.email)} {member.id === userId ? '(you)' : ''}
            </option>
          ))}
        </select>
      </div>

      {error && (
        <div className="rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-600">
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={loading}
        className="app-btn-primary w-full"
      >
        {loading ? 'Adding...' : 'Add expense'}
      </button>
    </form>
  )
}