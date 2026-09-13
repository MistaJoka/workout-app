import { createClient } from '@supabase/supabase-js'
import { describe, expect, it } from 'vitest'

describe('local Supabase schema', () => {
  it('has the five MVP tables reachable', async () => {
    const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
    for (const table of ['programs', 'program_days', 'program_exercises', 'sessions', 'logged_sets']) {
      const { error } = await supabase.from(table).select('id').limit(1)
      expect(error, `table ${table} should be queryable`).toBeNull()
    }
  })
})
