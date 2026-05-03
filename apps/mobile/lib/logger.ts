/**
 * Lightweight Custom Crash Reporting & Telemetry
 * Designed for JSC Engine constraints. Avoids heavy native crash reporting SDKs like Sentry 
 * that might increase bundle size or compilation complexity in Termux/EAS.
 */

export const Logger = {
  log: (message: string, context?: any) => {
    if (__DEV__) {
      console.log(`[LOG] ${message}`, context || '');
    }
  },
  warn: (message: string, context?: any) => {
    if (__DEV__) {
      console.warn(`[WARN] ${message}`, context || '');
    }
  },
  error: (error: Error | string, context?: any) => {
    // In production, we would send this to a lightweight endpoint (e.g., Axiom, Logtail, or custom server)
    // For now, we capture it to prevent hard crashes and keep the app running.
    if (__DEV__) {
      console.error(`[ERROR]`, error, context || '');
    } else {
      // TODO: Replace with fetch() to a telemetry ingest URL
      // fetch('https://your-telemetry-endpoint.com/log', { ... })
    }
  },
  fatal: (error: Error, isFatal: boolean) => {
    // Global error handler hook
    console.error(`[FATAL] ${isFatal ? 'Fatal ' : ''}Crash Caught:`, error);
    // Log to persistent storage or telemetry server before crashing
  }
};

