---
name: impeccable
description: Refine an existing frontend screen or component in this app (React Native + Expo, iOS/Android/web) toward the project's Apple-style, bubbly, glossy, fresh health look. Use for polish, animate, delight, colorize, typeset, layout, bolder, quieter, distill, clarify, onboard, adapt, or audit requests. Refinement only; it does not create new design systems or replace the visual direction.
version: 4.1.2-project
user-invocable: true
argument-hint: "[polish|animate|delight|colorize|typeset|layout|bolder|quieter|distill|clarify|onboard|adapt|audit] [target]"
license: Apache 2.0
---

Project copy of the Impeccable skill (v4.1.2, Apache 2.0), trimmed to refinement commands only. Build/redesign commands (`craft`, `shape`, `init`, `document`, `extract`, `new-work`, `overdrive`, `live`), the critique flow, hooks, and all scripts were intentionally left out.

**Missing pieces:** if a reference tells you to run a `node .claude/skills/impeccable/scripts/...` command, or to follow `live.md` or `new-work.md`, skip that step. If a change would replace the visual direction below, stop and ask the team instead.

## Project design direction (pinned brief)

This brief wins over any default or "refuse" rule in the references.

- **Feel:** calm, clean, optimistic health app. Apple-native in spirit, but our own identity.
- **Shape:** bubbly. Generous corner radii, pill-shaped buttons and chips, rounded cards, soft continuous curves.
- **Gloss:** glossy is a chosen material, not decoration. Use translucent blur materials and a subtle highlight on bars, sheets, and primary cards/buttons only. Shadows are soft and offset, never hard.
- **Color:** fresh, light base with full Dark Mode support. One fresh tint (green/teal family) drives interactive elements. Semantic colors for success/warning/error.
- **Type:** system font (San Francisco on iOS), Dynamic Type sizes, clear weight steps.
- **Motion:** gentle, springy, purposeful. Always honor Reduce Motion.
- **Controls:** platform-native controls and a single consistent icon set. Web shares the same tokens.
- **Two sides, one look:** patient screens are friendly and guided; clinician screens are denser and scannable (Operate mode), with the same materials and tint.

## How to refine

- **Refinement preserves.** Keep existing identity, behavior, copy, and everything outside the requested scope. Ask before replacing factual copy.
- **Mode:** app screens here are **Operate** (task completion). The placement guide and onboarding lean **Read** (understanding). See [operate.md](reference/operate.md).
- **Native first.** On iOS/Android follow [ios.md](reference/ios.md) and [android.md](reference/android.md), and use the `.native` variants of adapt and audit.
- Load [craft-floor.md](reference/craft-floor.md) right before editing UI. Its glass/blur rule is overridden by the gloss line above, within those limits.
- Verify in one batched pass (phone + web), fix everything it shows, confirm once, stop.

## Commands

| Command | What it does | Reference |
|---|---|---|
| `polish [target]` | Final quality pass before shipping | [polish.md](reference/polish.md) |
| `animate [target]` | Purposeful motion and micro-interactions | [animate.md](reference/animate.md) |
| `delight [target]` | Personality and memorable touches | [delight.md](reference/delight.md) |
| `colorize [target]` | Strategic color within the brief | [colorize.md](reference/colorize.md) |
| `typeset [target]` | Typography hierarchy | [typeset.md](reference/typeset.md) |
| `layout [target]` | Spacing, rhythm, hierarchy | [layout.md](reference/layout.md) |
| `bolder [target]` | Amplify a bland screen | [bolder.md](reference/bolder.md) |
| `quieter [target]` | Tone down a loud screen | [quieter.md](reference/quieter.md) |
| `distill [target]` | Strip to essentials | [distill.md](reference/distill.md) |
| `clarify [target]` | UX copy, labels, error messages | [clarify.md](reference/clarify.md) |
| `onboard [target]` | First-run, empty states, placement guide | [onboard.md](reference/onboard.md) |
| `adapt [target]` | Screen sizes and devices | [adapt.md](reference/adapt.md) · native: [adapt.native.md](reference/adapt.native.md) |
| `audit [target]` | Accessibility, responsiveness, quality checks | [audit.md](reference/audit.md) · native: [audit.native.md](reference/audit.native.md) |

No argument: ask which command and target. Explicit command: load its reference and follow it.
