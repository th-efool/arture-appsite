"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { appConnectionLabels, type AppConnection } from "@/lib/app-connection-types";

const Context = createContext<{ connections: Record<string, AppConnection>; status: "loading" | "ready" | "error" }>({ connections: {}, status: "loading" });

export function AppConnectionsProvider({ children }: { children: ReactNode }) {
  const [value, setValue] = useState<{ connections: Record<string, AppConnection>; status: "loading" | "ready" | "error" }>({ connections: {}, status: "loading" });
  useEffect(() => {
    let active = true;
    let busy = false;
    const controller = new AbortController();
    const refresh = async () => {
      if (busy) return;
      busy = true;
      try {
        const response = await fetch("/api/app-connections", { cache: "no-store", signal: AbortSignal.any([controller.signal, AbortSignal.timeout(8000)]) });
        if (!response.ok) throw new Error();
        const { connections } = await response.json();
        if (active) setValue({ connections, status: "ready" });
      } catch { if (active) setValue({ connections: {}, status: "error" }); }
      finally { busy = false; }
    };
    void refresh();
    const timer = window.setInterval(() => void refresh(), 5000);
    return () => { active = false; controller.abort(); window.clearInterval(timer); };
  }, []);
  return <Context.Provider value={value}>{children}</Context.Provider>;
}

export function AppConnectionStatus({ assetCode }: { assetCode?: string }) {
  const { connections, status } = useContext(Context);
  const all = Object.values(connections);
  const connection = assetCode ? connections[assetCode] : all.find(item => item.state === "connected") ?? all.find(item => item.state === "connecting") ?? all[0];
  const keyRejected = connection?.errorCode === "openai_invalid_api_key" || connection?.errorCode === "openai_http_401";
  const label = status === "error" ? "Connection status unavailable" : status === "loading" ? "Checking app connection…" : keyRejected ? "OpenAI server key rejected" : connection ? appConnectionLabels[connection.state] : "No app connection";
  const color = status === "ready" && connection?.state === "connected" ? "#059669" : connection?.state === "error" || status === "error" ? "#dc2626" : "#64748b";
  return <span role="status" style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12 }} title={connection?.lastSeenAt ? `Last heartbeat: ${new Date(connection.lastSeenAt).toLocaleString()}` : "No app heartbeat received"}>
    <span aria-hidden="true" style={{ height: 7, width: 7, borderRadius: "50%", background: color, flexShrink: 0 }} />{label}
  </span>;
}
