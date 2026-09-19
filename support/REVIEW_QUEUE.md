# Human Review Queue

These items require human approval before they are treated as approved/published product content.

- Foundation Strength exercise drafts.
- `content/staging/free-exercise-db-sample.json` — 6 draft exercise candidates imported from `yuhonas/free-exercise-db` (public domain), generated 2026-09-17 by `npm run import:free-exercise-db`. Not production content; see REQ-20260913-001.
- `src/domain/content/fixtures/foundationStrengthStarter.ts` — 9 draft exercises across 3 templates (Full-Body A, Full-Body B, Quick 10), live in the app since 2026-09-18. Names/instructions verbatim from `yuhonas/free-exercise-db`; set/rep/rest prescriptions are conventional beginner-bodyweight defaults chosen by Claude Code, not coach-reviewed. `cues`/`commonErrors` empty.
- `public/exercise-media/*/{0,1}.jpg` — 18 start/finish movement photos copied verbatim from `yuhonas/free-exercise-db` @ `a859101d` (repo is Unlicense/public-domain; its README directs users to use the images locally; upstream credits imagery to `wrkout/exercises.json`). Fine for this private home-only app; re-verify the `wrkout` origin before any public distribution. To be superseded by Pixel Bloom exercise media (Batch 7) when delivered — swap `mediaManifest` paths, no code change.
- Balance Foundation exercise/progression drafts.
- Any future progression/regression/substitution edge that changes difficulty or workout coverage.
- ChatGPT-generated exercise visuals before production use.
- Exercise media shot lists/manifests before marking assets approved.
- Any architectural exception to the no-backend/offline-first V1 boundary.

Do not silently promote draft content because implementation needs a value.
