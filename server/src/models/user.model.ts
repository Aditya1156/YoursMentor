import mongoose, { Schema, type InferSchemaType, type Model } from 'mongoose'

/** Spec §6 User, plus the auth-only fields the spec implies but does not list. */
const userSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 80 },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, select: false },
    googleId: { type: String, index: true, sparse: true },
    avatarUrl: String,

    role: {
      type: String,
      enum: ['student', 'mentor', 'admin'],
      default: 'student',
      required: true,
    },

    dateOfBirth: Date,
    isAdultConfirmed: { type: Boolean, default: false },
    emailVerified: { type: Boolean, default: false },

    college: String,
    collegeTier: { type: String, enum: ['tier1', 'tier2', 'tier3', 'other'] },
    branch: String,
    graduationYear: Number,
    homeState: String,
    languages: { type: [String], default: [] },
    firstGenGraduate: Boolean,
    goals: {
      type: [String],
      enum: ['internship', 'job', 'abroad', 'skills', 'college_life', 'career_choice'],
      default: [],
    },

    onboardingComplete: { type: Boolean, default: false },
    status: { type: String, enum: ['active', 'suspended'], default: 'active' },

    // --- auth internals (never serialised to the client) ---
    /** Bumped to invalidate every outstanding refresh token for this user. */
    tokenVersion: { type: Number, default: 0, select: false },
    emailVerificationTokenHash: { type: String, select: false },
    emailVerificationExpiresAt: { type: Date, select: false },
    passwordResetTokenHash: { type: String, select: false },
    passwordResetExpiresAt: { type: Date, select: false },
  },
  { timestamps: true }
)

userSchema.index({ email: 1 }, { unique: true })

export type UserDoc = InferSchemaType<typeof userSchema> & { _id: mongoose.Types.ObjectId }

export const User: Model<UserDoc> =
  (mongoose.models.User as Model<UserDoc>) ??
  mongoose.model<UserDoc>('User', userSchema)

/** The only shape of a user that ever leaves the API. */
export function toPublicUser(u: UserDoc) {
  return {
    id: u._id.toString(),
    name: u.name,
    email: u.email,
    avatarUrl: u.avatarUrl ?? undefined,
    role: u.role,
    emailVerified: u.emailVerified,
    isAdultConfirmed: u.isAdultConfirmed,
    onboardingComplete: u.onboardingComplete,
    status: u.status,
    college: u.college ?? undefined,
    collegeTier: u.collegeTier ?? undefined,
    homeState: u.homeState ?? undefined,
    languages: u.languages ?? [],
    firstGenGraduate: u.firstGenGraduate ?? undefined,
    goals: u.goals ?? [],
  }
}
export type PublicUser = ReturnType<typeof toPublicUser>
