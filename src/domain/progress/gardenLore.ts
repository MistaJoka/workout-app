import { GARDEN_SPECIES } from './garden'

// A one-line whimsical fact per species, shown on its lore card in the
// garden. Warm and playful, never more than a short sentence: it's a
// little surprise, not a field guide entry. Keyed by species id so a
// lookup never silently falls back to the wrong flower.
export const GARDEN_LORE: Readonly<Record<string, string>> = {
  'pink-bloom': 'Pink Bloom: the first flower most gardens grow, and still nobody’s least favorite.',
  'sky-daisy': 'Sky Daisy tilts its face toward whichever window gets light first.',
  'butter-cup': 'Buttercup hums if you hold it near your chin — or so the story goes.',
  'lilac-puff': 'Lilac Puff smells faintly of the laundry you did on a good day.',
  'peach-poppy': 'Peach Poppy naps all afternoon and blooms wide open at dusk.',
  'mint-star': 'Mint Star leaves a cool patch of shade no bigger than a coin.',
  'cherry-pop': 'Cherry Pop snaps open with a tiny, satisfying pop at first light.',
  'cloud-bell': 'Cloud Bell rings so quietly only the gardener ever hears it.',
  'coral-twist': 'Coral Twist grows in a gentle spiral, like it can’t decide which way is up.',
  'ocean-iris': 'Ocean Iris keeps the tide in its petals long after the storm passes.',
  'plum-heart': 'Plum Heart beats once a day, right when you show up to garden.',
  'lime-zest': 'Lime Zest is sharp enough to wake up a whole flower bed.',
  'moon-lily': 'Moon Lily opens only after the sun sets, glowing for anyone who showed up today.',
  'ember-rose': 'Ember Rose stays warm to the touch long after the sun goes down.',
  'golden-sun': 'Golden Sun is said to grow once in a hundred gardens, and still shows up smiling.',
}

const LORE_MAX_LENGTH = 90

export function loreFor(speciesId: string): string {
  return GARDEN_LORE[speciesId] ?? 'A quiet little flower with a story still being written.'
}

// Keeps GARDEN_LORE's keys and the length limit self-checking even outside
// the test file, in case a species list changes without a matching test run.
export function everySpeciesHasLore(): boolean {
  return GARDEN_SPECIES.every((s) => {
    const lore = GARDEN_LORE[s.id]
    return typeof lore === 'string' && lore.length > 0 && lore.length <= LORE_MAX_LENGTH
  })
}

export const GARDEN_LORE_MAX_LENGTH = LORE_MAX_LENGTH
