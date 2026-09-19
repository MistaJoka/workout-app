export type ExerciseId = string

export type Exercise = {
  id: ExerciseId
  version: number
  name: string
  aliases: string[]
  taxonomy: {
    category: string
    equipment: string[]
    // Promoted from the upstream dataset once Library filtering became a
    // concrete consumer (docs/rnd/foss-fitness/sources/free-exercise-db.md,
    // "Schema-extension candidates"). Optional: curated/authored content
    // may omit them.
    primaryMuscles?: string[]
    secondaryMuscles?: string[]
    level?: 'beginner' | 'intermediate' | 'expert'
    mechanic?: 'compound' | 'isolation'
    force?: 'push' | 'pull' | 'static'
  }
  setup: string
  executionPhases: string[]
  cues: string[]
  commonErrors: string[]
  prescriptionCapabilities: {
    reps: boolean
    time: boolean
    hold: boolean
  }
  mediaManifest: {
    hero?: string
    start?: string
    mid?: string
    finish?: string
    sequence?: string[]
    loopVideo?: string
  }
  provenance: {
    author: string
    reviewedAt: string | null
    status: 'draft' | 'reviewed' | 'approved'
    // Optional external-source provenance for imported content, per
    // docs/rnd/foss-fitness/LICENSE_REGISTER.md's "Provenance fields".
    sourceRepo?: string
    sourceRevision?: string
    sourceRecordId?: string
    sourceLicense?: string
  }
}

export type WorkoutTemplateExercise = {
  exerciseId: ExerciseId
  exerciseVersion: number
  prescription: {
    sets: number
    reps?: number
    timeSeconds?: number
    restSeconds: number
  }
  order: number
  optional: boolean
}

export type WorkoutTemplate = {
  id: string
  version: number
  name: string
  packId: string
  exercises: WorkoutTemplateExercise[]
}

export type ContentPack = {
  id: string
  version: number
  name: string
  dependsOn: string[]
  exerciseIds: ExerciseId[]
  templateIds: string[]
}
