import { z } from 'zod'

// Row-level shape checks for a backup file, so a hand-edited or damaged file
// is rejected before anything is written (docs/SECURITY_AND_PRIVACY.md,
// import boundary). Objects pass unknown keys through, so a backup from a
// newer build still imports; only the fields this build relies on are held
// to their types.

const isoLike = z.string().min(1)
const count = z.number().int().nonnegative()
const positive = z.number().positive()

const profile = z.object({ id: z.string().min(1), name: z.string() }).passthrough()

const settings = z.object({ key: z.string().min(1), value: z.unknown() }).passthrough()

const checkIn = z.object({ id: z.string().min(1), createdAt: isoLike }).passthrough()

const planExercise = z
  .object({
    exerciseId: z.string().min(1),
    exerciseVersion: z.number(),
    name: z.string(),
    sets: count,
    reps: count.optional(),
    authoredReps: count.optional(),
    timeSeconds: count.optional(),
    restSeconds: count,
    weightKg: z.number().nonnegative().optional(),
    authoredWeightKg: z.number().nonnegative().optional(),
    order: z.number(),
  })
  .passthrough()

const sessionPlan = z
  .object({
    id: z.string().min(1),
    templateId: z.string(),
    templateVersion: z.number(),
    packId: z.string(),
    ruleVersion: z.string(),
    createdAt: isoLike,
    exercises: z.array(planExercise),
    adaptations: z.array(z.object({ exerciseId: z.string(), reasonCode: z.string(), detail: z.string() }).passthrough()),
    reproducibilityHash: z.string(),
  })
  .passthrough()

// Any non-empty type: builds add event types over time, and the session
// machine ignores types it doesn't know, so an unfamiliar type must not make
// the whole backup unreadable.
const sessionEvent = z
  .object({
    seq: z.number().optional(),
    eventId: z.string().min(1),
    sessionId: z.string().min(1),
    type: z.string().min(1),
    timestamp: isoLike,
    payload: z.record(z.unknown()),
  })
  .passthrough()

const sessionResult = z
  .object({
    sessionId: z.string().min(1),
    planId: z.string().min(1),
    status: z.string().min(1),
    startedAt: isoLike,
    endedAt: isoLike,
    totalSetsCompleted: count,
    totalSetsPlanned: count,
  })
  .passthrough()

const familiarity = z
  .object({ exerciseId: z.string().min(1), exposureCount: count, lastSeenAt: isoLike.nullable() })
  .passthrough()

const progression = z
  .object({
    exerciseId: z.string().min(1),
    level: z.number().int(),
    lastAdvancedAt: isoLike.nullable(),
    currentPrescribedReps: count.nullable(),
    currentWeightKg: z.number().nonnegative().nullable(),
    consecutiveFailureStreak: count,
    pendingCandidate: z
      .object({ candidatePrescribedReps: count, candidateWeightKg: z.number().nonnegative().optional(), detail: z.string() })
      .passthrough()
      .nullable(),
  })
  .passthrough()

const templateExercise = z
  .object({
    exerciseId: z.string().min(1),
    exerciseVersion: z.number(),
    prescription: z
      .object({
        sets: count,
        reps: count.optional(),
        timeSeconds: count.optional(),
        restSeconds: count,
        weightKg: z.number().nonnegative().optional(),
      })
      .passthrough(),
    order: z.number(),
    optional: z.boolean(),
  })
  .passthrough()

const customTemplate = z
  .object({
    id: z.string().min(1),
    version: z.number(),
    name: z.string(),
    packId: z.string(),
    exercises: z.array(templateExercise),
    createdAt: isoLike,
    updatedAt: isoLike,
  })
  .passthrough()

const bodyWeight = z
  .object({ day: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), kg: positive, recordedAt: isoLike })
  .passthrough()

const reward = z
  .object({
    id: z.string().min(1),
    title: z.string(),
    cost: count,
    emoji: z.string().min(1),
    icon: z.string().min(1).optional(),
    active: z.boolean(),
    createdAt: isoLike,
    updatedAt: isoLike,
  })
  .passthrough()

const redemption = z
  .object({
    id: z.string().min(1),
    rewardId: z.string().min(1),
    title: z.string(),
    cost: count,
    redeemedAt: isoLike,
    deliveredAt: isoLike.nullable(),
  })
  .passthrough()

const loveNote = z
  .object({
    id: z.string().min(1),
    text: z.string().max(280),
    emoji: z.string().min(1),
    createdAt: isoLike,
    updatedAt: isoLike,
    unlockedAt: isoLike.nullable(),
    unlockedBySessionId: z.string().min(1).nullable(),
    readAt: isoLike.nullable(),
  })
  .passthrough()

export const exportBundleSchema = z
  .object({
    exportedAt: isoLike,
    version: z.number(),
    profile: profile.optional(),
    settings: z.array(settings),
    checkIns: z.array(checkIn),
    sessionPlans: z.array(sessionPlan),
    sessionEvents: z.array(sessionEvent),
    sessionResults: z.array(sessionResult),
    familiarity: z.array(familiarity),
    progression: z.array(progression),
    customTemplates: z.array(customTemplate).optional(),
    bodyWeight: z.array(bodyWeight).optional(),
    rewards: z.array(reward).optional(),
    redemptions: z.array(redemption).optional(),
    loveNotes: z.array(loveNote).optional(),
  })
  .passthrough()
