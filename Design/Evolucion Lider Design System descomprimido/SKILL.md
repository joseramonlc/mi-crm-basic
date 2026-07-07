---
name: evolucion-lider-design
description: Use this skill to generate well-branded interfaces and assets for Evolución Líder · CRM Networker, either for production or throwaway prototypes/mocks/etc. Contains essential design guidelines, colors, type, fonts, assets, and UI kit components for prototyping.
user-invocable: true
---

Read the README.md file within this skill, and explore the other available files.
If creating visual artifacts (slides, mocks, throwaway prototypes, etc), copy assets out and create static HTML files for the user to view. If working on production code, you can copy assets and read the rules here to become an expert in designing with this brand.
If the user invokes this skill without any other guidance, ask them what they want to build or design, ask some questions, and act as an expert designer who outputs HTML artifacts _or_ production code, depending on the need.

## Quick orientation

- **Brand:** Evolución Líder · **Product:** CRM Networker — a mobile-first personal CRM for managing prospects. Spanish, informal *tú*, action-oriented, no emoji.
- **One action color:** green `#16A34A`. Everything else is Slate neutral. Flat backgrounds, no gradients.
- **Type:** Inter (400/500/600/700). Tabular figures for numbers.
- **Icons:** Lucide, 2px stroke, `currentColor`.
- **Tokens** live in `tokens/*.css`, all reachable from `styles.css` (link this one file).
- **Components** are bundled under `window.EvoluciNLDerDesignSystem_8c407a` (Button, Card, Avatar, Icon, Badge/CountBadge, StageBadge, PriorityBadge, Input, Select, Switch, ProspectCard, FilterChip, EmptyState).
- **UI kit:** `ui_kits/crm-networker/` is an interactive mobile recreation (Actividad Diaria, Pipeline, Resumen, Ficha, Nuevo Prospecto).
- **Templates:** `templates/{login,registro,crm-app}/` are reusable starting points. To use one from a consuming project, edit the single `base` line in that template's `ds-base.js` to point at the bound design-system folder. See "How to use the templates" in `readme.md`.

See `readme.md` for full Content, Visual and Iconography guidelines.
