# Business Detail Colors Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Align `BusinessDetail` color tokens with the provided mockup without changing layout behavior.

**Architecture:** Update only the style literals that differ from the design export and protect them with a small file-based regression verifier. Keep the change local to `BusinessDetail`-related components.

**Tech Stack:** Expo 54, React Native 0.81, TypeScript, `tsx`

---

### Task 1: Add regression verifier

**Files:**
- Create: `scripts/verify-business-detail-colors.ts`

**Step 1: Write the failing test**

Create a verifier that checks for:

- `BusinessDetailScreen.container.backgroundColor === "#FFFFFF"`
- `BusinessDetailScreen.menuWrapper.backgroundColor === "#FFFFFF"`
- `TabMenu.frame.backgroundColor === "#FFFFFF"`
- `TabMenu.tabText.color === "#71717A"`
- `HeroActions` default icon color is `#000000`

**Step 2: Run test to verify it fails**

Run: `npx tsx scripts/verify-business-detail-colors.ts`

Expected: FAIL because the old literals are still present.

### Task 2: Apply the minimal style fixes

**Files:**
- Modify: `screens/BusinessDetailScreen.tsx`
- Modify: `components/discover/TabMenu.tsx`
- Modify: `components/discover/HeroActions.tsx`

**Step 1: Update screen and menu backgrounds**

- Set `BusinessDetailScreen` container to `#FFFFFF`
- Set the non-sticky menu wrapper background to `#FFFFFF`

**Step 2: Update tab palette**

- Set `TabMenu` frame background to `#FFFFFF`
- Set inactive tab text to `#71717A`

**Step 3: Update hero action icon default color**

- Set the default hero action icon color to `#000000`

### Task 3: Verify

**Files:**
- Test: `scripts/verify-business-detail-colors.ts`

**Step 1: Run regression verifier**

Run: `npx tsx scripts/verify-business-detail-colors.ts`

Expected: PASS

**Step 2: Run TypeScript check if available**

Run: `npx tsc --noEmit`

Expected: No new type errors caused by the change.
