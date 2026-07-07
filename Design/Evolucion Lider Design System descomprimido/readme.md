# Evolución Líder · CRM Networker — Design System

Mobile-first design system for **Evolución Líder**, a personal CRM ("CRM Networker") for managing prospects and growing a commercial network. Strictly single-user — one person managing their own pipeline of candidates.

- **Brand:** Evolución Líder · **Product:** CRM Networker · **Domain:** evolucionlider.com
- **Philosophy:** 375px is the base system; desktop is an *expansion*, not a parallel system.
- **References (mood):** Brevo (trust green), Attio & Linear (clean neutral base).
- **Personality:** professional but approachable · action-oriented · clean and frictionless · trustworthy.
- **Language:** Spanish (Spain), informal *tú*.

## Sources

- `uploads/design (1).md` — the authored brand/spec document (v1.0). The source of truth for all tokens, components and app structure below.
- `EvolucionLider-DS.html` — a prior single-file specimen sheet (reference only; superseded by this system).

No external codebase or Figma was provided — the system is built directly from the spec document and reference sheet.

---

## CONTENT FUNDAMENTALS

How copy is written across the product.

- **Person & tone:** Always *tú* (informal "you"), never *usted*. Direct, warm, professional. Speaks to the user as their assistant: *"Tienes 3 tareas hoy"*, *"Llama a María antes del viernes"*.
- **Voice:** Action-first. Buttons and tasks lead with an imperative verb — *"Añadir prospecto"*, *"Guardar"*, *"Registrar interacción"*, *"Llamar"*. Loading copy uses the gerund — *"Guardando…"*.
- **Casing:** Sentence case everywhere — labels, buttons, titles. The only uppercase is the small `Label` type token (tracked caps) used for field labels / section eyebrows (e.g. *ETAPA*).
- **Length:** Terse. Card metadata is fragmentary — *"Última llamada · hace 2 días"*. Empty states are one short title + one support sentence + one CTA.
- **Numbers & dates:** Spanish formatting (`1.450 €`, `hace 2 días`, `Lunes, 29 de junio`). Numbers use tabular figures so columns align.
- **No emoji.** Iconography carries visual meaning; emoji would read as unprofessional. No exclamation spam, no hype.
- **Domain vocabulary:** *Prospecto*, *Pipeline*, *Etapa*, *Ficha*, *Interacción*, *Incorporado*. Pipeline stages in flow order: Nuevo → Contactado → Presentación realizada → En valoración → Incorporado → Descartado.

---

## VISUAL FOUNDATIONS

- **Color vibe:** One action color — **green** (`#16A34A`, "trust green"). It signals every primary action and the active/positive state. Violet (`#7C3AED`) is a rare secondary accent (used for the "Presentación realizada" stage). Everything else is **Slate** neutral. No gradients, no decorative color — calm and clean.
- **Backgrounds:** Flat. App background is `--surface-app` (slate-100 `#F1F5F9`); cards and headers are white. No images, patterns, textures or gradients in chrome. Imagery is essentially absent — this is a data/utility product; avatars are initials in a soft green chip, not photos.
- **Type:** **Inter** only, four weights (400/500/600/700). Display 32 → Caption 12. Tight tracking on headings (−0.02 to −0.01em). Tabular lining figures (`tnum`) for all KPIs, amounts and table numbers so digits align in columns.
- **Spacing:** 4px base scale (`--space-1`=4 … `--space-24`=96). Card gutters 16px; screen gutters 16px mobile / 24–32px desktop.
- **Corner radii:** sm 4 (small inputs) · md 8 (buttons, inputs, standard cards) · lg 12 (modals, sheets) · card 14 (prospect card) · xl 16 (large cards) · full (badges, pills, FAB, avatars).
- **Cards:** white fill, **1px** `--border-default` (`#E2E8F0`) border, radius 12–14, **shadow-1** at rest. Borders + a whisper of shadow define elevation — not heavy drop shadows.
- **Shadows / elevation:** 4 levels. 0 flat (primary surfaces) · 1 cards at rest · 2 dropdowns/elevated · 3 modals & bottom sheets. All cool slate-tinted (`rgba(15,23,42,…)`), never black.
- **Borders & focus:** 1px default, 2px for active/focus. Focus ring = `box-shadow: 0 0 0 3px` of the focus color at 15% (green) / error color at 15% (red). Inputs use `--border-strong` (`#CBD5E1`); cards/dividers use `--border-default`.
- **Animation:** Subtle and quick — no bounce. 120–240ms transitions on `cubic-bezier(0.2,0,0,1)`. Fades for overlays/dropdowns, slide-up for the bottom sheet, color transition on hover/active. Spinners on loading buttons. Nothing decorative or looping.
- **Hover states:** primary → darker green (`#15803D`); secondary → slate-50 fill; ghost → green-50 fill. **Press states:** one step darker still (primary `#166534`); no scale/shrink.
- **Transparency / blur:** Used only for the modal/sheet scrim (`rgba(15,23,42,.45)`). No glassmorphism / backdrop-blur.
- **Layout / fixed elements (mobile):** screen header 56px (root = no back; detail/form = back arrow). Bottom tab bar 60px + safe-area, white with subtle top border. 3 root destinations (Inicio · Prospectos · Resumen) — no Profile tab. Active tab = primary color + bold label + 3px top indicator. FAB `+` 56px circular green, shadow-2, floats bottom-right, present only on the 3 root screens, absent on Ficha/forms. Desktop swaps the tab bar for a 224px sidebar; no FAB (an "Añadir prospecto" button replaces it).

