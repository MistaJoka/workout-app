// Rae's garden story: a short, cozy, serialized tale about Rae tending a
// pixel garden on her windowsill city balcony, told one chapter at a time
// as finished workouts stack up. Pure narrative content, nothing about
// exercises or safety — never confuse a garden with a program.
//
// `expression` names one of presentation/components/Rae.tsx's
// RAE_EXPRESSIONS (kept as a plain string here, not imported, so this
// domain content stays framework/UI independent; raeStory.test.ts checks
// every value against the real list).
//
// Unlock thresholds (finished-workout count) are strictly increasing, so
// the unlocked chapters are always exactly the leading run of RAE_STORY —
// there is no "skip one, unlock the next" case.
export type RaeStoryChapter = {
  readonly n: number
  readonly title: string
  // Finished workouts needed to unlock this chapter.
  readonly unlockAt: number
  readonly expression: string
  readonly paragraphs: readonly string[]
}

export const RAE_STORY: readonly RaeStoryChapter[] = [
  {
    n: 1,
    title: 'A Mysterious Seed',
    unlockAt: 1,
    expression: 'surprised',
    paragraphs: [
      "On the windowsill, tucked between the basil and a chipped teacup, Rae found a seed she didn't remember buying.",
      'It was round, speckled grey-green, and faintly warm, as if it had been sitting in sunlight for a very long time.',
      'She had no idea what it would grow into. That, she decided, was exactly the point.',
      'She tucked it into a little pot of soil, gave it one careful cup of water, and wished it luck.',
    ],
  },
  {
    n: 2,
    title: 'The First Sprout',
    unlockAt: 2,
    expression: 'happy',
    paragraphs: [
      'Four mornings later, a thin green curl pushed up through the soil, no bigger than an eyelash.',
      "Rae checked on it before coffee, after coffee, and then once more just to be sure it hadn't vanished.",
      'By evening it had straightened, proud as a tiny flagpole, and she swore it leaned toward her when she talked to it.',
      "She didn't name it yet. Some things deserve to earn their name.",
    ],
  },
  {
    n: 3,
    title: 'A Rainy Day',
    unlockAt: 3,
    expression: 'focused',
    paragraphs: [
      'The sky turned the color of a bruise, and rain hammered the balcony railing all afternoon.',
      "Rae dragged a cracked umbrella over the little pot and held it there herself when the wind tried to steal it.",
      "Her slippers were soaked through by the time the storm passed, but the sprout stood exactly where she'd left it.",
      'Worth it, she thought, wringing out a sock.',
    ],
  },
  {
    n: 4,
    title: 'The Curious Bee',
    unlockAt: 5,
    expression: 'wink',
    paragraphs: [
      "A fat, fuzzy bee found the balcony before the first real leaf had even unfurled.",
      'It circled the pot twice, inspected the teacup, and seemed personally offended there were no flowers yet.',
      "Rae apologized on the plant's behalf and promised there'd be something worth visiting, eventually.",
      'The bee gave her what she chose to read as a patient nod, and buzzed off toward someone else\'s balcony.',
    ],
  },
  {
    n: 5,
    title: "The Neighbor's Cat",
    unlockAt: 7,
    expression: 'laugh',
    paragraphs: [
      'A marmalade cat from two floors down started appearing on the railing like it paid rent there.',
      'It ignored Rae completely and stared at the plant with the focus of a very tiny, very furry security guard.',
      'When a leaf finally brushed its whiskers, the cat leapt sideways so dramatically it nearly fell off the balcony.',
      'Rae laughed until her sides hurt, then set out a saucer of water as a peace offering.',
    ],
  },
  {
    n: 6,
    title: 'Growing Pains',
    unlockAt: 10,
    expression: 'determined',
    paragraphs: [
      'The stem shot up faster than it could hold itself steady, and one windy night it drooped nearly sideways.',
      'Rae found an old chopstick in a kitchen drawer and tied the stem to it with a strip of ribbon.',
      'It looked a little silly, a plant in a makeshift splint, but it stood tall again by morning.',
      'Some things just need a little help standing up straight. She understood that better than most.',
    ],
  },
  {
    n: 7,
    title: 'The Night the Moon Lily Glowed',
    unlockAt: 14,
    expression: 'surprised',
    paragraphs: [
      'One of the buds finally opened after dark, pale and papery, while Rae was carrying out the trash.',
      "Under the streetlight it seemed to glow, like it had swallowed a little moonlight and couldn't help showing off.",
      'She stood there in her socks for ten straight minutes, forgetting entirely about the trash.',
      'A Moon Lily, she decided to call it, official as anything. Nobody was around to argue.',
    ],
  },
  {
    n: 8,
    title: 'A Visitor from the Market',
    unlockAt: 20,
    expression: 'smile',
    paragraphs: [
      'An old man from the corner flower stall spotted the Moon Lily through the railing and nearly dropped his crate.',
      "He'd grown them decades ago, he said, and hadn't seen one in the city since he was young.",
      "He pressed a little clay pot into her hands, free of charge, \"for the next one.\"",
      'Rae thanked him twice, carried it upstairs like a trophy, and immediately started wondering what to plant in it.',
    ],
  },
  {
    n: 9,
    title: 'The Storm',
    unlockAt: 30,
    expression: 'determined',
    paragraphs: [
      'The forecast had warned of wind, but not of a sky gone the color of dropped charcoal.',
      'Rae hauled every pot inside piece by piece, soil smudging her sleeves, soaked through before the second trip.',
      'The balcony rattled and emptied and howled all night, and not one leaf of hers was out in it.',
      'In the morning she carried them back out, one by one, like nothing had happened at all.',
    ],
  },
  {
    n: 10,
    title: 'The Garden in Bloom',
    unlockAt: 50,
    expression: 'cheer',
    paragraphs: [
      'What had started as one strange seed in a teacup now crowded the whole railing, pot against pot against pot.',
      'The Moon Lily had cousins now. The marmalade cat had opinions about all of them.',
      "Rae stood back one golden evening, hands on her hips, surveying the small, ridiculous, thriving mess she'd made.",
      'Not bad, she told the bee, for someone who never meant to start a garden at all.',
    ],
  },
]

// Chapters this many finished workouts have unlocked, in order. Since
// RAE_STORY's thresholds only increase, this is always the leading run of
// the list — there's no gap where chapter 4 is locked but 5 is open.
export function unlockedChapters(finishedCount: number): readonly RaeStoryChapter[] {
  return RAE_STORY.filter((chapter) => chapter.unlockAt <= finishedCount)
}

// The next chapter still waiting to unlock, or null once every chapter has
// (at 50 finished workouts and beyond).
export function nextChapter(finishedCount: number): RaeStoryChapter | null {
  return RAE_STORY.find((chapter) => chapter.unlockAt > finishedCount) ?? null
}
