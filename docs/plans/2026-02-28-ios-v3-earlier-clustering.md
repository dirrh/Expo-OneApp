# iOS V3 Earlier Clustering Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Keep the iOS V3 map in cluster mode until a closer zoom level so single markers appear later and reduce crash pressure.

**Architecture:** This is an iOS-only threshold adjustment in the zone-mode gate. The change should only raise the `single` enter/exit thresholds in the iOS V3 mode resolver, leaving Android behavior and the clustering renderer untouched. Verification should lock the exact thresholds and preserve the existing hysteresis behavior.

**Tech Stack:** TypeScript, React Native, Expo, local verification scripts

---

### Task 1: Lock The New iOS Threshold Contract

**Files:**
- Modify: `scripts/verify-ios-v3-mode.ts`
- Test: `scripts/verify-ios-v3-mode.ts`

**Step 1: Write the failing test**

Add exact assertions that the exported iOS V3 thresholds are `16.0` for `IOS_V3_SINGLE_ENTER_ZOOM` and `15.6` for `IOS_V3_SINGLE_EXIT_ZOOM`.

**Step 2: Run test to verify it fails**

Run: `npx tsx scripts/verify-ios-v3-mode.ts`
Expected: FAIL because current constants still use the older thresholds.

**Step 3: Write minimal implementation**

No implementation in this task.

**Step 4: Run test to verify it still fails for the expected reason**

Run: `npx tsx scripts/verify-ios-v3-mode.ts`
Expected: FAIL with the new exact-threshold assertion.

**Step 5: Commit**

Skip for this session.

### Task 2: Raise The iOS V3 Single-Mode Thresholds

**Files:**
- Modify: `components/discover/map/ios_v3/useIOSV3ZoneMode.ts`
- Test: `scripts/verify-ios-v3-mode.ts`

**Step 1: Write the failing test**

Already completed in Task 1.

**Step 2: Run test to verify it fails**

Already completed in Task 1.

**Step 3: Write minimal implementation**

Change:
- `IOS_V3_SINGLE_ENTER_ZOOM` from `15.4` to `16.0`
- `IOS_V3_SINGLE_EXIT_ZOOM` from `15.0` to `15.6`

**Step 4: Run test to verify it passes**

Run: `npx tsx scripts/verify-ios-v3-mode.ts`
Expected: PASS

**Step 5: Commit**

Skip for this session.

### Task 3: Regression Verification

**Files:**
- Test: `scripts/verify-ios-v3-mode.ts`
- Test: `scripts/verify-ios-v3-dataset.ts`
- Test: `scripts/verify-ios-marker-render-simulation.ts`
- Test: `tsconfig` via compiler

**Step 1: Write the failing test**

No new test.

**Step 2: Run test to verify current state**

Run:
- `npm run test:ios-marker-sim`
- `npx tsx scripts/verify-ios-v3-dataset.ts`
- `npx tsc --noEmit`

Expected: PASS

**Step 3: Write minimal implementation**

No additional implementation unless a regression appears.

**Step 4: Run test to verify it passes**

Repeat the same commands and confirm green output.

**Step 5: Commit**

Skip for this session.
