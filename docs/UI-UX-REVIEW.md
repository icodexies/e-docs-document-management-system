# UI/UX review and update

This pass used the design-critique, design-system, accessibility-review, ux-copy
and UI UX Pro Max checklists. The navy / lavender / jade palette was deliberately
kept.

## What changed

### One hero, not a hero on every page

The dashboard and public home keep the large, editorial `PageHero`. Task screens
(Documents, New document, Awaiting signature, Users, Profile, Document detail and
Sign document) now use a compact `PageHeader` with:

- a clear eyebrow, title and description;
- one primary action aligned to the title;
- status and context chips directly below the copy;
- no repeated decorative gradient, dot grid or oversized title.

This gets users to the actual table, form or PDF much sooner and makes the
workspace feel like an application rather than a stack of landing pages.

### One appearance control

The separate text-size and theme buttons are now a single **Appearance** menu in
the member header. It contains:

- **Color mode:** System, Light, Dark;
- **Text size:** Normal, Large, Extra large (still only applied at 1024px and
  above);
- a keyboard-accessible popover with Escape, outside-click and focus handling.

The header is quieter and the menu has room to explain the settings.

### Clearer home page

The public hero now includes a lightweight document preview that shows the core
product idea: a document, its signatories and completion state. It is decorative
for assistive technology because the hero copy already explains the workflow.

### Denser admin and data views

- The Users directory switches to a proper desktop table: account, role, status,
  signature, joined date and actions. The card layout remains on smaller screens.
- Long names and details truncate safely, dates use tabular figures, and row
  actions stay aligned at 1024–1440px.
- The dashboard chart shows a purposeful empty state when there are no uploads
  instead of an empty axis frame.
- The document detail screen makes **Download PDF** the primary action.

### Navigation and feedback

- Route changes move focus to the main content, reset scroll and update the page
  title for screen readers and browser tabs.
- A short transform-only page transition keeps navigation feeling connected;
  reduced-motion users get the final state immediately.
- Login now has a show/hide password control with a 44px target.
- Buttons gain a restrained press response and pointer feedback; numeric columns
  use tabular figures.

### Consistent actions and empty states

- Added a shared `Button` component with primary, secondary, ghost, quiet,
  danger and inverse variants.
- Standardised "New document" as the primary create action.
- Empty states now provide a next step instead of only explaining the absence.
- Appearance labels and signature copy were tightened.

## Accessibility work

- Added a global visible focus ring for links, buttons, inputs and summaries.
- Added "Skip to content" links to both layouts.
- Increased important header, sidebar, primary button and appearance controls to
  at least 44px.
- Darkened the light-theme slate tokens so 10–11px labels meet contrast targets
  without changing the navy / lavender / jade identity.
- Raised sidebar label and inactive-link opacity for readability.
- Marked the header avatar as decorative and removed duplicate initials once the
  image loads.
- Corrected the completion `definition list` so the caveat is outside the `<dl>`.
- Kept the existing reduced-motion support.

Automated `axe-core` checks (WCAG 2.1 A/AA) report **0 violations** on Home,
Login, Dashboard, Documents, New document, Awaiting signature, Profile, Users,
Document detail, Sign document, the open Appearance menu, and Dashboard in dark
mode.

Manual checks still recommended: keyboard-only walkthrough, NVDA/VoiceOver, and
browser zoom to 200%.

## Alternatives considered

- **Repeating hero on every task page** — rejected: too much vertical space and
  repeated decoration.
- **Full visual re-theme (warm paper / cool indigo)** — rejected per design
  feedback; navy remains the system color.
- **Table-first Users directory** — not adopted in this pass. The card grid
  keeps role and status actions easy to reach; revisit if account volume grows.
- **Denser sidebar** — rejected; keeping the privacy note and clear navigation
  is more useful than squeezing every pixel.

## Files most affected

- `src/components/ui/PageHeader.jsx`
- `src/components/ui/PageHero.jsx`
- `src/components/ui/AppearanceMenu.jsx`
- `src/components/ui/Button.jsx`
- `src/components/ui/SkipLink.jsx`
- `src/layouts/member/MemberLayout.jsx`
- `src/index.css`
- dashboard and task screens under `src/pages/`
