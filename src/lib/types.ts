/** Mirrors the Mongoose models in docs/MASTER_PROMPT.md §6, shaped for the UI. */

export type CollegeTier = 'tier1' | 'tier2' | 'tier3' | 'other'
export type Track = 'first_job' | 'abroad'

export const TRACK_LABEL: Record<Track, string> = {
  first_job: 'Track 1: First Job / Internship',
  abroad: 'Track 2: Going Abroad',
}

export const TIER_LABEL: Record<CollegeTier, string> = {
  tier1: 'Tier-1',
  tier2: 'Tier-2',
  tier3: 'Tier-3',
  other: 'Other',
}

export interface MentorSummary {
  id: string
  name: string
  avatarUrl?: string
  /** "Software Engineer at PhonePe" */
  headline: string
  company?: string
  /** "Ex-Tier 3 College (UPTU, Lucknow)" */
  collegeLine: string
  collegeTier: CollegeTier
  homeState: string
  languages: string[]
  firstGenGraduate: boolean
  tracks: Track[]
  /** The designs make this a first-class field, not part of the bio. */
  breakthroughStory: string
  topics: string[]
  price1on1: number
  session1on1Minutes: number
  ratingAvg: number
  ratingCount: number
  verified: boolean
  activeToday?: boolean
  /** Mentor is running an introductory ₹99 1:1 — renders the amber CTA. */
  trialOffer?: boolean
}

export interface GroupSessionSummary {
  id: string
  title: string
  description: string
  mentor: Pick<MentorSummary, 'id' | 'name' | 'avatarUrl'>
  mentorCompany: string
  track: Track
  startAt: string
  endAt: string
  capacity: number
  seatsBooked: number
  minSeats: number
  price: number
}

export const seatsLeft = (s: GroupSessionSummary) => s.capacity - s.seatsBooked
export const isFull = (s: GroupSessionSummary) => seatsLeft(s) <= 0
