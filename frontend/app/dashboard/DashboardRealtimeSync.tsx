'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

interface Props {
  userId: string
}

export default function DashboardRealtimeSync({ userId }: Props) {
  const router = useRouter()

  useEffect(() => {
    const supabase = createClient()

    const channel = supabase
      .channel(`dashboard-sync:${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'group_members',
        },
        (payload: any) => {
          const affectedUser = payload.new?.user_id ?? payload.old?.user_id
          if (affectedUser === userId) {
            router.refresh()
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [userId, router])

  return null
}
