# Profile Tabs Pill Design

**Date:** 2026-03-09

## Scope

Restyle the profile overview tabs to match the `BusinessDetail` pill/tablist visual language while preserving profile-specific icons.

## Approved Direction

Apply a local `ProfileScreen` update instead of modifying the shared `TabMenu` component:

- Replace the underline tab bar with a rounded pill frame
- Keep the four profile icons
- Keep four equal-width tabs without horizontal scrolling
- Use orange active pill `#EB8100`
- Use white active icon/text
- Use white inactive pill background with gray `#71717A` icon/text
- Remove the underline indicator entirely

## Constraints

- Do not change the profile tab content behavior
- Do not change the tab order
- Do not refactor other profile layout sections
- Keep the implementation local to `ProfileScreen`

## Failure Modes

- Labels may wrap or clip if the tab height is too small
- A shared-component refactor would increase scope unnecessarily
- Leaving underline styles around could create visual regressions later

## Verification

- Add a file-based regression verifier for the new tab style tokens
- Run the verifier before and after the UI change
- Run `npx tsc --noEmit`
