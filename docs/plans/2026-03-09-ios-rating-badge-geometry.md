# iOS Rating Badge Geometry Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Make the new iOS canvas-composed rating badge match the old compact-pin badge position and size exactly.

**Architecture:** Reuse the original badged-icon badge geometry inside the WebView canvas renderer instead of hand-tuned approximations. Lock the expected geometry with a regression verifier that checks both the structural code path and the clean compact-pin assets.

**Tech Stack:** React Native, TypeScript, `tsx`, `canvas`

---

### Task 1: Lock Exact Badge Geometry

**Files:**
- Modify: `scripts/verify-ios-single-marker-canvas-compose.ts`

**Step 1: Write the failing test**

Add checks that require the runtime renderer to use the original badge-generation source canvas geometry:
- source canvas `165x226`
- badge top `35`
- font size `30`
- scaled badge overlay drawn back into the compact-pin frame

**Step 2: Run test to verify it fails**

Run: `npx tsx scripts/verify-ios-single-marker-canvas-compose.ts`
Expected: FAIL because the current runtime badge still uses hand-tuned direct draw values.

### Task 2: Replace Approximate Runtime Badge Geometry

**Files:**
- Modify: `components/discover/DiscoverMap.native.tsx`

**Step 1: Write minimal implementation**

Replace the current direct badge draw math with the original badge-generation math rendered into an offscreen badge canvas and scaled into the compact-pin frame.

**Step 2: Run test to verify it passes**

Run: `npx tsx scripts/verify-ios-single-marker-canvas-compose.ts`
Expected: PASS

### Task 3: Regression Verification

**Files:**
- Test: `scripts/verify-ios-single-marker-canvas-compose.ts`
- Test: `scripts/verify-ios-single-marker-progressive-sync.ts`

**Step 1: Run regression checks**

Run:
- `npx tsx scripts/verify-ios-single-marker-canvas-compose.ts`
- `npx tsx scripts/verify-ios-single-marker-progressive-sync.ts`
- `npx tsc --noEmit`

Expected: PASS
