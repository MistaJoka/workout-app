import { createClient } from '@supabase/supabase-js'
import { describe, expect, it } from 'vitest'

describe('seeded programs', () => {
  it('includes Push/Pull/Legs and Full Body with exercises', async () => {
    const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
    const { data: programs, error } = await supabase.from('programs').select('name')
    expect(error).toBeNull()
    const names = programs!.map((p) => p.name)
    expect(names).toEqual(expect.arrayContaining(['Push/Pull/Legs', 'Full Body']))

    const { data: exercises, error: exError } = await supabase
      .from('program_exercises')
      .select('id')
    expect(exError).toBeNull()
    expect(exercises!.length).toBeGreaterThan(0)
  })
})
