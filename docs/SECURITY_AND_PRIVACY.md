# Security and Privacy Model

**Status:** AUTHORITATIVE SECURITY CONTEXT  
**Scope:** private/local-first PWA, no required backend/authentication

The app stores fitness history, body-weight data, body measurements, progress photos, routines and profile names. Treat that information as sensitive personal data even though the product is not a medical record system.

## 1. Threat model

### We protect against
- accidental cross-profile data mixing;
- malformed/imported data corrupting durable state;
- arbitrary third-party script/resource loading where avoidable;
- data loss from browser storage failure/eviction via export/recovery design;
- accidental destructive actions;
- runtime network dependency unexpectedly blocking workouts;
- stale/compromised upstream media becoming an untracked product dependency.

### We do not claim to protect against
- another person with access to an unlocked device/browser profile;
- a compromised operating system/browser;
- physical device theft without OS-level protection;
- malicious extensions with broad browser privileges;
- forensic recovery guarantees.

Local profiles are organization/isolation inside the app, **not authentication**.

The Hubby PIN (gating the reward shop and love notes) is the same kind of soft household gate, one notch further: a salted SHA-256 hash with an escalating guess cooldown, intended to stop casual peeking/tampering by the other person sharing the device, never a real security boundary.

## 2. Data classification

### Sensitive local user data
- profile identity/name;
- workout/session history;
- progression/familiarity;
- custom routines/schedule;
- body weight and body measurements;
- other activities (workouts done outside the app);
- progress photos (the most sensitive data the app holds: pictures of a person's body);
- check-in responses;
- settings/preferences where they reveal behavior.

### Public/application data
- curated exercise definitions;
- public exercise-library records;
- theme assets;
- app code/build metadata.

### Export files
Treat exports as sensitive because they can contain most or all local user data in portable form. Since 2026-10-29 they also carry progress photos (base64), which makes them both larger and more sensitive; the backup card says so.

## 3. Local persistence rules

- use IndexedDB/Dexie for durable app truth;
- localStorage may hold only trivial bootstrap/profile metadata where already designed, never authoritative workout history;
- validate data at persistence/import boundaries;
- explicit destructive reset/profile deletion requires confirmation;
- avoid logging sensitive complete records to console in production;
- no secret/API credential should ever be embedded in client source or export files.

### Progress photos (owner decision 2026-10-29)
- taken through the phone's own camera or file picker (`<input type="file" accept="image/*" capture="user">`); the app never opens a camera stream, never analyzes a picture, and has no pose tracking;
- re-encoded on the device before storage (decoded, scaled to at most 1280 px, JPEG 0.8 through a canvas), so EXIF, GPS location, device and other metadata are not kept;
- stored only as Blobs in the active profile's IndexedDB (`progressPhotos`), shown through short-lived `blob:` object URLs that are revoked when the screen closes;
- never uploaded, shared or synced: they leave the device only inside a backup file the person saves herself;
- deleting one removes the picture data and keeps a tombstone row (no picture), so importing an older backup can't bring it back;
- another profile's backup never imports photos (or measurements or activities);
- adding a photo re-asks for persistent storage; a full or failing store is reported as a storage problem, never a network one.

## 4. Network minimization

Core workouts should not need the network after required content is cached.

Prefer:
- same-origin static application assets;
- committed/pinned curated workout media;
- lazy fetching only for non-critical library media;
- no analytics/advertising trackers by default;
- no third-party JavaScript runtime dependencies loaded from CDNs.

Remote library media is a convenience/performance/provenance choice, not part of durable local truth. If an exercise becomes curated/offline-guaranteed, promote required media to controlled local assets.

## 5. Content Security Policy

A restrictive Content Security Policy is desirable defense in depth for a static SPA because CSP limits which scripts/resources a page may load and reduces XSS impact.

Reference:
- MDN CSP guide: https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/CSP
- OWASP CSP Cheat Sheet: https://cheatsheetseries.owasp.org/cheatsheets/Content_Security_Policy_Cheat_Sheet.html

Deployment-specific CSP must be tested against:
- Vite production chunks;
- styles/fonts;
- images/media sources intentionally allowed;
- service-worker registration;
- any current upstream exercise-image host.

Do not weaken CSP globally merely to make one unreviewed remote source work.

## 6. Import trust boundary

Backup/content import is untrusted input even when the file came from the user.

Required behavior:
- parse defensively;
- validate schema/version before writes;
- reject impossible/unsafe shapes;
- do not execute imported strings as code;
- do not accept arbitrary URLs/scripts as executable resources;
- preserve or explicitly migrate known versions;
- avoid partial destructive imports where rollback is impossible;
- test duplicate event/result IDs and invalid references;
- imported photos must be base64 whose bytes are really JPEG, PNG or WebP (magic-byte check at parse time, size-capped per row); the stored type comes from those bytes, never from the file's claim, so an SVG or script can't be smuggled in as a "photo".

## 7. Exercise/content provenance

For imported/open-source exercise data record:
- upstream repository/source;
- pinned revision/version where practical;
- license;
- normalization/import method;
- review status;
- whether media is local or remote.

Do not conflate permissive licensing with instructional/clinical validation.

## 8. Backups and user expectations

Because there is no required account/cloud backup:
- export/import is a resilience feature, not optional polish;
- settings/about should make the local-only storage model understandable;
- errors caused by local storage should not tell the user to check network connectivity;
- future storage diagnostics may expose usage/quota/persistence state without sending data anywhere.

WebKit storage policy reference: https://webkit.org/blog/14403/updates-to-storage-policy/

## 9. Dependency discipline

Before adding a dependency ask:
- does it execute at runtime?
- does it send data externally?
- does it pull remote code/content?
- does it increase supply-chain risk?
- can the current platform/runtime already do the job?

Prefer well-understood browser APIs and existing stack capabilities over unnecessary packages.

## 10. Privacy-preserving defaults

Default behavior:
- no account;
- no telemetry;
- no ad SDK;
- no social sharing;
- no public profile;
- no camera/mic streams (progress photos use the OS camera/file picker only, by explicit owner decision 2026-10-29);
- no cloud AI;
- no automatic external upload of exports/history.

Any future feature that changes these defaults requires an explicit product/privacy decision.

## 11. Security acceptance checks

Before release:
- no committed secrets;
- dependencies/build audit has no unexplained critical issue;
- profile isolation covered by tests;
- import validator rejects malformed payloads;
- destructive controls are guarded;
- remote origins are enumerated and intentional;
- CSP/deployment policy documented where hosting allows it;
- app remains usable if optional remote media is unavailable;
- backup/export contains only expected data;
- no sensitive user record appears in public static assets/source by mistake.