import * as Sentry from "@sentry/nextjs";
import { sanearEvento } from "@/lib/observabilidad";

/**
 * Arranque de Sentry en el navegador (convención `instrumentation-client.ts`
 * de esta versión de Next, no `sentry.client.config.ts`). Solo errores: sin
 * rendimiento (`tracesSampleRate: 0`) ni repetición de sesión — decisión ya
 * tomada, ver plan.
 */
Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  sendDefaultPii: false,
  tracesSampleRate: 0,
  beforeSend: sanearEvento,
});
