# Hubby Bunny's shop — reward systems R&D (2026-10-03)

Status: all ten recommendations built (owner: "go ahead", then "do the rest", 2026-10-03), with the
proposed defaults: tiers 25 / 60 / 150, welcome back +15 after 7 days, soft pity 40 → 55 → 75%.
Commits 153593d (economy), 7ef099e (wishlist), 0c28d70 (featured, thanks, unwrap, either partner gives).
#10 was built as "either partner runs a shop on their own phone" (role word from the giver name),
paid for by that phone's own workouts. Carrots for non-workout acts (writing notes, delivering) were
not added.
Scope: how games build shop/economy engines, what today's best reward systems do,
and what the science says — mapped onto our shop.

## 1. Where the shop stands today

| Piece | Today |
|---|---|
| Currency | Carrots, derived from workout history. Never stored. Balance = earned − spent. |
| Faucets | +10 per workout, +1 per counted set, +5 perfect workout, +20 weekly goal met, +30 weekly boss defeated |
| Catalog | `rewards` rows (title, emoji, cost, active), edited by him behind a PIN |
| Purchase | `redemptions` row with a snapshot of title and cost (`redemptionsRepository.redeemReward`) |
| Fulfilment | Coupon, delivered in person; marked delivered by PIN or a gift link |
| Surprise layer | Love notes: 40% roll per workout, guaranteed after 3 misses or when the weekly goal is met |
| Outside the economy | Gift links: he sends rewards and notes from his phone |

### Economy check (our numbers)

- A full workout earns ~25 carrots (Full Body A/B are 10 sets: 10 + 10 + 5). A Quick 10 earns ~21.
- A normal 2-workout week: ~50 + 20 (goal) + 30 (boss) ≈ **100 carrots a week**.
- Starter prices are 15–40, so she can buy **3–4 rewards a week**.
- Read: the faucet outruns the sink. Fine at first, but it costs him a lot, and rewards turn routine
  (hedonic adaptation). There's no "big" item to save for.

## 2. How games build it (engine patterns)

