# R&D Backlog

Non-blocking support work that ChatGPT can research/specify/produce and promote into GitHub. Current product authority is v0.7.

## Context-engineering baseline now delivered

The following previously broad gaps now have authoritative framing:

- product scope reconciliation: `docs/SOURCE_OF_TRUTH_V07.md`;
- context loading/authority map: `docs/CONTEXT_ENGINEERING_INDEX.md`;
- current architecture/invariants: `docs/ARCHITECTURE.md`;
- iPhone/PWA platform contract: `docs/IOS_PWA_RUNTIME.md`;
- quality/reliability strategy: `docs/TESTING_AND_RELIABILITY.md`;
- privacy/security model: `docs/SECURITY_AND_PRIVACY.md`;
- Pixel Bloom creative -> frontend contract: `docs/PIXEL_BLOOM_FRONTEND_CONTEXT.md`;
- explicit delivery gates: `docs/DEFINITION_OF_DONE.md`;
- trusted external source index: `docs/RESEARCH_SOURCES.md`;
- current FOSS product benchmark: `docs/rnd/foss-fitness/PRODUCT_BENCHMARK_2026-09.md`.

These documents define what needs to be proven; the focused corpora/assets below are still valuable implementation inputs.

## P0 — highest leverage

1. **True offline + WebKit acceptance pack**
   - concrete Playwright project/test cases for WebKit/iPhone-like execution;
   - real network-disabled relaunch/resume/complete path;
   - stale cache/new deploy/active-session scenarios;
   - service-worker update failure matrix.

2. **Session durability edge-case corpus**
   - orphan plan/no start event;
   - atomic session-start acceptance cases;
   - refresh/close/reopen;
   - duplicate/retried events;
   - background rest expiry;
   - durable rest extension;
   - failed IndexedDB writes;
   - clock change cases;
   - finish early.

3. **Foundation Strength production-review pack**
   - finalize exercise instructions, cues, common errors, prescriptions, provenance and review metadata;
   - separate imported discovery content from approved coaching content;
   - ensure curated guaranteed-offline media is controlled locally.

4. **Export/import corruption corpus**
   - old schema/version;
   - missing/unknown fields;
   - duplicate events/results;
   - bad references/timestamps;
   - partial import/rollback;
   - profile-scope collision;
   - round-trip truth comparison.

5. **Pixel Bloom first production integration pack**
   - mascot/app-icon approved binaries in repo;
   - UI SVG primitive set;
   - Today/Check-In/Complete visual states;
   - first 3–5 gold-standard exercise frame loops;
   - Full/Reduced/Off fallbacks;
   - asset byte/cache budget.

## P1 — product depth

6. **Theme component-state matrix**
   - active/rest/completed/disabled/warning/success/focus/error states;
   - Pixel Bloom + Savage Core;
   - Full/Reduced/Off;
   - contrast/focus/touch review.

7. **Production progression/substitution relationships**
   - reviewed exercise IDs/versions;
   - harder/regression/substitution edges;
   - explicit negative cases;
   - no taxonomy-only inference.

8. **Exercise media production system**
   - shot/key-pose templates;
   - start/mid/finish consistency rubric;
   - anatomy/form review checklist;
   - sprite/frame/WebP/GIF export recipes;
   - alt text/static fallback requirements.

9. **Progress analytics verification pack**
   - PR/e1RM/volume/streak/body-weight fixtures;
   - clearly distinguish raw durable history from derived projections.

10. **Performance/storage budget**
    - startup JS/CSS;
    - generated library lazy-load cost;
    - curated offline media budget;
    - Pixel Bloom animation budget;
    - Cache Storage + IndexedDB diagnostic thresholds.

## P2 — accessibility / resilience / future-proofing

11. **Accessibility scenario pack**
    - VoiceOver-oriented semantic cases;
    - large text;
    - one-handed interaction;
    - focus order/obscuring;
    - reduced motion;
    - autoplaying/looping animation control;
    - target-size audit.

12. **Content-pack version/dependency migration fixtures**
    - renamed/retired exercise IDs;
    - old custom routine referencing removed library item;
    - pack upgrade while historical SessionPlans remain immutable.

13. **Storage pressure / persistence diagnostics**
    - `navigator.storage.estimate()` interpretation;
    - persistence request behavior;
    - QuotaExceeded handling;
    - export warning UX thresholds.

14. **Security/deployment hardening pack**
    - CSP compatible with actual hosting/static resources;
    - remote origin inventory;
    - dependency/network audit checklist;
    - backup privacy review.

## Deferred unless product direction changes

- cloud account/sync;
- social feed/sharing network;
- runtime AI coach;
- camera form tracking;
- microphone/voice coach;
- mandatory wearables/sensors;
- GPS/endurance tracking engine.
