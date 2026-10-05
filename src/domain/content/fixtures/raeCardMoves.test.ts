import { describe, expect, it } from 'vitest'
import RAE_CARDS from './raeCards.json'
import { raeMoveById } from './raeMoves'
import { raeLoopForExercise } from '../../../presentation/components/raeLoops'

describe('the owner\'s Rae exercise cards', () => {
  it('give every new card move a Rae move whose steps are the card\'s own cues', () => {
    for (const card of RAE_CARDS.cards.filter((c) => c.newMove)) {
      const move = raeMoveById.get(card.moveId!)
      expect(move, card.slug).toBeDefined()
      expect(move!.name).toBe(card.name)
      expect([move!.setup, ...move!.executionPhases]).toEqual(card.cues.map((c) => `${c}.`))
      expect(move!.taxonomy.equipment).toEqual(['bodyweight'])
    }
  })

  it('give every card a Rae loop for each exercise it serves, carrying the card picture', () => {
    for (const card of RAE_CARDS.cards) {
      for (const id of card.exerciseIds) {
        const loop = raeLoopForExercise(id)
        expect(loop?.id, `${card.slug} -> ${id}`).toBe(`ex-${card.loopId}`)
        expect(loop && 'card' in loop ? loop.card : undefined).toBe(`rae/cards/${card.loopId}.webp`)
      }
    }
  })
})
