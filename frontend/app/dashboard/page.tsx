import { createClient } from '@/lib/supabase/server'
import { apiFetch } from '@/lib/api'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import DashboardRealtimeSync from './DashboardRealtimeSync'
import LogoutButton from './LogoutButton'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, email')
    .eq('id', user.id)
    .single()

  let groups: any[] = []
  try {
    groups = await apiFetch('/groups', user.id)
  } catch {
    groups = []
  }

  const firstName = profile?.full_name?.split(' ')[0] ?? 'there'

  function formatGroupCreatedDate(group: any) {
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

  return (
    <div className="app-shell">
      <nav className="app-nav">
        <div className="app-wrap flex items-center justify-between py-4">
          <div className="flex items-center gap-2">
            <div className="brand-mark">
              <span>S</span>
            </div>
            <span className="brand-name">SplitEasy</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="hidden text-sm text-slate-500 sm:block">
              {profile?.email}
            </span>
            <Link
              href="/settings"
              className="text-sm font-medium text-slate-500 transition-colors hover:text-slate-700"
            >
              Settings
            </Link>
            <LogoutButton />
          </div>
        </div>
      </nav>

      <main className="app-wrap py-10">
        <DashboardRealtimeSync userId={user.id} />

        <div className="flex items-start justify-between mb-8">
          <div>
            <h1 className="app-title">
              Hey, {firstName}
            </h1>
            <p className="app-subtitle">
              {groups.length === 0
                ? "You haven't joined any groups yet."
                : `You're in ${groups.length} group${groups.length !== 1 ? 's' : ''}.`}
            </p>
          </div>
          <Link
            href="/groups/new"
            className="app-btn-primary shrink-0"
          >
            New group
          </Link>
        </div>

        {groups.length === 0 ? (
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
        ) : (
          <div className="grid gap-3">
            {groups.map((group: any) => (
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
        )}
      </main>
    </div>
  )
}