---

## ICONOGRAPHY

- **Library:** **Lucide Icons** (open source). Loaded from CDN: `https://unpkg.com/lucide@latest`.
- **Style:** `stroke-width: 2px`, round caps & joins, `currentColor` (inherits text color). Base size 24px; 16px in compact contexts.
- **How we render them:** the `Icon` component (`components/core/Icon.jsx`) reads Lucide's icon data from the `window.lucide` global and renders an inline SVG — pass a kebab-case `name`. Any page using `Icon` (cards, UI kit) must include the Lucide UMD `<script>`.
- **System set (29):** home, users, bar-chart-3, phone, message-circle, mail, instagram, plus, square-pen, save, arrow-left, filter, menu, calendar, clock, chevron-right, check, x, user, sticky-note, layers, alert-circle, info, star, trash-2, more-vertical, eye, eye-off, log-out. Channels map: phone→`phone`, WhatsApp→`message-circle`, Instagram→`instagram`, email→`mail`.
- **No emoji, no unicode glyphs as icons.** The brand logo (`assets/logo-mark.svg`) is an ascending-bars mark (growth/evolution) in a green rounded square; `assets/logo-lockup.svg` adds the wordmark.

---

## Index / manifest

**Root**
- `styles.css` — global entry (the only file consumers link). `@import` lines only.
- `tokens/` — `colors.css`, `typography.css`, `spacing.css`, `radius.css`, `shadows.css`, `borders.css`, `animation.css`, `fonts.css`.
- `assets/` — `logo-mark.svg`, `logo-lockup.svg`.
- `guidelines/` — foundation specimen cards (Colors, Type, Spacing, Brand).
- `readme.md` (this file) · `SKILL.md`.

**Components** (`window.EvoluciNLDerDesignSystem_8c407a`)
- `components/core/` — Button, Avatar, Card, Icon, Divider
- `components/feedback/` — Badge, CountBadge, StageBadge, PriorityBadge
- `components/forms/` — Input, Select, Switch
- `components/prospects/` — ProspectCard, FilterChip, EmptyState

**UI kit**
- `ui_kits/crm-networker/` — interactive mobile app: Actividad Diaria (Inicio), Pipeline (Prospectos), Resumen (Dashboard), Ficha del Prospecto, Nuevo Prospecto (bottom sheet), and an account menu (28px avatar in root headers → bottom sheet with name/email + Cerrar sesión). Entry: `index.html`; pieces in `shell.jsx` + `screens.jsx`.
- `ui_kits/crm-networker-desktop/` — **desktop** recreation: fixed 224px sidebar (logo · "Añadir prospecto" button replacing the FAB · 3-destination nav with green-50 active item · interactive avatar+name block at the bottom → account popover with "Cerrar sesión"), fluid content with a responsive prospect-card grid, a right-side Ficha drawer, and a centered "Nuevo prospecto" modal. Entry: `index.html`; app in `app.jsx`.
- **`ui_kits/crm-networker/prototype.html`** — **unified navigable prototype**: Login → Registro → full app (real data, not the empty state), a fixed Móvil/Escritorio switcher (reuses `FilterChip`) that swaps the whole surface while keeping session state, and Cerrar sesión (from either platform's account menu) returns to Login. This is the one to hand someone for an end-to-end click-through.

**Templates** (reusable starting points — shown in the "Templates" group of the picker that consuming projects see)
- `templates/login/` — **Login** screen (email, password with show/hide, error state). Entry: `Login.dc.html`.
- `templates/registro/` — **Registro** screen (name, email, password; per-field validation; success → empty Actividad Diaria). Entry: `Registro.dc.html`.
- `templates/crm-app/` — **App CRM Networker** — the full interactive app (Actividad, Pipeline, Resumen, Ficha, alta de prospecto). Entry: `CrmApp.dc.html`.

## How to use the templates (from another project)

Each template is a `.dc.html` that loads this design system through a one-line helper, `ds-base.js`, sitting in the same folder.

1. **In THIS project** the templates just work — `ds-base.js` points at the local system (`base = '../..'`) and renders styled in the preview.
2. **In a project that CONSUMES this system:** after binding this design system, open the template's `ds-base.js` and change the single `base` line to point at the bound system folder relative to the template — e.g. `_ds/<folder>` at the project root, or `../_ds/<folder>` one level down. Nothing else to edit.
3. The template mounts its screen from a sibling file (`LoginScreen.jsx`, `RegistroScreen.jsx`, `CrmApp.jsx`). Those read the design-system components from the compiled bundle at render time, so styling and primitives come straight from this system.

> Icons: templates load Lucide from CDN in their `<helmet>`. Keep that line if you copy a template elsewhere.

> The compiled runtime (`_ds_bundle.js`), manifest and adherence config are generated automatically — do not edit by hand.
