export type AppConnection = {
  state: "not_configured" | "disconnected" | "connecting" | "connected" | "error";
  activeConnections: number;
  lastSeenAt: string | null;
  errorCode: string | null;
};

export const appConnectionLabels: Record<AppConnection["state"], string> = {
  not_configured: "App connection not configured",
  disconnected: "App disconnected",
  connecting: "Connecting to voice…",
  connected: "App connected",
  error: "Voice connection failed",
};
