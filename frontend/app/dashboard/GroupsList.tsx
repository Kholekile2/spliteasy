'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { apiFetch } from '@/lib/api'

interface GroupCard {
  id: string
  name: string
  createdAt?: string
  created_at?: string
}

interface Props {
  userId: string
  initialGroups: GroupCard[]
}

export default function GroupsList({ userId, initialGroups }: Props) {
  const [groups, setGroups] = useState<GroupCard[]>(initialGroups)

  const fetchGroups = useCallback(async () => {
    try {
      const data = await apiFetch('/groups', userId)
      setGroups(data)
    } catch {
      setGroups([])
    }
  }, [userId])

  useEffect(() => {
    fetchGroups()

    const poller = window.setInterval(() => {
      fetchGroups()
    }, 5000)

    const supabase = createClient()
    const channel = supabase
      .channel(`dashboard-groups:${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'group_members',
        },
        (payload: { new?: { user_id?: string }; old?: { user_id?: string } }) => {
          const affectedUserId = payload.new?.user_id ?? payload.old?.user_id
          if (affectedUserId === userId) {
            fetchGroups()
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'groups',
        },
        () => {
          fetchGroups()
        }
      )
      .subscribe((status: string) => {
        if (status === 'SUBSCRIBED') {
          fetchGroups()
        }
      })

    return () => {
      window.clearInterval(poller)
      supabase.removeChannel(channel)
    }
  }, [fetchGroups, userId])

  function formatGroupCreatedDate(group: GroupCard) {
    const raw = group.createdAt ?? group.created_at
    if (!raw) return 'recently'

    const parsed = new Date(raw)
    if (Number.isNaN(parsed.getTime()) || parsed.getFullYear() < 2000) {
      return 'recently'
    }

    return parsed.toLocaleDateString('en-ZA', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    })
  }

  if (groups.length === 0) {
    return (
      <div className="app-card p-12 text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-sky-50">
          <svg className="h-8 w-8 text-sky-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </div>
        <h2 className="mb-1 text-lg font-semibold text-slate-900">
          No groups yet
        </h2>
        <p className="mx-auto mb-6 max-w-xs text-sm text-slate-500">
          Create a group to start splitting expenses with friends, housemates, or travel buddies.
        </p>
        <Link
          href="/groups/new"
          className="app-btn-primary inline-block"
        >
          Create your first group
        </Link>
      </div>
    )
  }

  return (
    <div className="grid gap-3">
      {groups.map(group => (
        <Link
          key={group.id}
          href={`/groups/${group.id}`}
          className="app-card group flex items-center justify-between p-5 transition-all hover:-translate-y-0.5 hover:border-sky-300"
        >
          <div className="flex items-center gap-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-sky-50">
              <span className="text-sm font-semibold text-sky-600">
                {group.name?.[0]?.toUpperCase() ?? 'G'}
              </span>
            </div>
            <div>
              <p className="font-semibold text-slate-900">{group.name}</p>
              <p className="mt-0.5 text-sm text-slate-500">
                {formatGroupCreatedDate(group)}
              </p>
            </div>
          </div>
          <span className="text-lg text-slate-300 transition-colors group-hover:text-sky-400">{'>'}</span>
        </Link>
      ))}
    </div>
  )
}