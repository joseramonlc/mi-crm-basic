import * as Sentry from "@sentry/nextjs";
import { sanearEvento } from "@/lib/observabilidad";

/** Arranque de Sentry en el runtime edge (lo usa `proxy.ts`). Solo errores, ver plan. */
Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  sendDefaultPii: false,
  tracesSampleRate: 0,
  beforeSend: sanearEvento,
});
