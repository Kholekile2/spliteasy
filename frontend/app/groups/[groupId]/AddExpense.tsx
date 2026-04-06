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
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Description
        </label>
        <input
          type="text"
          value={description}
          onChange={e => setDescription(e.target.value)}
          required
          className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          placeholder="e.g. Dinner, Groceries, Petrol"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Amount (R)
        </label>
        <input
          type="number"
          value={amount}
          onChange={e => setAmount(e.target.value)}
          required
          min="0.01"
          step="0.01"
          className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          placeholder="0.00"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Paid by
        </label>
        <select
          value={paidBy}
          onChange={e => setPaidBy(e.target.value)}
          className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
        >
          {members.map(member => (
            <option key={member.id} value={member.id}>
              {(member.full_name ?? member.fullName ?? member.email)} {member.id === userId ? '(you)' : ''}
            </option>
          ))}
        </select>
      </div>

      {error && (
        <div className="bg-red-50 text-red-600 text-sm px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={loading}
        className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium py-2.5 rounded-lg text-sm transition-colors"
      >
        {loading ? 'Adding...' : 'Add expense'}
      </button>
    </form>
  )
}