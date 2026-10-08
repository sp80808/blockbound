# Blockbound web saves and interruption recovery

**Scope:** React/TypeScript \`web/\` client only; Android currently loads a different static HTML bundle. This feature does **not** migrate Kotlin SharedPreferences saves or grant trusted server-side progress.

## Why the roll logic changed

Previously a roll **spent dice energy first** and awarded coins/materials after several asynchronous animation timers. Reloading partway through could leave a half-finished turn. Persisting raw Zustand state during that gap would make this worse.

The updated flow commits **the entire authoritative turn** in one Zustand transition:
1. Check affordability and pending encounter.
2. Generate one dice pair, compute path and final board tile, resolve landing.
3. Deduct energy, grant landing rewards, update total rolls, progress and final logical position **once**.
4. Persist that complete, committed state immediately.
5. Show dice movement, camera sequence and token travel using a separate \`visualTile\` value.
6. Open the already-committed raid/heist or acknowledgement modal after presentation.

If the page is interrupted during step 5, reload restores the **finished turn** at its destination, along with any pending encounter. There is no attempt to reroll or grant the tile reward a second time.

## Save format

- Browser key: \`blockbound:web:save:v1\`.
- Envelope: \`{ version: 1, savedAt, progress }\`.
- Only the whitelisted game model fields are stored.
- No 3D mesh objects, React UI components, timeouts, transient camera state, \`visualTile\`, or auto-roll sessions are persisted.
- Buildings are merged by **known district/building IDs** from the current code so stray or renamed assets do not overwrite trusted game content.
- Values are validated: numeric bounds, board tile 0–31, tier 0–4, known multiplier values, shield and dice-energy caps, known save version, size limit, last roll dice totals, and valid encounter choices.
- Corrupt/unknown-version storage is ignored for gameplay; before defaults are saved, the original string is copied to `blockbound:web:save:invalid-backup` (never automatically overwritten). If that backup cannot be written, the storage adapter refuses to overwrite the original. Recovery/export tooling is a follow-up.

The schema and parsing live in \`web/src/game/gameSave.ts\`; state integration is in \`web/src/store/gameStore.ts\`.

**Limitation:** LocalStorage is editable by the player and cannot serve as authority for multiplayer ranking, purchases or high-value competitive rewards. Before online features, move currency/reward transactions to a backend with per-action idempotency and auditability.

## Offline energy recharge

- Adds **1 dice energy every 45 completed seconds** up to the cap.
- Uses a saved UTC millisecond timestamp. Partial intervals are carried between sessions.
- When energy is full, spending starts a fresh refill interval.
- Backgrounding pauses unattended Auto Roll. Returning to the tab recalculates elapsed offline energy.
- Date rollback or malformed/future anchors never directly add free energy.
- HUD displays a real next-charge countdown or \`FULL\`.

Client-clock changes can still be manipulated, so this is suitable only for offline/local play, not a real-money or competitive economy.

## Daily-login streak

On hydration, resumed tab, and periodic recovery checks:
- Yesterday **claimed** → advance the streak to the next day (after day 7, start the new cycle at day 1).
- Yesterday **not claimed** or two or more missed days → reset to day 1.
- Same UTC date → retain the previous claim state.
- A reward can only be claimed once within that local day's state.

This is a UTC-day policy for consistent persistence, not a promise of region-local midnight. Gameplay design can revisit local-day semantics when accounts are introduced.

## Testing

From \`web/\`:

\`\`\`sh
npm install
npm test
npm run typecheck
npm run build
\`\`\`

\`npm test\` includes deterministic roll-rule tests and save/recovery tests:
- full save round trip with district tiers
- encounter persisted after an interrupted roll
- corrupt/unknown/oversized save rejection
- bounds and unknown-building ID sanitisation
- 45-second energy recharge with partial intervals
- cap and clock-rollback safety
- daily streak continuation/reset
- invalid encounter payout rejection

**These tests must actually be run before merging.** Merely committing a test is not evidence of a successful run. Verify the current Vercel deployment quota/status and document limitations if remote building remains blocked.

## Manual acceptance

1. Earn coins, upgrade a building, reload → exact money/materials/tier/board position preserved.
2. Start a roll, hard-refresh during moving dice → once-only energy cost and reward; token at final tile.
3. Interrupt raid/heist before choosing → modal appears after reload with the **same** options and no new roll.
4. Resolve encounter, reload → the same event cannot be claimed again.
5. Turn Auto OK off, roll and reload mid-animation → acknowledgment reappears without duplicate payouts.
6. Hold to auto-roll, background the page → the current committed roll survives, queued rolls stop.
7. Spend below full energy, wait >45 seconds/reopen → appropriate number of charges returned, capped.
8. Change browser date backwards → no additional recharge or increased streak.
9. Claim daily reward, reload → cannot claim again that day.
10. Keep a small Android portrait window, open/close modals → Roll, Build and Save controls remain reachable.

**Follow-ups:** mobile real-device QA; cross-tab save locking; IndexedDB/cloud saves if project grows; change log/migration for future save versions; actual Android bundle integration (issue #4).
