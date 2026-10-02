import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { SettingsPanels } from '@/components/settings/settings-panels'
import { MentorSettingsLink } from '@/components/settings/mentor-settings-link'
import { createClient } from '@/lib/supabase/server'
import { myMentorApplication } from '@/lib/queries/mentor'
import { getSessionUser } from '@/lib/session'

export const metadata: Metadata = { title: 'Profile and settings' }
export const dynamic = 'force-dynamic'

/** S8 — Profile and settings. */
export default async function SettingsPage() {
  const user = await getSessionUser()
  if (!user) redirect('/signin?next=/settings')

  const supabase = await createClient()
  const { data: profile } = await supabase
    .from('profiles')
    .select(
      'name, avatar_url, college, college_tier, branch, graduation_year, home_state, languages, first_gen_graduate, goals, email_preferences, deleted_at'
    )
    .eq('id', user.id)
    .single()

  const { data: { user: authUser } } = await supabase.auth.getUser()

  // A mentor edits their public profile elsewhere; this page links to it
  // rather than showing two different "save" buttons on one screen.
  const mentorProfile =
    user.role === 'mentor' || user.role === 'admin'
      ? await myMentorApplication().catch(() => null)
      : null

  return (
    <div className="container-page max-w-2xl py-8 md:py-10">
      <h1 className="text-2xl">Profile and settings</h1>
      <p className="mt-1.5 text-sm text-muted-foreground">
        What we know about you, who can see it, and how to take it back.
      </p>

      {mentorProfile && (
        <div className="mt-6">
          <MentorSettingsLink
            status={mentorProfile.status ?? 'pending'}
            company={mentorProfile.company || undefined}
            companyDomain={mentorProfile.companyDomain || undefined}
            headline={mentorProfile.headline || undefined}
            price={mentorProfile.price1on1}
          />
        </div>
      )}

      <div className="mt-6">
        <SettingsPanels
          isMentor={!!mentorProfile}
          email={authUser?.email ?? ''}
          avatarUrl={profile?.avatar_url ?? undefined}
          isGoogleOnly={
            (authUser?.app_metadata?.providers ?? []).includes('google') &&
            !(authUser?.app_metadata?.providers ?? []).includes('email')
          }
          profile={{
            name: profile?.name ?? user.name,
            college: profile?.college ?? '',
            collegeTier: profile?.college_tier ?? '',
            branch: profile?.branch ?? '',
            graduationYear: profile?.graduation_year ?? null,
            homeState: profile?.home_state ?? '',
            languages: profile?.languages ?? [],
            firstGenGraduate: !!profile?.first_gen_graduate,
            goals: profile?.goals ?? [],
          }}
          emailPreferences={
            profile?.email_preferences ?? {
              reminders: true, summaries: true, product_news: false,
            }
          }
          deletionRequestedAt={profile?.deleted_at ?? null}
        />
      </div>
    </div>
  )
}
