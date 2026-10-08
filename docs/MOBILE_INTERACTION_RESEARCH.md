# Blockbound mobile roll interactions — research and implementation

Updated 8 October 2026. Targets the React/Three.js web client; packaging the web client into the native Android shell is tracked separately.

## Source-backed design observations

- **Dice Dreams:** A published gameplay guide describes a prominent roll button that rolls on tap and starts automated rolls on a sustained hold. Source: https://scrambly.io/blog/tutorial/dice-dreams-tutorial
- **Coin Master:** Its help centre explains that a separate multiplier control cycles the stake; higher multipliers cost more spins and increase normal rewards. Sources: https://support.coinmastergame.com/hc/en-us/articles/360001265554-Why-are-more-Spins-being-used-each-time and https://support.coinmastergame.com/hc/en-us/articles/360001257693-How-does-the-Spin-Multiplier-work
- **Board Kings:** A gameplay review highlights a simple, prominent roll action and an adjustable camera anchored to the player token. Source: https://thecasualappgamer.com/board-kings/
- **Android accessibility:** Google's guidance recommends at least 48 × 48 dp hit targets; avoid thin buttons as the only way to access core modes. Source: https://developer.android.com/guide/topics/ui/accessibility/views/apps-views

**Application:** borrow interaction *principles*, not layout screenshots, characters, assets, branded effects or copyrighted art. A native-feeling mobile game has an obvious, thumb-reachable action and an uncomplicated state.

## Interaction contract implemented in the web branch

| Input | Result |
| --- | --- |
| Tap main Roll | Exactly one roll, subject to energy and encounter state |
| Press and hold Roll for ~540 ms | Start **bounded** Auto Roll using a previously selected batch of 5, 10 or 25 |
| Release after long hold | **No accidental manual roll**: suppress the synthetic click after a hold |
| Tap main Roll while Auto is active | Stop scheduling new rolls; allow already-committed roll to finish |
| Tap Build, Daily Rewards, Settings, another HUD surface | Stop queued Auto Roll immediately; execute the requested action |
| Encounter, reward acknowledgement, background tab | Pause or terminate auto-play as appropriate; do not silently choose targets |
| Release, drag away or cancel before long-press threshold | Cancel hold; avoid accidental auto-start |
| Keyboard/switch navigation | Use explicit Start/Stop Auto action inside Roll Preferences; standard click rolls once |
| Adjust multiplier | Choose affordable stake separately from batch count |
| Wide/tablet portrait | Cap desktop game column and use board-sized world scene without full-width action bars |

## Safety and agency

The auto batch is constrained by **both** number of rolls and an energy budget established at activation. Auto-adjusting a multiplier must never increase the pre-authorised maximum energy spend. Interacting with Build or another control while auto-playing cancels pending rolls before applying that other action. Encounter decisions always require explicit input.

The Hold button has a visible press-progress treatment and explanatory subtitle; this is discoverability assistance, not a requirement to use long press for accessibility. Users with limited dexterity can access the same function via the labelled preferences sheet.

## Acceptance scenarios

1. A 150-ms tap makes one roll and never starts Auto.
2. A sustained 600-ms hold starts a batch and **does not** produce a roll or cancellation when the finger is lifted.
3. Moving the touch more than 12 CSS px before 540 ms cancels the long-press timer.
4. Tapping Roll during an auto batch stops new queued rolls; currency/energy is never reverted for the already committed roll.
5. Tapping Build or Daily Rewards stops auto-play and opens that modal with normal focus/click behaviour.
6. Selecting Quick, changing batch size or auto-acknowledge from Settings stops active auto-play before changing settings.
7. A raid/heist pauses for player choice, even with Auto OK enabled.
8. Portrait screens 320×568, 360×640, 390×844, 430×932 and wider Android tablets retain a legible board, primary Roll CTA and touchable settings control.
9. Keyboard click rolls normally; an accessible explicit Auto action is available without long press.
10. TypeScript, pure-rule tests and Vite build pass in the linked deployment.

## Future polish after device QA

- Add subtle optional haptics on press threshold and dice impacts; avoid generating a haptic every frame.
- Record and improve the ratio of accidental long holds, manual overrides and interrupted batches through consent-aware instrumentation.
- Animate the dice and token with reduced-motion preferences for **3D** as well as CSS.
- Verify screen-reader focus return after closing modals, Android system-back handling and iOS Safari context-menu behaviour.
- Profile mid-range Android WebGL memory and thermal performance before increasing voxel geometry density.
