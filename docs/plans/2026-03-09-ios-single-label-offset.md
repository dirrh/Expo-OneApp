# iOS Single Label Offset Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Move the iOS single-marker business name visibly closer to the pin.

**Architecture:** Change only the single-layer label offset constant in the iOS WebView/MapLibre path and lock the new value with a focused verifier. Leave badge geometry and DOM marker label offsets unchanged.

**Tech Stack:** React Native, TypeScript, `tsx`

---

### Task 1: Lock The New iOS Single Label Offset

**Files:**
- Create: `scripts/verify-ios-single-label-offset.ts`

**Step 1: Write the failing test**

Require:
- `components/discover/DiscoverMap.native.tsx` contains `var SINGLE_MARKER_LABEL_TEXT_OFFSET_Y = 0.2;`
- `SINGLE_LABEL_OFFSET_Y_PX` stays unchanged

**Step 2: Run test to verify it fails**

Run: `npx tsx scripts/verify-ios-single-label-offset.ts`
Expected: FAIL because the current value is still `0.5`.

### Task 2: Apply The Minimal Offset Change

**Files:**
- Modify: `components/discover/DiscoverMap.native.tsx`
- Test: `scripts/verify-ios-single-label-offset.ts`

**Step 1: Write minimal implementation**

Change only:
- `SINGLE_MARKER_LABEL_TEXT_OFFSET_Y` from `0.5` to `0.2`

**Step 2: Run test to verify it passes**

Run: `npx tsx scripts/verify-ios-single-label-offset.ts`
Expected: PASS

### Task 3: Regression Verification

**Files:**
- Test: `scripts/verify-ios-single-label-offset.ts`
- Test: `scripts/verify-ios-single-marker-canvas-compose.ts`
- Test: `scripts/verify-ios-single-marker-progressive-sync.ts`

**Step 1: Run regression checks**

Run:
- `npx tsx scripts/verify-ios-single-label-offset.ts`
- `npx tsx scripts/verify-ios-single-marker-canvas-compose.ts`
- `npx tsx scripts/verify-ios-single-marker-progressive-sync.ts`
- `npx tsc --noEmit`

Expected: PASS
