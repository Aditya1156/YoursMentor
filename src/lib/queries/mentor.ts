import { createClient } from '@/lib/supabase/server'
import type { CollegeTier, Track } from '@/lib/types'

export interface MentorApplication {
  headline: string
  story: string
  breakthroughStory: string
  currentPosition: string
  company: string
  country: string
  college: string
  collegeTier: CollegeTier | ''
  collegeLine: string
  homeState: string
  languages: string[]
  firstGenGraduate: boolean
  tracks: Track[]
  topics: string[]
  linkedinUrl: string
  idProofUrl: string
  price1on1: number
  upiId: string
  status?: 'pending' | 'approved' | 'rejected' | 'suspended'
  rejectionReason?: string
}

export const EMPTY_APPLICATION: MentorApplication = {
  headline: '', story: '', breakthroughStory: '', currentPosition: '', company: '',
  country: 'India', college: '', collegeTier: '', collegeLine: '', homeState: '',
  languages: [], firstGenGraduate: false, tracks: [], topics: [],
  linkedinUrl: '', idProofUrl: '', price1on1: 199, upiId: '',
}

/** The mentor's own application, if they have started one. */
export async function myMentorApplication(): Promise<MentorApplication | null> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data } = await supabase
    .from('mentor_profiles')
    .select('*')
    .eq('user_id', user.id)
    .maybeSingle()

  if (!data) return null
  return {
    headline: data.headline ?? '',
    story: data.story ?? '',
    breakthroughStory: data.breakthrough_story ?? '',
    currentPosition: data.current_position ?? '',
    company: data.company ?? '',
    country: data.country ?? 'India',
    college: data.college ?? '',
    collegeTier: data.college_tier ?? '',
    collegeLine: data.college_line ?? '',
    homeState: data.home_state ?? '',
    languages: data.languages ?? [],
    firstGenGraduate: !!data.first_gen_graduate,
    tracks: data.tracks ?? [],
    topics: data.topics ?? [],
    linkedinUrl: data.linkedin_url ?? '',
    idProofUrl: data.id_proof_url ?? '',
    price1on1: data.price_1on1 ?? 199,
    upiId: data.upi_id ?? '',
    status: data.status,
    rejectionReason: data.rejection_reason ?? undefined,
  }
}
