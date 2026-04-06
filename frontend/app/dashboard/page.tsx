import { createClient } from '@/lib/supabase/server'
import { apiFetch } from '@/lib/api'
import { redirect } from 'next/navigation'
import Link from 'next/link'

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

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <h1 className="text-lg font-bold text-gray-900">SplitEasy</h1>
          <form action="/auth/signout" method="post">
            <button
              type="submit"
              className="text-sm text-gray-500 hover:text-gray-700 font-medium transition-colors"
            >
              Log out
            </button>
          </form>
        </div>
      </nav>

      <main className="max-w-4xl mx-auto px-6 py-10">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">
              Welcome, {profile?.full_name ?? user.email}
            </h2>
            <p className="text-gray-500 mt-1">
              {groups.length === 0
                ? 'You have no groups yet.'
                : `You are in ${groups.length} group${groups.length !== 1 ? 's' : ''}.`}
            </p>
          </div>
          <Link
            href="/groups/new"
            className="bg-blue-600 hover:bg-blue-700 text-white font-medium px-5 py-2.5 rounded-lg text-sm transition-colors"
          >
            New group
          </Link>
        </div>

        {groups.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-200 p-8 text-center">
            <p className="text-gray-900 font-medium mb-1">No groups yet</p>
            <p className="text-gray-400 text-sm mb-4">
              Create a group to start splitting expenses with friends.
            </p>
            <Link
              href="/groups/new"
              className="inline-block bg-blue-600 hover:bg-blue-700 text-white font-medium px-5 py-2.5 rounded-lg text-sm transition-colors"
            >
              Create your first group
            </Link>
          </div>
        ) : (
          <div className="grid gap-4">
            {groups.map((group: any) => (
              <Link
                key={group.id}
                href={`/groups/${group.id}`}
                className="bg-white rounded-2xl border border-gray-200 p-6 flex items-center justify-between hover:border-blue-300 hover:shadow-sm transition-all"
              >
                <div>
                  <p className="font-semibold text-gray-900">{group.name}</p>
                  <p className="text-sm text-gray-400 mt-0.5">
                    Created {group.created_at ? new Date(group.created_at).toLocaleDateString() : 'recently'}
                  </p>
                </div>
                <span className="text-gray-300 text-lg">→</span>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}