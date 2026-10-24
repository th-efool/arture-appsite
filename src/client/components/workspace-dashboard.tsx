"use client";

import { useEffect, useState } from "react";
import { AppConnectionStatus } from "./app-connection-status";

type Machine = { id: string; name: string; assetCode: string; location: string; status: string };
type Activity = { id: string; machineId: string; machineName: string; summary: string; occurredAt: string };
type DashboardData = { metrics: { registered: number; documents: number; workEvents: number; conversations: number }; recentActivity: Activity[] };

export default function Dashboard({ machines, techs, open, all, viewTechs }: {
  machines: Machine[]; techs: { active: boolean }[]; open: (id: string) => void; all: () => void; viewTechs: () => void;
}) {
  const [data, setData] = useState<DashboardData | null>(null);
  const [message, setMessage] = useState("");
  useEffect(() => {
    let active = true;
    const refresh = async () => {
      try {
        const response = await fetch("/api/dashboard", { cache: "no-store" });
        if (!response.ok) throw new Error("Could not refresh workspace activity.");
        const result: DashboardData = await response.json();
        if (active) { setData(result); setMessage(""); }
      } catch (cause) {
        if (active) setMessage(cause instanceof Error ? cause.message : "Could not load activity.");
      }
    };
    void refresh();
    const timer = window.setInterval(() => void refresh(), 10000);
    return () => { active = false; window.clearInterval(timer); };
  }, []);

  return (
    <div className="page dashboard-grid">
      <div className="mission-banner">
        <div className="mission-banner-content">
          <div className="mission-tag-row">
            <span className="mission-tag">{data ? `${data.metrics.registered} registered machine${data.metrics.registered === 1 ? "" : "s"}` : "Loading machine records…"}</span>
            <span className="mission-tag"><AppConnectionStatus /></span>
          </div>
          <div>
            <p className="eyebrow" style={{ color: "#fb923c" }}>ARTURE WORKSPACE</p>
            <h2>Machine documents and work history.</h2>
            <p className="mission-desc">Keep manuals and recorded maintenance together. Machine status is entered in the workspace; app connection status comes from the voice relay. Voice sessions are saved under each machine. Search processed manuals from each machine’s page. Pump voice answers consult these documents, with source references saved in the session.</p>
          </div>
          <div className="mission-quick-actions">
            <button className="btn-primary btn-orange" onClick={all}>Open Machines</button>
            <button className="btn-secondary" onClick={viewTechs}>View Workers</button>
          </div>
        </div>
      </div>
      <section className="metrics-row">
        {[
          ["Voice Sessions", data?.metrics.conversations, "Saved app conversations"],
          ["Uploaded Documents", data?.metrics.documents, "Manuals and diagrams by machine"],
          ["Recorded Work Events", data?.metrics.workEvents, "Saved maintenance history"],
          ["Active Workers", techs.filter(worker => worker.active).length, "Registered as active"],
        ].map(([label, value, detail]) => (
          <div className="metric-card" key={label}>
            <span className="metric-card-label">{label}</span>
            <div className="metric-card-val-row"><span className="metric-card-val">{value ?? "—"}</span></div>
            <span className="metric-card-sub">{detail}</span>
          </div>
        ))}
      </section>
      <section className="ops-two-col">
        <div className="ops-panel">
          <div className="ops-panel-head"><h3>Machine Records</h3><button className="btn-secondary" onClick={all}>View All</button></div>
          <div className="ops-panel-body">
            {machines.length ? machines.map(machine => (
              <div className="attention-card-item" key={machine.id}>
                <div><h5>{machine.name}</h5><p>{machine.assetCode} · {machine.location}</p><small>Recorded status: {machine.status.replaceAll("_", " ")}</small></div>
                <button className="btn-primary" onClick={() => open(machine.id)}>Open Machine →</button>
              </div>
            )) : <p>No machine records available. The water pump setup may need to be run.</p>}
          </div>
        </div>
        <div className="ops-panel">
          <div className="ops-panel-head"><h3>Recent Workspace Activity</h3><span style={{ fontSize: 12 }}>Saved records · refreshes every 10s</span></div>
          <div className="ops-panel-body">
            {message && <p role="alert" style={{ color: "#b91c1c" }}>{message}</p>}
            {!data && !message && <p>Loading activity…</p>}
            {data && !data.recentActivity.length && <p>No activity recorded yet. Upload a document or record completed work on the pump to get started.</p>}
            <div className="activity-list">
              {data?.recentActivity.map(entry => (
                <div className="activity-item" key={entry.id}>
                  <div className="activity-item-dot" style={{ background: "var(--orange)" }} />
                  <div className="activity-item-content" style={{ overflowWrap: "anywhere" }}>
                    <button onClick={() => open(entry.machineId)} style={{ fontWeight: 700 }}>{entry.machineName}</button>
                    <p style={{ whiteSpace: "pre-wrap" }}>{entry.summary}</p>
                    <small>{new Date(entry.occurredAt).toLocaleString()}</small>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
