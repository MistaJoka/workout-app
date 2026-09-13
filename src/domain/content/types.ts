export type ExerciseId = string

export type Exercise = {
  id: ExerciseId
  version: number
  name: string
  aliases: string[]
  taxonomy: {
    category: string
    equipment: string[]
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
