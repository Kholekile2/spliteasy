'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { apiFetch } from '@/lib/api'

interface Member {
  id: string
  fullName?: string
  full_name?: string
  email: string
}

interface Props {
  groupId: string
  userId: string
  initialMembers: Member[]
}

interface GroupMemberChangePayload {
  new?: { group_id?: string }
  old?: { group_id?: string }
}

export default function MembersList({ groupId, userId, initialMembers }: Props) {
  const [members, setMembers] = useState<Member[]>(initialMembers)

  const fetchMembers = useCallback(async () => {
    try {
      const data = await apiFetch(`/groups/${groupId}/members`, userId)
      setMembers(data)
    } catch {
      // keep existing members on error
    }
  }, [groupId, userId])

  useEffect(() => {
    fetchMembers()

    const poller = window.setInterval(() => {
      fetchMembers()
    }, 5000)

    const supabase = createClient()
    const channel = supabase
      .channel(`members:${groupId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'group_members',
        },
        (payload: GroupMemberChangePayload) => {
          const payloadGroupId =
            payload.new?.group_id || payload.old?.group_id
          if (payloadGroupId === groupId) {
            fetchMembers()
          }
        }
      )
      .subscribe((status: string) => {
        if (status === 'SUBSCRIBED') {
          fetchMembers()
        }
      })

    return () => {
      window.clearInterval(poller)
      supabase.removeChannel(channel)
    }
  }, [fetchMembers, groupId])

  return (
    <ul className="space-y-2 min-w-0">
      {members.map(member => (
        <li
          key={member.id}
          className={`flex min-w-0 items-center gap-3 overflow-hidden rounded-2xl border px-3 py-2.5 transition-colors ${
            member.id === userId
              ? 'border-sky-200 bg-sky-50/80'
              : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
          }`}
        >
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-sky-100 text-sm font-semibold text-sky-700 ring-4 ring-sky-50">
            {(member.fullName ?? member.full_name)?.[0]?.toUpperCase() ?? '?'}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-slate-900">
              {member.fullName ?? member.full_name}
            </p>
            <p className="break-all text-xs text-slate-500">{member.email}</p>
          </div>
          {member.id === userId && (
            <span className="ml-1 shrink-0 rounded-full bg-sky-100 px-2.5 py-1 text-xs font-medium text-sky-700">
              You
            </span>
          )}
        </li>
      ))}
    </ul>
  )
}