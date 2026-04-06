import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export default async function DashboardPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, email')
    .eq('id', user.id)
    .single()

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
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900">
            Welcome, {profile?.full_name ?? user.email}
          </h2>
          <p className="text-gray-500 mt-1">
            Here are all your groups and balances.
          </p>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 p-8 text-center">
          <p className="text-gray-400 text-sm">
            You have no groups yet. Creating groups is coming in Phase 3.
          </p>
        </div>
      </main>
    </div>
  )
}