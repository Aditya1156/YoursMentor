/**
 * The facts the legal pages are built from.
 *
 * Everything here is either a real rule enforced in the database — the refund
 * window is `cancel_booking()`, the purge period is `purge_deleted_accounts()` —
 * or an operator detail only you can supply. Nothing is invented: a policy that
 * says something the code does not do is worse than no policy, because a student
 * can hold you to it.
 *
 * FILL IN BEFORE TAKING PAYMENTS. Razorpay's merchant review checks that the
 * entity named here matches the account, and the DPDP Act 2023 requires a
 * reachable grievance contact. Until these are set, the pages say the details
 * are not published yet rather than printing something untrue.
 */
export const LEGAL = {
  /** Registered name of the entity taking the money, e.g. "Acme Labs Pvt Ltd". */
  entity: null as string | null,
  /** Registered address, as on the Razorpay account. */
  address: null as string | null,
  /** GSTIN, if registered. Null is fine below the threshold. */
  gstin: null as string | null,
  /** Named person for DPDP grievances. A role is acceptable; a blank is not. */
  grievanceOfficer: null as string | null,
  /** Courts of which city hear a dispute. */
  jurisdiction: null as string | null,

  /** These mailboxes must exist and be read by a person. */
  supportEmail: 'support@yoursmentor.in',
  grievanceEmail: 'grievance@yoursmentor.in',

  /** Shown as "last updated". Bump it when you change a policy. */
  updated: '2026-10-03',
} as const

/** True once the operator details are complete enough to take money. */
export const legalDetailsComplete = !!(
  LEGAL.entity && LEGAL.address && LEGAL.grievanceOfficer && LEGAL.jurisdiction
)

/**
 * The rules the product actually enforces, named here so the policy pages and
 * the code cannot drift apart.
 */
export const RULES = {
  /** cancel_booking(): a confirmed seat cancelled this far ahead is refunded. */
  studentRefundHours: 24,
  /** cancel_session(): a mentor cancelling later than this takes a strike. */
  mentorStrikeHours: 48,
  /** Strikes before a mentor profile is suspended. */
  strikesToSuspension: 3,
  /** hold_window(): how long a seat is held while paying. */
  holdMinutes: 10,
  /** The room opens this long before the start time. */
  joinOpensMinutes: 10,
  /** purge_deleted_accounts(): grace period before a deletion is permanent. */
  deletionGraceDays: 30,
  /** mentor_earnings(): the platform's share of a session's price. */
  commissionPercent: 25,
  /**
   * No minimum age is enforced. The gate was removed deliberately; see
   * 20261002000028_remove_age_gate.sql for what was weighed. Nothing in the
   * product checks an age, so nothing published may claim one.
   */
  minimumAge: null as number | null,
  /** Group sessions below this many seats are cancelled and everyone refunded. */
  groupMinimumSeats: 3,
} as const
