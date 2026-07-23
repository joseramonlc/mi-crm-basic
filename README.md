# CRM Networker · Evolución Líder

CRM personal para networkers: pipeline de prospectos, seguimiento automático y actividad diaria. Next.js 16 + Convex (base de datos + backend), pensado para una cuenta de usuario por networker (sin visibilidad cruzada entre cuentas).

**Estado actual:** design system portado a TSX, pantalla de Actividad Diaria funcional (JOS-22), backend completo de prospectos e interacciones con motor de seguimiento (M2) y autenticación con Clerk con aislamiento real entre cuentas (JOS-66). El resto de pantallas de producto se desarrolla tarea a tarea desde Linear (proyecto CRM-MVP). Cada query y mutation deriva su `usuarioId` de la sesión (`ctx.auth.getUserIdentity()`); sin sesión, abortan.

## Requisitos

- Node.js 20+
- Una cuenta gratuita en [Convex](https://convex.dev) (se crea en el primer paso de abajo, no hace falta crearla antes)
- Una cuenta en [Clerk](https://clerk.com) con una aplicación creada, para la autenticación (ver más abajo)

## Puesta en marcha (primera vez)

```bash
npm install
npm run dev
```

`npm run dev` levanta **dos** procesos en paralelo: `next dev` (frontend) y `convex dev` (backend/DB, en modo watch). La primera vez que corre `convex dev`:

1. Te abrirá el navegador para iniciar sesión / crear tu cuenta de Convex.
2. Te preguntará por el nombre del proyecto — crea uno nuevo.
3. Escribe automáticamente `CONVEX_DEPLOYMENT` y `NEXT_PUBLIC_CONVEX_URL` en un `.env.local` (no lo edites a mano; ya está en `.gitignore`).
4. Sincroniza el esquema (`convex/schema.ts`: tablas `prospectos` e `interacciones`) con tu deployment de desarrollo.

Además hay que configurar Clerk a mano en `.env.local` (ver `.env.example` para la lista completa): las dos claves de la aplicación, `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` y `CLERK_SECRET_KEY`, más las cuatro variables de rutas, que son fijas y apuntan a las pantallas propias del CRM (`/login`, `/registro` y `/actividad`). El deployment de Convex necesita a su vez `CLERK_JWT_ISSUER_DOMAIN`, que no va en `.env.local` sino en el propio deployment:

```bash
npx convex env set CLERK_JWT_ISSUER_DOMAIN https://<slug>.clerk.accounts.dev
```

Abre [http://localhost:3000](http://localhost:3000). Sin sesión, cualquier ruta redirige a `/login`: la protección la aplica `src/proxy.ts`.

## Estructura del proyecto

```
src/app/(auth)/login, /registro   Pantallas públicas de acceso, sobre los custom flows de Clerk
src/proxy.ts                      Protección de rutas: todo es privado salvo /login y /registro
src/components/ui                 Componentes del design system, portados a TSX
src/components/layout             Sidebar / TabBar / AppShell (navegación global), con la sesión de Clerk
convex/                           Backend Convex: schema, APIs de prospectos/interacciones, motor de seguimiento (config en convex/config/)
Design/                           Design system de origen (tokens, specs, prototipos HTML) — fuente de verdad visual
legacy/                           Landing estática anterior ("NexusCRM"), archivada por referencia
```

## Diseño

El diseño UI/UX no vive en Linear ni en este README: está en `Design/Evolucion Lider Design System descomprimido/` (tokens, componentes de referencia, UI kits navegables y `design.md`). Los componentes en `src/components/ui` son un puerto directo de esos mismos ficheros a TypeScript.

## Despliegue

El frontend y el backend se despliegan por separado:

- **Frontend (Railway)** — build `npm run build`, arranque `npm start` (ver `railway.json`). Variables de entorno necesarias: `NEXT_PUBLIC_CONVEX_URL` apuntando al deployment de **producción** de Convex (no al de desarrollo), y las claves de Clerk `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` y `CLERK_SECRET_KEY`.
- **Backend (Convex Cloud)** — `npx convex deploy` sube `convex/schema.ts` y las funciones al deployment de producción, cuando existan. Se ejecuta desde tu máquina o desde CI; Railway no lo hace por ti.

## Comandos

| Comando | Qué hace |
| --- | --- |
| `npm run dev` | Next.js + Convex en paralelo (desarrollo) |
| `npm run dev:next` / `npm run dev:convex` | Cada uno por separado |
| `npm run build` / `npm start` | Build y arranque de producción del frontend |
| `npm run lint` | ESLint |
| `npx convex dashboard` | Abre el panel de datos/funciones de Convex |
| `npx convex data prospectos` | Vuelca la tabla; la columna `usuarioId` es el identificador de tu cuenta |

### Datos de prueba (solo desarrollo)

`convex/seed.ts` deja la Actividad Diaria en un estado concreto — `populated` (con vencidos y contactos de hoy), `alDia` o `empty` — reproduciendo escenarios que a mano son imposibles, porque las fechas de seguimiento las calcula el motor. Es interna, exige `APP_ENV=development` y `ALLOW_SEED=true` en el deployment, y siembra sobre la cuenta que se le indique:

```bash
npx convex run seed:seed '{"scenario":"populated","usuarioId":"https://<slug>.clerk.accounts.dev|user_xxx"}'
```

El `usuarioId` es el `tokenIdentifier` de tu sesión: créate un prospecto desde la app y cópialo de `npx convex data prospectos`. Ojo, el escenario **borra antes** los prospectos e interacciones de esa cuenta (solo de esa).
