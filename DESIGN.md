---
version: alpha
name: "atama"
description: "A calm personal-finance interface shaped by the clarity and rhythm of a well-kept ledger."
colors:
  canvas: "#f8f7f4"
  paper: "#ffffff"
  ink: "#1c1917"
  secondary: "#6f6963"
  border: "#e5e2db"
  primary: "#1a6b54"
  primary-hover: "#145a46"
  positive: "#167a50"
  negative: "#dc2626"
typography:
  sans:
    fontFamily: "Plus Jakarta Sans, system-ui, sans-serif"
  data:
    fontFamily: "Plus Jakarta Sans, system-ui, sans-serif"
rounded:
  DEFAULT: "0.75rem"
  sm: "0.5rem"
  md: "0.75rem"
  lg: "1.25rem"
  pill: "999px"
spacing:
  control: "0.75rem"
  card: "1.5rem"
  section: "6rem"
  page-max: "74rem"
components:
  button:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.paper}"
    rounded: "{rounded.md}"
    height: "3rem"
  button-hover:
    backgroundColor: "{colors.primary-hover}"
    textColor: "{colors.paper}"
    rounded: "{rounded.md}"
    height: "3rem"
  card:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    rounded: "{rounded.lg}"
  input:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
  tabs:
    backgroundColor: "{colors.canvas}"
    textColor: "{colors.secondary}"
    rounded: "{rounded.pill}"
  success-status:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.positive}"
    rounded: "{rounded.md}"
  error-status:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.negative}"
    rounded: "{rounded.md}"
  dialog:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    rounded: "{rounded.lg}"
  danger-button:
    backgroundColor: "{colors.negative}"
    textColor: "{colors.paper}"
    rounded: "{rounded.md}"
    height: "3rem"
  divider:
    backgroundColor: "{colors.border}"
    height: "1px"
---

# atama Design System

## Overview

### Creative North Star

Atama should feel like a well-kept personal ledger laid open on a quiet desk: ordered, reassuring, and immediately legible without feeling institutional.

### Product context and register

- **Audience and primary job:** People evaluating or using a personal-finance dashboard to understand balances, spending, cash flow, and budgets.
- **Target market and evidence:** English-speaking prospective users; current product copy and currency fixtures use English and USD.
- **Locale and language policy:** English only. Copy uses plain, active language and sentence case.
- **Usage scene:** Short, focused visits on phone or desktop. Financial figures must be easy to scan.
- **Register:** Hybrid. Public routes can be expressive; authentication and dashboard routes prioritize familiarity and trust.
- **Memorable signature:** Subtle ruled ledger lines paired with tabular financial figures.
- **Restraint:** Controls, forms, charts, and status messages remain quiet and conventional.
- **Anti-references:** No fintech neon, glass effects, decorative gradients, stock photography, or generic luxury serif treatment.
- **Token ownership/runtime mapping:** This file defines intent and mirrors the canonical runtime values in `app/globals.css`; changes to durable tokens update both files together.

## Colors

The warm canvas and white paper surfaces reduce glare while ink and secondary text provide strong hierarchy. Moss is reserved for brand emphasis, selection, and primary actions. Positive and negative colors always appear with text or symbols, never as the only signal. The product currently supports a light theme only; forced-colors mode returns control colors to the system.

## Typography

Plus Jakarta Sans owns display, body, control, and data roles. Large display text uses tight tracking sparingly. Currency, percentages, dates, and account values use tabular numerals. Uppercase is limited to compact utility labels with increased tracking.

## Layout

Public content uses a fluid 74rem maximum with 1.25rem mobile gutters and 2rem desktop gutters. Sections use generous separation, while related financial rows stay compact. Public hero and auth surfaces become one column below 800px. Async or conditional content reserves enough space to avoid moving nearby controls.

## Elevation & Depth

Hierarchy comes from tonal surfaces, hairline borders, and restrained shadows. Primary cards may use one soft shadow; nested cards and routine data rows stay flat. Ledger rules are structural dividers, not decoration on every surface.

## Shapes

Cards use 1.25rem radii, fields and standard buttons use 0.75rem, and compact selectors or status pills may use full rounding. Borders remain one pixel. Icons use rounded strokes and never sit inside ornamental containers without a functional reason.

## Components

### Foundational visual states

Interactive elements have visible hover, focus-visible, active, disabled, and busy states. Focus uses a moss outline with canvas separation. Error and success states include explicit text. Skeleton motion stops under reduced-motion preferences.

### Buttons and actions

Primary moss buttons are reserved for one main action per region. Secondary actions use paper surfaces and borders; tertiary navigation uses text. Busy labels preserve control width, and disabled controls do not fire handlers.

### Navigation and data display

The public header stays visually light. Tabs use semantic selection and keyboard behavior. Data lists preserve aligned figures, visible labels, and stacked mobile representations. Charts include a textual equivalent.

### Forms and overlays

Every field has a persistent label. Help and error text are associated programmatically. Password fields are masked by default and include an accessible reveal control. Product forms use `noValidate` and application-owned validation.

Destructive operations use an application-owned alert dialog. The title names the affected resource, the body explains retained and hidden data, Cancel receives initial focus, and provider failures stay in the dialog with a retry path. The pending state locks dismissal and preserves action geometry.

### Iconography

Lucide is the canonical icon family for new shared controls. Use 16–20px rounded-stroke icons; icon-only controls require accessible names.

### Motion

One gentle entrance sequence may establish a page. Routine controls use 150–220ms transitions. Motion communicates selection or arrival and is removed when reduced motion is requested.

### Content and data visualization

Copy is calm, specific, and user-sided. Actions say what they do. USD values use `Intl.NumberFormat`; dates use `Intl.DateTimeFormat`. Charts use moss for income and warm neutral/negative tones for spending, with text summaries.

## Do's and Don'ts

- **Do:** Let real sample financial data carry the visual story.
- **Do:** Use ledger rules and tabular figures consistently but sparingly.
- **Don't:** introduce ornamental color gradients, glassmorphism, decorative blobs, or a second display font.
- **Don't:** trade labels, contrast, focus, or stable layout for minimalism.
