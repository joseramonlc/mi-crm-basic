import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs/config";

const nextConfig: NextConfig = {
  /* config options here */
};

// Sin SENTRY_AUTH_TOKEN (secreto, se fija en Railway) el build funciona
// igual, solo que no sube "source maps": los errores en Sentry se ven con
// el código minificado en vez del real.
export default withSentryConfig(nextConfig, {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  silent: !process.env.CI,
  widenClientFileUpload: true,
});
