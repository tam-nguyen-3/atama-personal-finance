# UX Contract

## Product context

- Audience: Prospective and signed-in personal-finance users.
- Primary jobs: Evaluate atama, explore sample finances, authenticate, and recover account access.
- Target market: English-speaking users.
- Active locales: `en` with USD sample data.
- Accessibility target: WCAG 2.2 AA.

## Business-context sources

| Domain / scope | Authoritative source | Source type | Reviewed date |
|---|---|---|---|
| Authentication and session behavior | `lib/auth.ts`, `proxy.ts` | Verified server contract | 2026-08-25 |
| Public demo isolation | `lib/demo-fixtures.ts`, public route implementation | Product implementation contract | 2026-08-25 |
| Financial data shapes | `types/finance.ts` | Domain types | 2026-08-25 |
| Plaid Item disconnection | Plaid `/item/remove` API and `lib/plaid-items-service.ts` | External provider and verified server contract | 2026-08-26 |

## Visual contract

- Project design context: `DESIGN.md`.
- Runtime token owner: `app/globals.css`, mirrored by `DESIGN.md`.
- Supported theme: light with forced-colors accommodation.

## Canonical UI Map

| Capability | Canonical owner | Source of truth | Allowed variants | Verification |
|---|---|---|---|---|
| Form | Shared auth field and password-field components | This contract | authentication mode | component tests |
| Scrollbar | Global application stylesheet | `DESIGN.md` | geometry exceptions | strict audit |
| Tabs | Radix Tabs through the demo dashboard | This contract | public read-only | keyboard component test |
| Status feedback | Shared inline status banner | This contract | success / error / info | live-region component test |
| Alert dialog | Radix Alert Dialog through `DisconnectBankDialog` | This contract | destructive Plaid Item disconnect | keyboard and recovery component tests |

## Component behavior

- Buttons preserve geometry during submission and expose disabled/busy state.
- Inputs have visible labels, help/error association, focus-visible treatment, and preserved values after failure.
- Password inputs are masked by default and have a named show/hide button.
- Local search filters immediately, exposes a clear button when non-empty, and restores focus after clearing.
- A connected-bank card represents one Plaid Item, even when the same institution is linked more than once.
- Destructive dialogs focus Cancel first, remain open on provider failure, block duplicate confirmation while pending, and restore focus when dismissed.

## Flow ledger

| Operation | Trigger | Pending | Success destination | Success feedback | Failure recovery | Focus outcome | Source ref |
|---|---|---|---|---|---|---|---|
| Sign in | Sign in button | Disabled button, “Signing in…” | Sanitized internal dashboard path | Destination renders | Generic inline error | Error summary | `lib/auth.ts` |
| Sign up | Create account button | Disabled button, “Creating account…” | `/login?registered=1` | Neutral login banner | Generic inline error; retain fields | Error summary | `lib/auth.ts` |
| Request reset | Send reset link button | Disabled button | Stay on form | Generic inline success | Same generic response | Status banner | `lib/auth.ts` |
| Reset password | Set new password button | Disabled button | `/login?reset=1` | Neutral login banner | Invalid/expired guidance | Error summary | `lib/auth.ts` |
| Demo search | Local text input | Immediate local filter | Stay on Transactions tab | Updated result count | No-results guidance | Input; clear returns focus | Public demo contract |
| Disconnect bank | Manage connection, then Disconnect bank | Stable disabled controls, “Disconnecting…” | Stay on dashboard | Inline success status; Item disappears | Provider error remains in dialog with Try again | Returns to invoking control; success continues at dashboard | Plaid `/item/remove` |

## Navigation and responsive behavior

- Every route owns an honest document title through the Next.js metadata API.
- Public navigation exposes Demo, Log in, and Create account; the current page is indicated where applicable.
- Demo tab state is transient and intentionally not written to the URL because it contains no server or shareable query state.
- Public two-column layouts stack below 800px without reordering the primary action.
- Unknown demo budgets use the public demo not-found experience.

## Async and resilience

- Authentication mutations are pessimistic and block duplicate submission.
- Network and provider failures map to calm inline recovery copy; raw provider errors are not displayed.
- The public demo never fetches, authenticates, or mutates.
- Disconnecting is pessimistic until Plaid confirms removal. Plaid `ITEM_NOT_FOUND` reconciles as success; other Plaid errors leave the local Item active.
- Disconnected Item, account, transaction, and budget-assignment rows are retained internally. Normal account, transaction, and budget reads omit data attached to disconnected Items.

## Validation

- Validation is client-owned with `noValidate` while retaining semantic input types and constraints.
- Validate on submit, then clear each field error as the user corrects it.
- Focus the first invalid field. Associate inline errors through `aria-describedby` and `aria-invalid`.
- Passwords remain in component memory only and are never placed in URLs, logs, or persistent storage.

## Verification

- Required commands: strict premium audit, lint, typecheck, unit tests, credential-free production build.
- Browser matrix: desktop, narrow mobile, keyboard-only, 200% zoom, reduced motion, form success/error/loading, demo empty search.
