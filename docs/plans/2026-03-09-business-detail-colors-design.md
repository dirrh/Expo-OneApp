# Business Detail Colors Design

**Date:** 2026-03-09

## Scope

Align the `BusinessDetail` screen color palette with the provided design export.

## Approved Direction

Use targeted color-token updates instead of a layout rewrite:

- Change the screen background from `#FAFAFA` to `#FFFFFF`
- Change the non-sticky tab wrapper background from `#FAFAFA` to `#FFFFFF`
- Change the tab frame background from `#FAFAFA` to `#FFFFFF`
- Change inactive tab text from `#3F3F46` to `#71717A`
- Change hero action icon default stroke from `#111` to `#000000`

## Constraints

- Keep the existing structure, spacing, and behavior
- Do not refactor unrelated sections
- Keep active orange states as `#EB8100`
- Keep existing white cards and borders unless they already match the export

## Failure Modes

- A broad theme change could accidentally alter other screens
- Changing layout or spacing would go beyond the requested color correction
- Missing a token would keep the screen visually inconsistent with the provided export

## Verification

- Add a small regression verifier for the expected color literals
- Run the verifier before and after the style changes
