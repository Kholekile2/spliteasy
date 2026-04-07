import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import DeleteAccount from './DeleteAccount'

export default async function SettingsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, email')
    .eq('id', user.id)
    .single()

  return (
    <div className="app-shell">
      <nav className="app-nav">
        <div className="app-wrap flex items-center gap-4 py-4">
          <Link
            href="/dashboard"
            className="text-sm text-slate-500 transition-colors hover:text-slate-700"
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
      </nav>

      <main className="app-wrap py-10">
        <div className="max-w-lg">
          <div className="mb-8">
            <h1 className="app-title">Settings</h1>
            <p className="app-subtitle">
              Manage your account preferences.
            </p>
          </div>

          <div className="app-card mb-4 p-6">
            <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-slate-700">
              Profile
            </h2>
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-sky-100">
                <span className="text-lg font-bold text-sky-600">
                  {profile?.full_name?.[0]?.toUpperCase() ?? '?'}
                </span>
              </div>
              <div>
                <p className="font-semibold text-slate-900">{profile?.full_name}</p>
                <p className="text-sm text-slate-500">{profile?.email}</p>
              </div>
            </div>
          </div>

          <div className="app-card border-rose-200 p-6">
            <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-rose-600">
              Danger zone
            </h2>
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-slate-900">Delete account</p>
                <p className="mt-0.5 text-xs text-slate-500">
                  Permanently delete your account and all your data. This cannot be undone.
                </p>
              </div>
              <DeleteAccount userId={user.id} />
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
