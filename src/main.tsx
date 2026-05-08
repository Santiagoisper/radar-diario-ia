import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import * as Sentry from "@sentry/react";
import { onCLS, onINP, onLCP } from "web-vitals";
import "./index.css";
import App from "./App.tsx";

const sentryDsn = import.meta.env.VITE_SENTRY_DSN as string | undefined;
if (sentryDsn) {
  Sentry.init({
    dsn: sentryDsn,
    environment: import.meta.env.MODE,
    sendDefaultPii: false,
    integrations: [Sentry.browserTracingIntegration(), Sentry.replayIntegration({ maskAllText: true })],
    tracesSampleRate: import.meta.env.PROD ? 0.2 : 1,
    replaysSessionSampleRate: 0,
    replaysOnErrorSampleRate: import.meta.env.PROD ? 0.5 : 1,
  });
}

function reportWebVital(metric: { name: string; value: number; id: string }) {
  if (import.meta.env.DEV) {
    console.debug(`[web-vitals] ${metric.name}`, metric.value);
  }
}

onCLS(reportWebVital);
onINP(reportWebVital);
onLCP(reportWebVital);

const rootEl = document.getElementById("root")!;

createRoot(rootEl).render(
  <StrictMode>
    {sentryDsn ? (
      <Sentry.ErrorBoundary fallback={<p className="muted">Algo salió mal. Recargá la página.</p>}>
        <App />
      </Sentry.ErrorBoundary>
    ) : (
      <App />
    )}
  </StrictMode>,
);
