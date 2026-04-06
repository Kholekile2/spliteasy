import { createClient } from '@/lib/supabase/server'
import { apiFetch } from '@/lib/api'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import InviteMember from './InviteMember'

interface Props {
  params: { groupId: string }
}

export default async function GroupPage({ params }: Props) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { groupId } = params

  // Fetch group details and members in parallel
  const [group, members] = await Promise.all([
    apiFetch(`/groups/${groupId}`, user.id),
    apiFetch(`/groups/${groupId}/members`, user.id),
  ])

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center gap-4">
          <Link href="/dashboard" className="text-gray-400 hover:text-gray-600 text-sm">
            ← Back to dashboard
          </Link>
          <h1 className="text-lg font-bold text-gray-900">SplitEasy</h1>
        </div>
      </nav>

      <main className="max-w-4xl mx-auto px-6 py-10">
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900">{group.name}</h2>
          <p className="text-gray-500 mt-1">{members.length} member{members.length !== 1 ? 's' : ''}</p>
        </div>

        <div className="grid gap-6">
          {/* Members list */}
          <div className="bg-white rounded-2xl border border-gray-200 p-6">
            <h3 className="text-base font-semibold text-gray-900 mb-4">Members</h3>
            <ul className="divide-y divide-gray-100">
              {members.map((member: any) => (
                <li key={member.id} className="py-3 flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 text-sm font-medium">
                    {member.full_name?.[0]?.toUpperCase() ?? '?'}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">{member.full_name}</p>
                    <p className="text-xs text-gray-400">{member.email}</p>
                  </div>
                  {member.id === user.id && (
                    <span className="ml-auto text-xs text-gray-400">You</span>
                  )}
                </li>
              ))}
            </ul>
          </div>

          {/* Invite member */}
          <div className="bg-white rounded-2xl border border-gray-200 p-6">
            <h3 className="text-base font-semibold text-gray-900 mb-4">Invite a member</h3>
            <InviteMember groupId={groupId} userId={user.id} />
          </div>

          {/* Expenses placeholder */}
          <div className="bg-white rounded-2xl border border-gray-200 p-8 text-center">
            <p className="text-gray-400 text-sm">
              No expenses yet. Adding expenses is coming in Phase 4.
            </p>
          </div>
        </div>
      </main>
    </div>
  )
}
