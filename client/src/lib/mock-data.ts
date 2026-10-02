/**
 * PLACEHOLDER DATA — delete when the public API lands.
 * Mirrors `GET /api/public/featured-mentors` and
 * `GET /api/sessions?upcoming=true&limit=4` (MASTER_PROMPT §8 P1).
 * Content copied from the approved designs so the page can be compared
 * against them pixel for pixel.
 */
import type { GroupSessionSummary, MentorSummary } from './types'

const inDays = (days: number, hour: number, minutes = 0) => {
  const d = new Date()
  d.setDate(d.getDate() + days)
  d.setHours(hour, minutes, 0, 0)
  return d.toISOString()
}

export const MOCK_MENTORS: MentorSummary[] = [
  {
    id: 'priya-sharma',
    name: 'Priya Sharma',
    headline: 'Software Engineer at PhonePe',
    company: 'PhonePe',
    collegeLine: 'Ex-Tier 3 College (UPTU, Lucknow)',
    collegeTier: 'tier3',
    homeState: 'Uttar Pradesh',
    languages: ['Hindi', 'English'],
    firstGenGraduate: true,
    tracks: ['first_job'],
    breakthroughStory:
      'Cracked off-campus SDE-1 after 120 rejections. Let us fix your cold outreach and eliminate generic applications.',
    topics: ['Off-Campus Referrals', 'DSA in Java', 'Cold DM Strategy'],
    price1on1: 199,
    session1on1Minutes: 30,
    ratingAvg: 4.98,
    ratingCount: 58,
    verified: true,
    activeToday: true,
  },
  {
    id: 'karthik-rao',
    name: 'Karthik Rao',
    headline: 'MS in CS at TU Munich',
    collegeLine: 'Tier-3 Mech → German Tech Master',
    collegeTier: 'tier3',
    homeState: 'Karnataka',
    languages: ['Kannada', 'English'],
    firstGenGraduate: false,
    tracks: ['abroad'],
    breakthroughStory:
      'Going abroad on a tight budget and education loan guide without costly consultancy agents. Low-tuition routes that actually admit Tier-3 students.',
    topics: ['Zero-Tuition Unis', 'APS Certificate', 'Blocked Account'],
    price1on1: 249,
    session1on1Minutes: 30,
    ratingAvg: 4.95,
    ratingCount: 34,
    verified: true,
    activeToday: true,
  },
  {
    id: 'ananya-verma',
    name: 'Ananya Verma',
    headline: 'Associate Product Manager at Swiggy',
    company: 'Swiggy',
    collegeLine: 'Tier-2 College (AKGEC)',
    collegeTier: 'tier2',
    homeState: 'Delhi NCR',
    languages: ['Hindi', 'English'],
    firstGenGraduate: true,
    tracks: ['first_job'],
    breakthroughStory:
      'Off-campus APM case studies and portfolio prep. Non-IIT product management paths decoded, step by step.',
    topics: ['Product Teardowns', 'RCA Round Prep', 'APM Fellowship'],
    price1on1: 299,
    session1on1Minutes: 30,
    ratingAvg: 5.0,
    ratingCount: 27,
    verified: true,
    activeToday: true,
  },
  {
    id: 'mohammad-zaid',
    name: 'Mohammad Zaid',
    headline: 'Backend Engineer at Razorpay',
    company: 'Razorpay',
    collegeLine: 'Tier-3 BCA → MCA → Fintech',
    collegeTier: 'tier3',
    homeState: 'Bihar',
    languages: ['Hindi', 'Urdu'],
    firstGenGraduate: false,
    tracks: ['first_job'],
    breakthroughStory:
      'System design and DSA roadmap without fancy degrees. Beat college placement depression and build a real portfolio.',
    topics: ['Go / Microservices', 'Redis & PostgreSQL', 'MCA Placement Hack'],
    price1on1: 149,
    session1on1Minutes: 30,
    ratingAvg: 4.9,
    ratingCount: 41,
    verified: true,
  },
  {
    id: 'sneha-patil',
    name: 'Sneha Patil',
    headline: 'Data Analyst at Deloitte',
    company: 'Deloitte',
    collegeLine: 'Tier-2 Pune (Non-CS Background)',
    collegeTier: 'tier2',
    homeState: 'Maharashtra',
    languages: ['Marathi', 'Hindi'],
    firstGenGraduate: false,
    tracks: ['first_job'],
    breakthroughStory:
      'SQL, PowerBI and resume positioning for non-CS grads. I transitioned from Electrical Engineering with zero coding background.',
    topics: ['Portfolio Dashboards', 'Live SQL Mock', 'Big 4 Resume Audit'],
    price1on1: 99,
    session1on1Minutes: 30,
    ratingAvg: 4.88,
    ratingCount: 19,
    verified: true,
    trialOffer: true,
  },
  {
    id: 'arjun-das',
    name: 'Arjun Das',
    headline: 'Cloud DevOps at AWS',
    company: 'AWS',
    collegeLine: 'Tier-3 College (West Bengal)',
    collegeTier: 'tier3',
    homeState: 'West Bengal',
    languages: ['Bengali', 'English'],
    firstGenGraduate: false,
    tracks: ['first_job'],
    breakthroughStory:
      'Linux and AWS certifications on a student budget without paying ₹50k for spam bootcamps. From free tier to interview-ready.',
    topics: ['Docker & K8s', 'Free Tier AWS Labs', 'Interview Architecture'],
    price1on1: 199,
    session1on1Minutes: 30,
    ratingAvg: 4.96,
    ratingCount: 62,
    verified: true,
  },
]

export const MOCK_SESSIONS: GroupSessionSummary[] = [
  {
    id: 'resume-roasting',
    title: 'Resume Roasting: Turn 0 Shortlists into 5',
    description:
      'Live line-by-line roast of 4 anonymous Tier-3 student resumes. Learn what recruiters actually reject and the impact metrics that bypass ATS filters.',
    mentor: { id: 'priya-sharma', name: 'Ankit V.' },
    mentorCompany: 'Razorpay',
    track: 'first_job',
    startAt: inDays(1, 19),
    endAt: inDays(1, 20, 15),
    capacity: 15,
    seatsBooked: 12,
    minSeats: 3,
    price: 99,
  },
  {
    id: 'cold-outreach',
    title: 'Off-Campus Cold Outreach that Works',
    description:
      'Stop spamming "Hi Sir, please refer me". Get live templates, LinkedIn search queries, and direct engineering lead email hacks.',
    mentor: { id: 'ananya-verma', name: 'Pooja H.' },
    mentorCompany: 'Swiggy',
    track: 'first_job',
    startAt: inDays(4, 16),
    endAt: inDays(4, 17),
    capacity: 15,
    seatsBooked: 10,
    minSeats: 3,
  price: 99,
  },
  {
    id: 'education-loans',
    title: 'Education Loans Without Property Collateral',
    description:
      'Demystifying Prodigy, Leap, SBI and Union Bank rules for middle-class Indian families targeting US, German and Canadian universities.',
    mentor: { id: 'karthik-rao', name: 'Karthik R.' },
    mentorCompany: 'TU Munich',
    track: 'abroad',
    startAt: inDays(5, 11),
    endAt: inDays(5, 12),
    capacity: 15,
    seatsBooked: 13,
    minSeats: 3,
    price: 99,
  },
]
