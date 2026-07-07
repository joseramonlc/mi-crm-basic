# CRM Networker · Evolución Líder

CRM personal para networkers: pipeline de prospectos, seguimiento automático y actividad diaria. Next.js 16 + Convex (base de datos + backend + auth), pensado para una cuenta de usuario por networker (sin visibilidad cruzada entre cuentas).

Ver la decisión de stack completa en [`docs/adr/0001-stack-tecnologico.md`](docs/adr/0001-stack-tecnologico.md).

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
4. Sincroniza el esquema (`convex/schema.ts`) y las funciones (`convex/*.ts`) con tu deployment de desarrollo.

**Paso único adicional** — Convex Auth necesita sus propias claves de firma JWT. En otra terminal, con `convex dev` ya corriendo al menos una vez:

```bash
npx @convex-dev/auth
```

Esto genera y sube (`convex env set`) las claves `JWT_PRIVATE_KEY`/`JWKS` a tu deployment. Solo hace falta una vez por deployment.

Abre [http://localhost:3000](http://localhost:3000) — redirige a `/login`; crea una cuenta desde el enlace a `/registro`.

## Estructura del proyecto

```
src/app/(auth)/login, /registro        Pantallas públicas (Convex Auth, proveedor Password)
src/app/(app)/actividad                Actividad Diaria (Inicio) — seguimientos de hoy/vencidos
src/app/(app)/prospectos               Pipeline agrupado por etapa
src/app/(app)/prospectos/nuevo         Alta de prospecto
src/app/(app)/prospectos/[id]          Ficha del prospecto (datos, etapa, notas, historial)
src/app/(app)/prospectos/[id]/interaccion  Registrar interacción
src/app/(app)/resumen                  Dashboard (embudo por etapa, conversión)
src/components/ui                      Componentes del design system, portados a TSX
src/components/layout                  Sidebar / TabBar / AppShell (navegación global)
src/proxy.ts                           Proxy de Next.js 16 (antes "middleware") — protege rutas con Convex Auth
convex/schema.ts                       Esquema: prospectos, interacciones (+ tablas de Convex Auth)
convex/prospectos.ts, interacciones.ts Queries/mutations, todas scoped por usuario autenticado
convex/seguimiento.ts                  Motor de seguimiento — reglas por etapa marcadas TODO(JOS-8)
Design/                                Design system de origen (tokens, specs, prototipos HTML) — fuente de verdad visual
legacy/                                Landing estática anterior ("NexusCRM"), archivada por referencia
```

## Diseño

El diseño UI/UX no vive en Linear ni en este README: está en `Design/Evolucion Lider Design System descomprimido/` (tokens, componentes de referencia, UI kits navegables y `design.md`). Los componentes en `src/components/ui` son un puerto directo de esos mismos ficheros a TypeScript.

## Despliegue

El frontend y el backend se despliegan por separado:

- **Frontend (Railway)** — build `npm run build`, arranque `npm start` (ver `railway.json`). Variable de entorno necesaria: `NEXT_PUBLIC_CONVEX_URL` apuntando al deployment de **producción** de Convex (no al de desarrollo).
- **Backend (Convex Cloud)** — `npx convex deploy` sube `convex/schema.ts` y las funciones al deployment de producción. Se ejecuta desde tu máquina o desde CI; Railway no lo hace por ti.

## Comandos

| Comando | Qué hace |
| --- | --- |
| `npm run dev` | Next.js + Convex en paralelo (desarrollo) |
| `npm run dev:next` / `npm run dev:convex` | Cada uno por separado |
| `npm run build` / `npm start` | Build y arranque de producción del frontend |
| `npm run lint` | ESLint |
| `npx convex dashboard` | Abre el panel de datos/funciones de Convex |
