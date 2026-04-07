'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

interface Props {
  groupId: string
  userId: string
}

export default function GroupRealtimeSync({ groupId, userId }: Props) {
  const router = useRouter()

  useEffect(() => {
    const supabase = createClient()

    const membersChannel = supabase
      .channel(`group-members:${groupId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'group_members',
          filter: `group_id=eq.${groupId}`,
        },
        (payload: any) => {
          const affectedUser = payload.new?.user_id ?? payload.old?.user_id

          // If this user was removed (left or kicked), move them out immediately.
          if (payload.eventType === 'DELETE' && affectedUser === userId) {
            router.push('/dashboard')
            router.refresh()
            return
          }

          // Otherwise refresh member-dependent UI for everyone still in the group.
          router.refresh()
        }
      )
      .subscribe()

    const groupChannel = supabase
      .channel(`group:${groupId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'groups',
          filter: `id=eq.${groupId}`,
        },
        (payload: any) => {
          if (payload.eventType === 'DELETE') {
            router.push('/dashboard')
            router.refresh()
            return
          }

          router.refresh()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(membersChannel)
      supabase.removeChannel(groupChannel)
    }
  }, [groupId, router, userId])

  return null
}
