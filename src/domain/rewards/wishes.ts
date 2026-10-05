// Her wishlist: she proposes a reward (title + emoji); Hubby Bunny prices it
// behind his PIN. Receivers rate requested gifts as more thoughtful, not
// less (R&D: docs/rnd/hubby-shop/REWARD_SYSTEMS_RND.md). Pure.
//
// Granting needs no state of its own: the reward he creates carries the
// wish's id, so a wish is granted exactly when a reward with that id
// exists -- on either phone, however the reward arrived (editor or gift link).

export type Wish = {
  id: string
  title: string
  emoji: string
  // Pixel icon id (domain/rewards/rewardIcons.ts), when picked; `emoji`
  // stays as its plain-text stand-in. Additive, unindexed.
  icon?: string
  createdAt: string
  // Removed by her, or "not now" from him. Kept (not deleted) so a backup
  // merge can't bring it back.
  dismissedAt?: string
}

// Keyed by id, so two copies merge as a plain union.
export type WishBook = Record<string, Wish>

export function pendingWishes(book: WishBook | null | undefined, rewardIds: ReadonlySet<string>): Wish[] {
  return Object.values(book ?? {})
    .filter((w) => !w.dismissedAt && !rewardIds.has(w.id))
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id))
}

export function grantedWishIds(book: WishBook | null | undefined, rewardIds: ReadonlySet<string>): Set<string> {
  return new Set(Object.keys(book ?? {}).filter((id) => rewardIds.has(id)))
}
