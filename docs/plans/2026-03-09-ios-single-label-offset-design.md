# iOS Single Label Offset Design

## Goal
- Posunúť názov prevádzky na iOS bližšie k single pinu.

## Scope
- Iba iOS single-layer label pod pinom v `DiscoverMap.native.tsx`.
- Bez zmeny badge geometrie.
- Bez zmeny DOM label offsetov pre grouped alebo fallback marker path.

## Chosen Approach
- Znížiť `SINGLE_MARKER_LABEL_TEXT_OFFSET_Y`.
- Nechať ostatné offsety nedotknuté.

## Why
- Toto je najmenší a najbezpečnejší zásah.
- Posúva iba názov pod iOS single pinom.
- Nemení kolízne výpočty pre ostatné marker typy.

## Verification
- Pridať verifier pre novú hodnotu `SINGLE_MARKER_LABEL_TEXT_OFFSET_Y`.
- Spustiť verifier badge compose, verifier progressive sync a `npx tsc --noEmit`.
