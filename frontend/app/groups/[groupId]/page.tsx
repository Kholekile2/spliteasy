import { createClient } from '@/lib/supabase/server'
import { apiFetch } from '@/lib/api'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import InviteMember from './InviteMember'
import ExpenseList from './ExpenseList'
import SettlementSummary from './SettlementSummary'
import MembersList from './MembersList'
import GroupActions from '@/app/groups/[groupId]/GroupActions'
import GroupRealtimeSync from './GroupRealtimeSync'

interface Props {
  params: { groupId: string }
}

export default async function GroupPage({ params }: Props) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { groupId } = params

  let group
  let members

  try {
    [group, members] = await Promise.all([
      apiFetch(`/groups/${groupId}`, user.id),
      apiFetch(`/groups/${groupId}/members`, user.id),
    ])
  } catch (error: any) {
    const message = error?.message ?? ''

    if (
      message === 'Forbidden.' ||
      message.includes('Forbidden') ||
      message === 'Group not found.'
    ) {
      redirect('/dashboard')
    }

    throw error
  }

  return (
    <div className="app-shell">
      <nav className="app-nav">
        <div className="app-wrap flex items-center justify-between py-4">
          <div className="flex items-center gap-4">
            <Link
              href="/dashboard"
              className="flex items-center gap-1 text-sm text-slate-500 transition-colors hover:text-slate-700"
            >
              {'<'} Dashboard
            </Link>
            <div className="h-4 w-px bg-slate-200" />
            <div className="flex items-center gap-2">
              <div className="brand-mark">
                <span>S</span>
              </div>
              <span className="brand-name">SplitEasy</span>
            </div>
          </div>
        </div>
      </nav>

      <main className="app-wrap py-10">
        <GroupRealtimeSync groupId={groupId} userId={user.id} />

        <div className="mb-8 flex items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-sky-100">
              <span className="text-lg font-bold text-sky-600">
                {group.name?.[0]?.toUpperCase() ?? 'G'}
              </span>
            </div>
            <div>
              <h1 className="app-title">{group.name}</h1>
              <p className="mt-0.5 text-sm text-slate-500">
                {members.length} member{members.length !== 1 ? 's' : ''}
              </p>
            </div>
          </div>
          <GroupActions
            groupId={groupId}
            userId={user.id}
            createdBy={group.createdBy ?? group.created_by}
          />
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
          <div className="grid gap-4 self-start min-w-0 lg:col-span-2">
            <div className="app-card overflow-hidden p-5">
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-700">
                Members
              </h2>
              <MembersList
                groupId={groupId}
                userId={user.id}
                initialMembers={members}
              />
            </div>

            <div className="app-card overflow-hidden p-5">
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-700">
                Invite member
              </h2>
              <InviteMember groupId={groupId} userId={user.id} />
            </div>
          </div>

          <div className="grid min-w-0 gap-4 lg:col-span-3">
            <SettlementSummary groupId={groupId} userId={user.id} />
            <ExpenseList groupId={groupId} userId={user.id} members={members} />
          </div>
        </div>
      </main>
    </div>
  )
}