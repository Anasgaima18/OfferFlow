import * as Sentry from "@sentry/node";
import { config } from "./config/env";

Sentry.init({
  dsn: config.SENTRY_DSN,
  integrations: [],
  tracesSampleRate: config.NODE_ENV === 'production' ? 0.2 : 1.0,
});
