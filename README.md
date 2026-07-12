# CRM Networker · Evolución Líder

CRM personal para networkers: pipeline de prospectos, seguimiento automático y actividad diaria. Next.js 16 + Convex (base de datos + backend), pensado para una cuenta de usuario por networker (sin visibilidad cruzada entre cuentas).

**Estado actual:** esqueleto de la app + design system portado a TSX + conexión básica con Convex. El modelo de datos, la autenticación y las pantallas de producto todavía no están implementados — se desarrollan tarea a tarea desde Linear (proyecto CRM-MVP).

## Requisitos

- Node.js 20+
- Una cuenta gratuita en [Convex](https://convex.dev) (se crea en el primer paso de abajo, no hace falta crearla antes)

## Puesta en marcha (primera vez)

```bash
npm install
npm run dev
```

`npm run dev` levanta **dos** procesos en paralelo: `next dev` (frontend) y `convex dev` (backend/DB, en modo watch). La primera vez que corre `convex dev`:

1. Te abrirá el navegador para iniciar sesión / crear tu cuenta de Convex.
2. Te preguntará por el nombre del proyecto — crea uno nuevo.
3. Escribe automáticamente `CONVEX_DEPLOYMENT` y `NEXT_PUBLIC_CONVEX_URL` en un `.env.local` (no lo edites a mano; ya está en `.gitignore`).
4. Sincroniza el esquema (`convex/schema.ts`, de momento vacío) con tu deployment de desarrollo.

Abre [http://localhost:3000](http://localhost:3000). Las pantallas `/login` y `/registro` son maqueta visual — todavía sin autenticación real.

## Estructura del proyecto

```
src/app/(auth)/login, /registro   Pantallas públicas — maqueta visual, sin backend todavía
src/components/ui                 Componentes del design system, portados a TSX
src/components/layout             Sidebar / TabBar / AppShell (navegación global), con cuenta de muestra
convex/schema.ts                  Esquema Convex — vacío, pendiente de diseñar (ver Linear JOS-7)
Design/                           Design system de origen (tokens, specs, prototipos HTML) — fuente de verdad visual
legacy/                           Landing estática anterior ("NexusCRM"), archivada por referencia
```

## Diseño

El diseño UI/UX no vive en Linear ni en este README: está en `Design/Evolucion Lider Design System descomprimido/` (tokens, componentes de referencia, UI kits navegables y `design.md`). Los componentes en `src/components/ui` son un puerto directo de esos mismos ficheros a TypeScript.

## Despliegue

El frontend y el backend se despliegan por separado:

- **Frontend (Railway)** — build `npm run build`, arranque `npm start` (ver `railway.json`). Variable de entorno necesaria: `NEXT_PUBLIC_CONVEX_URL` apuntando al deployment de **producción** de Convex (no al de desarrollo).
- **Backend (Convex Cloud)** — `npx convex deploy` sube `convex/schema.ts` y las funciones al deployment de producción, cuando existan. Se ejecuta desde tu máquina o desde CI; Railway no lo hace por ti.

## Comandos

| Comando | Qué hace |
| --- | --- |
| `npm run dev` | Next.js + Convex en paralelo (desarrollo) |
| `npm run dev:next` / `npm run dev:convex` | Cada uno por separado |
| `npm run build` / `npm start` | Build y arranque de producción del frontend |
| `npm run lint` | ESLint |
| `npx convex dashboard` | Abre el panel de datos/funciones de Convex |
