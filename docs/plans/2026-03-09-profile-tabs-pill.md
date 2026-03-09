# Profile Tabs Pill Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Restyle the profile overview tabs to use the same pill-style visual system as `BusinessDetail` while preserving icons.

**Architecture:** Keep the implementation local to `ProfileScreen` and replace the current underline tab bar with a segmented pill container. Protect the expected token set with a small regression verifier script.

**Tech Stack:** Expo 54, React Native 0.81, TypeScript, `tsx`

---

### Task 1: Add regression verifier

**Files:**
- Create: `scripts/verify-profile-tabs-pill-style.ts`

**Step 1: Write the failing test**

Check for:

- `tabBar` white background and rounded bordered frame
- `tabItemActive` orange background
- `tabLabel` gray inactive text
- `tabLabelActive` white active text
- active icon color switches to white
- tab buttons expose `accessibilityRole="tab"`

**Step 2: Run test to verify it fails**

Run: `npx tsx scripts/verify-profile-tabs-pill-style.ts`

Expected: FAIL while the old underline tab styles still exist.

### Task 2: Update ProfileScreen tabs

**Files:**
- Modify: `screens/profile/ProfileScreen.tsx`

**Step 1: Replace underline markup**

- Remove the underline view
- Add active/inactive pill styles on the tab button itself
- Keep icons and labels centered vertically

**Step 2: Replace underline styles**

- Change `tabBar` to a pill frame
- Add `tabItemIdle` and `tabItemActive`
- Update text colors for active/inactive states
- Remove unused underline styles

### Task 3: Verify

**Files:**
- Test: `scripts/verify-profile-tabs-pill-style.ts`

**Step 1: Run regression verifier**

Run: `npx tsx scripts/verify-profile-tabs-pill-style.ts`

Expected: PASS

**Step 2: Run type check**

Run: `npx tsc --noEmit`

Expected: No new type errors.