Every major game-backend economy converges on one shape
([PlayFab Economy v2](https://learn.microsoft.com/en-us/gaming/playfab/economy-monetization/economy-v2/catalog/catalog-overview),
[Unity Economy](https://docs.unity.com/ugs/en-us/manual/economy/manual),
[Nakama](https://heroiclabs.com/docs/nakama/guides/concepts/economy/),
[Beamable](https://docs.beamable.com/docs/virtual-currency-code),
[EOS Ecom](https://dev.epicgames.com/docs/epic-games-store/services/ecom/ecom-quick-start?lang=en-US)):

1. **Catalog as data.** Item and currency definitions are rows, not code. *Ours: yes (`rewards`).*
2. **Purchase is its own object** (cost → grant). Unity calls it a Virtual Purchase. *Ours: implicit.*
3. **Entitlement separate from catalog.** What you own is separate from what's for sale. *Ours: yes, the
   redemption snapshots title and cost.*
4. **Ledger, not a mutable balance.** Nakama's wallet ledger. *Ours: better — earnings derive from
   immutable workout history, and spends are the redemption rows.*
5. **Idempotent, atomic purchases.** PlayFab takes an `IdempotencyId` and batches atomically, so a
   retry never double-grants.
   [ref](https://learn.microsoft.com/en-us/rest/api/playfab/economy/inventory/execute-inventory-operations?view=playfab-rest)
   *Ours: gap.* `redeemReward` makes a fresh id each call and doesn't recheck the balance when it
   writes; only the UI busy flag guards it. A double tap or two open tabs could overspend.

Design theory:

- **Faucets and sinks** ([gold sink](https://en.wikipedia.org/wiki/Gold_sink)). Tune flow rates to a
  target *time to reward*, not raw amounts. Simulate before shipping (Dormans, *Engineering Emergence*;
  [Machinations](https://www.gamedeveloper.com/design/the-designer-s-notebook-machinations-a-new-way-to-design-game-mechanics)).
- **Pity timers are two-stage.** Soft pity (odds rise) plus hard pity (guarantee): Genshin ~74 → 90,
  Hearthstone 40 packs ([explainer](https://esports.gg/news/hearthstone/hearthstone-pity-timer/)).
  *Ours: hard pity only (40% flat, guaranteed at 3).*
- **Rested XP.** WoW kept the same numbers as its punitive "fatigue" system and relabeled them as a bonus
  ([Psychology of Games](https://www.psychologyofgames.com/2010/03/framing-and-world-of-warcrafts-rest-system/)).
  The template for absence mechanics: surplus only, never decay.
- **Nook Miles** (Animal Crossing). A second, non-money currency for routine actions, spent at a calm,
  dedicated kiosk ([Nookipedia](https://nookipedia.com/wiki/Nook_Miles)). That's our shop's spirit.
- **Visible track** (battle-pass shape, free track only). Seeing the next unlock coming builds
  anticipation ([Deconstructor of Fun](https://www.deconstructoroffun.com/blog/2022/6/4/battle-passes-analysis)).
- **Juice.** Small feedback multiplies feel ("The Art of Screenshake", "Juice It or Lose It"). Schell's
  Lens of Rewards: surprise beats regularity.

## 3. Best reward systems today

| App | What carries over | What doesn't |
|---|---|---|
| [Habitica](https://habitica.fandom.com/wiki/Sample_Custom_Rewards) | Self-priced custom rewards, the closest twin to our shop | Setup friction, notification overload |
| [Finch](https://www.bustle.com/wellness/finch-app-review-features-price) | Currency is earned only, never bought, which keeps the shop meaningful | — |
| OurHome / Joon / [S'moresUp](https://www.smoresup.com/about-smoresup) | Giver-defined rewards, the giver approves, saving toward a goal | Kid-framed |
| Apple Fitness, Ring Fit, Pokémon GO | Real exercise turned into progress and story | Ring-streak anxiety |
| Sweatcoin, [WayBetter](https://www.bbb.org/us/ny/new-york/profile/online-retailer/waybetter-0121-172187/complaints) | — | Money stakes breed disputes and mistrust. Avoid. |
| [Duolingo](https://thedecisionlab.com/insights/consumer-insights/streak-creep-the-perils-of-too-much-gamification) | — | Guilt copy, streak anxiety. The canonical anti-pattern. |

## 4. What the science says

- **Token economies work**: points backed by real rewards reliably raise the behavior.
- **Reward showing up, not performance.** Tangible, performance-contingent rewards are what crowd out
  intrinsic motivation ([Deci, Koestner & Ryan 1999](https://depts.washington.edu/techdocs/papers/deciExtrinsicRewardsAndIntrinsicMotivation99.pdf)).
  Across 40 years, rewards don't generally hurt — the harm comes from tight performance contingency
  ([Cerasoli 2014](https://selfdeterminationtheory.org/wp-content/uploads/2017/06/2014_Cerasoli_Intrinsic.pdf)).
- **Surprise rewards spare motivation; promised ones can erode it** (Lepper & Greene). Love notes and
  gift links sit on the right side of this.
- **Comebacks beat streaks.** In the StepUp megastudy (61k gym members, 54 programs), the top
  intervention was a small bonus for *returning after a missed workout*: +27% visits
  ([Nature 2021](https://www.nature.com/articles/s41586-021-04128-4)).
- **Goal-gradient.** Effort speeds up near a visible goal: ~20% faster near a café-card reward
  ([Kivetz et al. 2006](https://www.researchgate.net/publication/239776073_The_Goal-Gradient_Hypothesis_Resurrected_Purchase_Acceleration_Illusionary_Goal_Progress_and_Customer_Retention)).
- **Endowed progress.** A card that starts 2 of 10 stamps in hit 34% completion vs 19% for a blank one (Nunes & Drèze 2006).
- **Wishlists win.** Givers overvalue surprise; receivers rate requested gifts as *more* thoughtful
  ([giver–receiver asymmetry](https://www.researchgate.net/publication/7840993_Giver-receiver_asymmetries_in_gift_preferences)).
- **Partners matter.** Spouse-involved programs raise both partners' activity (6 RCTs, 783 couples)
  ([review](https://www.researchgate.net/publication/351827563_Can_your_partner_influence_your_physical_activity_The_role_of_social_support_provided_by_partners)).
  Gratitude binds (Algoe, find–remind–bind), and Gottman's 5:1 positive ratio applies.
- **Novelty, not inflation**, resists hedonic adaptation: rotate rewards, don't escalate prices.

## 5. Recommendations for Hubby Bunny's shop (ranked)

Each is offline, has no external API, and passes the ethics rule (no guilt, FOMO or streak loss).

| # | Idea | Evidence | Size |
|---|---|---|---|
| 1 | **Wishlist.** She proposes a reward (title + emoji). He prices and approves it behind his PIN. Cross-phone: her wish goes out as a link, and his approval comes back as a gift link. | Gift asymmetry; S'moresUp/OurHome approval | M |
| 2 | **Price in workouts + tiers.** The editor shows "≈ 3 workouts" beside the cost, with Small / Medium / Big tiers (~25 / ~60 / ~150+). Starter ideas get re-priced to match. | Time-to-reward targets; faucet/sink check | S |
| 3 | **Saving for…** She pins one reward. A progress bar shows on the shop and Today: "34 / 150 🥕". It's honest endowed progress, since her existing balance already counts. | Goal-gradient; endowed progress | S |
| 4 | **Welcome-back bonus.** The first workout after a gap of 7+ days earns +15. Nothing is ever taken away. | StepUp top arm; Rested XP | S |
| 5 | **Safe redeem.** Recheck the balance and write the redemption in one Dexie transaction, with an idempotency key per confirm sheet. | PlayFab IdempotencyId / atomic ops | S |
| 6 | **Soft pity for love notes.** 40% → 60% → guaranteed. A short "how notes unlock" line, so the odds aren't hidden. | Genshin/Hearthstone two-stage; anti-hidden-odds | S |
| 7 | **Say thanks.** A delivered coupon offers a one-tap thank-you she shares back to him. | Algoe; Gottman 5:1; reciprocity | S |
| 8 | **Coupon unwrap juice.** Redeeming plays a short pixel unwrap with a sound. It respects the motion setting and never removes info. | Juice / game feel | S–M |
| 9 | **Featured reward**, his manual pick. No countdown, no "leaving soon"; everything stays buyable. | Rotation for freshness (minus Fortnite FOMO) | S |
| 10 | **Shop for him** (reciprocal). She defines rewards he earns. A bigger change. | Couples social-support RCTs | L |

### Explicitly not doing (with precedent)

- Countdown or rotating scarcity (Fortnite backlash). Currency expiry. Streak decay (Duolingo).
- Converting coupons back to carrots (MTG Arena's designers rejected "dust" for this reason).
- Carrots scaled by weight, pace or reps beyond counting the set (performance contingency).
- Money stakes (WayBetter/StepBet disputes).

## 6. Suggested first slice

**2 + 3 + 5**: price in workouts and tiers, the "Saving for" bar, and safe redeem. All small. They fix
the economy imbalance and add a goal to save toward. Then **1 (Wishlist)**, the
highest-evidence feature, and **4 (Welcome back)**.

Open owner calls: tier prices; welcome-back gap and size; whether the "+20 weekly goal" and "+30 boss"
stay as they are.

## Sources not fully verified

Habitica "gold grind" Reddit threads; Agapé's point formula; full content of the GDC Vault talk
"Throwing Out the Dopamine Shots" (paywalled); Steam inventory-service API details; a Destiny
FOMO "leak" page (low-credibility mirror — used only as a pointer to the well-known Xûr vendor).
