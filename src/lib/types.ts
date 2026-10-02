/** Mirrors the database. snake_case comes off Supabase; the UI uses these. */

export type CollegeTier = 'tier1' | 'tier2' | 'tier3' | 'other'
export type Track = 'first_job' | 'abroad'
export type SessionType = 'one_on_one' | 'group'
export type SessionStatus = 'scheduled' | 'live' | 'completed' | 'cancelled'
export type BookingStatus =
  | 'held' | 'confirmed' | 'attended' | 'no_show_student'
  | 'cancelled_by_student' | 'cancelled_by_mentor' | 'cancelled_auto' | 'refunded'

export const TRACK_LABEL: Record<Track, string> = {
  first_job: 'First Job / Internship',
  abroad: 'Going Abroad',
}
export const TRACK_LONG: Record<Track, string> = {
  first_job: 'Track 1: First Job / Internship',
  abroad: 'Track 2: Going Abroad',
}
export const TIER_LABEL: Record<CollegeTier, string> = {
  tier1: 'Tier-1', tier2: 'Tier-2', tier3: 'Tier-3', other: 'Other',
}

/** What a booking's status means to the person reading it. */
export const BOOKING_LABEL: Record<BookingStatus, { label: string; tone: 'green' | 'amber' | 'neutral' | 'danger' | 'indigo' }> = {
  held:                 { label: 'Payment pending', tone: 'amber' },
  confirmed:            { label: 'Confirmed',       tone: 'green' },
  attended:             { label: 'Attended',        tone: 'indigo' },
  no_show_student:      { label: 'Missed',          tone: 'neutral' },
  cancelled_by_student: { label: 'You cancelled',   tone: 'neutral' },
  cancelled_by_mentor:  { label: 'Mentor cancelled', tone: 'danger' },
  cancelled_auto:       { label: 'Cancelled',       tone: 'neutral' },
  refunded:             { label: 'Refunded',        tone: 'neutral' },
}

export interface MentorSummary {
  id: string
  name: string
  avatarUrl?: string
  headline: string
  company?: string
  /** Bare domain, e.g. phonepe.com. Drives the cached logo. */
  companyDomain?: string
  collegeLine?: string
  collegeTier?: CollegeTier
  homeState?: string
  languages: string[]
  firstGenGraduate: boolean
  tracks: Track[]
  topics: string[]
  breakthroughStory?: string
  price1on1: number
  session1on1Minutes: number
  trialOffer: boolean
  ratingAvg: number
  ratingCount: number
  sessionsCompleted: number
  country: string
  /** Only present on the matched list from the onboarding quiz. */
  matchReasons?: MatchReasons
  /** What the card shows on its back — what they have actually been doing. */
  lastSessionTitle?: string
  lastSessionAt?: string
  lastSessionAttendees?: number
  nextSessionTitle?: string
  nextSessionAt?: string
  latestReview?: string
  latestReviewRating?: number
  latestReviewAuthor?: string
}

export interface MatchReasons {
  sameLanguage: boolean
  sameState: boolean
  tierStep: boolean
  firstGen: boolean
}

export interface MentorDetail extends MentorSummary {
  story?: string
  currentPosition?: string
  linkedinUrl: string
}

export interface SessionSummary {
  id: string
  mentorId: string
  mentorName: string
  mentorAvatarUrl?: string
  mentorCompany?: string
  type: SessionType
  title: string
  description?: string
  track?: Track
  topic?: string
  startAt: string
  endAt: string
  capacity: number
  seatsBooked: number
  minSeats: number
  price: number
  status: SessionStatus
}

export interface BookingSummary {
  id: string
  status: BookingStatus
  amount: number
  holdExpiresAt?: string
  createdAt: string
  session: SessionSummary
  hasReview: boolean
}

export const seatsLeft = (s: Pick<SessionSummary, 'capacity' | 'seatsBooked'>) =>
  s.capacity - s.seatsBooked
export const isFull = (s: Pick<SessionSummary, 'capacity' | 'seatsBooked'>) =>
  seatsLeft(s) <= 0

/** The join window the database enforces: 10 minutes before, until the end. */
export function canJoin(s: Pick<SessionSummary, 'startAt' | 'endAt'>, now = new Date()) {
  const start = new Date(s.startAt).getTime()
  const end = new Date(s.endAt).getTime()
  return now.getTime() >= start - 10 * 60_000 && now.getTime() <= end
}
