import * as Sentry from "@sentry/node";
import { nodeProfilingIntegration } from "@sentry/profiling-node";
import { config } from "./config/env";

Sentry.init({
  dsn: config.CLIENT_URL ? "placeholder_for_valid_dsn_or_empty_if_no_dsn_configured_yet" : undefined, // Will be configured via env
  integrations: [
    nodeProfilingIntegration(),
  ],
  tracesSampleRate: 1.0, 
  profilesSampleRate: 1.0,
});
