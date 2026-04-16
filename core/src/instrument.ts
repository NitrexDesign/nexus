//...
import * as Sentry from "@sentry/bun";

Sentry.init({
  dsn: "https://24e0decc18108ee9792acda775723717@o162115.ingest.us.sentry.io/4511231806210048",
  // Send structured logs to Sentry
  enableLogs: true,
  // Tracing
  tracesSampleRate: 1.0, // Capture 100% of the transactions
});