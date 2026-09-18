import { z } from 'zod'
import type { ContentPack, Exercise, WorkoutTemplate } from './types'

const exerciseSchema = z.object({
  id: z.string().min(1),
  version: z.number().int().positive(),
  name: z.string().min(1),
  aliases: z.array(z.string()),
  taxonomy: z.object({
    category: z.string().min(1),
    equipment: z.array(z.string()),
  }),
  setup: z.string(),
  executionPhases: z.array(z.string()),
  cues: z.array(z.string()),
  commonErrors: z.array(z.string()),
  prescriptionCapabilities: z.object({
    reps: z.boolean(),
    time: z.boolean(),
    hold: z.boolean(),
  }),
  mediaManifest: z.object({
    hero: z.string().optional(),
    start: z.string().optional(),
    mid: z.string().optional(),
    finish: z.string().optional(),
    sequence: z.array(z.string()).optional(),
    loopVideo: z.string().optional(),
  }),
  provenance: z.object({
    author: z.string(),
    reviewedAt: z.string().nullable(),
    status: z.enum(['draft', 'reviewed', 'approved']),
    sourceRepo: z.string().optional(),
    sourceRevision: z.string().optional(),
    sourceRecordId: z.string().optional(),
    sourceLicense: z.string().optional(),
  }),
})

const workoutTemplateSchema = z.object({
  id: z.string().min(1),
  version: z.number().int().positive(),
  name: z.string().min(1),
  packId: z.string().min(1),
  exercises: z.array(
    z.object({
      exerciseId: z.string().min(1),
      exerciseVersion: z.number().int().positive(),
      prescription: z.object({
        sets: z.number().int().positive(),
        reps: z.number().int().positive().optional(),
        timeSeconds: z.number().int().positive().optional(),
        restSeconds: z.number().int().nonnegative(),
      }),
      order: z.number().int().nonnegative(),
      optional: z.boolean(),
    })
  ),
})

const contentPackSchema = z.object({
  id: z.string().min(1),
  version: z.number().int().positive(),
  name: z.string().min(1),
  dependsOn: z.array(z.string()),
  exerciseIds: z.array(z.string()),
  templateIds: z.array(z.string()),
})

export type ValidationResult = {
  valid: boolean
  errors: string[]
}

export function validateContentPack(
  pack: ContentPack,
  exercises: Exercise[],
  templates: WorkoutTemplate[]
): ValidationResult {
  const errors: string[] = []

  const packParse = contentPackSchema.safeParse(pack)
  if (!packParse.success) {
    errors.push(`Pack ${pack.id} failed schema validation: ${packParse.error.message}`)
  }

  for (const exercise of exercises) {
    const exerciseParse = exerciseSchema.safeParse(exercise)
    if (!exerciseParse.success) {
      errors.push(`Exercise ${exercise.id} failed schema validation: ${exerciseParse.error.message}`)
    }
  }

  for (const template of templates) {
    const templateParse = workoutTemplateSchema.safeParse(template)
    if (!templateParse.success) {
      errors.push(`Template ${template.id} failed schema validation: ${templateParse.error.message}`)
    }
  }

  const exerciseById = new Map(exercises.map((e) => [`${e.id}@${e.version}`, e]))
  const templateById = new Map(templates.map((t) => [t.id, t]))

  for (const templateId of pack.templateIds) {
    if (!templateById.has(templateId)) {
      errors.push(`Pack ${pack.id} references missing template: ${templateId}`)
    }
  }

  for (const exerciseId of pack.exerciseIds) {
    const exists = exercises.some((e) => e.id === exerciseId)
    if (!exists) {
      errors.push(`Pack ${pack.id} references missing exercise: ${exerciseId}`)
    }
  }

  for (const template of templates) {
    for (const templateExercise of template.exercises) {
      const key = `${templateExercise.exerciseId}@${templateExercise.exerciseVersion}`
      if (!exerciseById.has(key)) {
        errors.push(
          `Template ${template.id} references missing exercise/version: ${templateExercise.exerciseId}@${templateExercise.exerciseVersion}`
        )
      }
    }
  }

  return { valid: errors.length === 0, errors }
}
