"use client";

import { FormEvent, ReactNode, useCallback, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import DocumentKnowledge from "@/client/components/document-knowledge";
import ConversationSessions from "@/client/components/conversation-sessions";
import Dashboard from "@/client/components/workspace-dashboard";
import { AppConnectionsProvider, AppConnectionStatus } from "@/client/components/app-connection-status";
import { isPumpDemo, isGuest } from "@/lib/demo-machine";
import { useRouter } from "next/navigation";

type Status = "operational" | "service_due" | "offline";
type Machine = { id: string; assetCode: string; name: string; model: string; location: string; status: Status };
type Tech = { id: string; name: string; specialty: string; phone: string; active: boolean };
type User = { email?: string; id: string; name: string; role: "admin" | "technician" };
type ServiceLog = { id: string; technicianName: string; serviceDate: string; minutesSpent: number; notes: string };

const statusText = (status: Status) => {
  if (status === "service_due") return "Service Due";
  if (status === "operational") return "Operational";
  return "Offline";
};

async function api<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...options,
    headers: { "content-type": "application/json", ...options?.headers }
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.error || "Request failed.");
  return body;
}

export default function Home() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(() => {
    if (typeof window !== "undefined") {
      try {
        const stored = sessionStorage.getItem("arture_user");
        if (stored) return JSON.parse(stored);
      } catch {}
    }
    return null;
  });
  const [machines, setMachines] = useState<Machine[]>([]);
  const [techs, setTechs] = useState<Tech[]>([]);
  const [view, setView] = useState<"dashboard" | "machines" | "technicians" | "detail">("dashboard");
  const [selected, setSelected] = useState<string>();
  const [modal, setModal] = useState<"machine" | "tech" | "log" | null>(null);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | Status>("all");
  const [viewMode, setViewMode] = useState<"grid" | "table">("grid");
  const [error, setError] = useState("");
  const [serviceVersion, setServiceVersion] = useState(0);

  const filtered = useMemo(() => {
    return machines.filter((machine) => {
      const matchesQuery = `${machine.name} ${machine.assetCode} ${machine.location} ${machine.model}`
        .toLowerCase()
        .includes(query.toLowerCase());
      const matchesStatus = statusFilter === "all" || machine.status === statusFilter;
      return matchesQuery && matchesStatus;
    });
  }, [machines, query, statusFilter]);

  const machine = machines.find((item) => item.id === selected);

  const load = useCallback(async () => {
    try {
      setError("");
      const session = await api<{ user: User | null }>("/api/auth/session");
      if (!session.user) {
        try { sessionStorage.removeItem("arture_user"); } catch {}
        setUser(null);
        router.replace("/login");
        return;
      }
      setUser(session.user);
      try {
        sessionStorage.setItem("arture_user", JSON.stringify(session.user));
      } catch {}

      // Fetch operational data in parallel without blocking user view
      const [machineResult, technicianResult] = await Promise.all([
        api<{ machines: Machine[] }>("/api/machines"),
        api<{ technicians: Tech[] }>("/api/technicians")
      ]);
      setMachines(machineResult.machines);
      setTechs(technicianResult.technicians);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not load Arture.");
    }
  }, [router]);

  useEffect(() => {
    void load();
  }, [load]);

  const openDetail = (id: string) => {
    setSelected(id);
    setView("detail");
  };

  const createMachine = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    try {
      const result = await api<{ machine: Machine }>("/api/machines", {
        method: "POST",
        body: JSON.stringify({
          assetCode: form.get("assetCode"),
          name: form.get("name"),
          model: form.get("model"),
          location: form.get("location"),
          status: "operational"
        })
      });
      setMachines((current) => [result.machine, ...current]);
      setModal(null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not save machine.");
    }
  };

  const createTechnician = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    try {
      const result = await api<{ technician: Tech }>("/api/technicians", {
        method: "POST",
        body: JSON.stringify({
          name: form.get("name"),
          specialty: form.get("specialty"),
          phone: form.get("phone"),
          active: true
        })
      });
      setTechs((current) => [...current, result.technician]);
      setModal(null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not save technician.");
    }
  };

  const logService = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!machine) return;
    const form = new FormData(event.currentTarget);
    try {
      await api("/api/maintenance", {
        method: "POST",
        body: JSON.stringify({
          machineId: machine.id,
          technicianId: form.get("technicianId"),
          serviceDate: form.get("serviceDate"),
          minutesSpent: Number(form.get("minutesSpent")),
          notes: form.get("notes")
        })
      });
      setServiceVersion((version) => version + 1);
      setModal(null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not save service log.");
    }
  };

  const signOut = async () => {
    try { sessionStorage.removeItem("arture_user"); } catch {}
    await fetch("/api/auth/logout", { method: "POST" });
    setUser(null);
    router.replace("/login");
  };

  if (!user) {
    return (
      <main className="shell" style={{ minHeight: "100vh" }}>
        <aside className="rail" />
        <section className="workspace" style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh" }}>
          <div style={{ textAlign: "center" }}>
            <div style={{ width: 32, height: 32, margin: "0 auto 14px", border: "3px solid #e2e8f0", borderTopColor: "#f97316", borderRadius: "50%", animation: "spin 0.6s linear infinite" }} />
            <p style={{ color: "var(--ink-secondary)", fontSize: 13, fontWeight: 600 }}>Loading Arture Workspace...</p>
          </div>
        </section>
      </main>
    );
  }

  return (
    <AppConnectionsProvider>
    <main className="shell">
      {/* Sleek, Modern, Centered Button-Based Side Navigation Panel */}
      <NavigationRail
        currentView={view}
        onSelect={(v) => setView(v)}
        onSignOut={signOut}
        user={user}
      />

      <section className="workspace">
        {/* Modern Topbar */}
        <header className="topbar">
          <div className="topbar-left">
            <span className="topbar-badge">
              <span className="topbar-badge-dot" />
              Machine Workspace
            </span>
            <p className="topbar-title">Arture &middot; Machine Documents &amp; Work History</p>
          </div>
          <div className="topbar-right">
            <div className="topbar-user">
              <div className="topbar-user-avatar">
                {user.name.split(" ").map((n) => n[0]).join("")}
              </div>
              <span>{user.name}</span>
            </div>
            <button className="signout-btn" onClick={signOut} title="Sign out of workspace">
              <SignOutIcon />
              <span>Sign out</span>
            </button>
          </div>
        </header>

        {error && (
          <div style={{ margin: "20px 32px 0", padding: "12px 18px", borderRadius: 10, background: "#fef2f2", color: "#b91c1c", border: "1px solid #fecaca", fontSize: 13 }}>
            {error}
          </div>
        )}

        {/* View Router */}
        {view === "dashboard" && (
          <Dashboard
            machines={machines}
            techs={techs}
            open={openDetail}
            all={() => setView("machines")}
            viewTechs={() => setView("technicians")}
          />
        )}

        {view === "machines" && (
          <MachinesView
            machines={machines}
            filtered={filtered}
            query={query}
            setQuery={setQuery}
            statusFilter={statusFilter}
            setStatusFilter={setStatusFilter}
            viewMode={viewMode}
            setViewMode={setViewMode}
            open={openDetail}
            add={() => setModal("machine")}
            admin={user.role === "admin" && !isPumpDemo(user)}
            readOnly={isGuest(user)}
            onQuickLog={(m) => {
              setSelected(m.id);
              setModal("log");
            }}
          />
        )}

        {view === "technicians" && (
          <TechsView
            techs={techs}
            add={() => setModal("tech")}
            admin={user.role === "admin"}
          />
        )}

        {view === "detail" && machine && (
          <DetailView
            machine={machine}
            techs={techs}
            refreshKey={serviceVersion}
            readOnly={isGuest(user)}
            back={() => setView("machines")}
            log={() => setModal("log")}
          />
        )}
      </section>

      {/* Modals */}
      {modal === "machine" && (
        <MachineForm close={() => setModal(null)} submit={createMachine} />
      )}
      {modal === "tech" && (
        <TechForm close={() => setModal(null)} submit={createTechnician} />
      )}
      {modal === "log" && (
        <LogForm
          techs={techs}
          targetMachineName={machine?.name}
          close={() => setModal(null)}
          submit={logService}
        />
      )}
    </main>
    </AppConnectionsProvider>
  );
}

/* =======================================================
   CLEAN ICON-ONLY CENTERED BUTTON-BASED SIDE PANEL
   ======================================================= */
function NavigationRail({
  currentView,
  onSelect,
  onSignOut,
  user
}: {
  currentView: "dashboard" | "machines" | "technicians" | "detail";
  onSelect: (view: "dashboard" | "machines" | "technicians") => void;
  onSignOut: () => void;
  user: User;
}) {
  return (
    <aside className="rail">
      {/* Top Brand Logo Button */}
      <div className="rail-top">
        <button
          className="brand-btn"
          onClick={() => onSelect("dashboard")}
          aria-label="Arture Spatial OS Home"
        >
          <Image
            src="/arture-logo.svg"
            alt="Arture"
            width={28}
            height={28}
            priority
            className="brand-logo-img"
          />
          <span className="tooltip">Arture Spatial OS</span>
        </button>
      </div>

      {/* Vertically Centered Navigation Icon Dock */}
      <nav className="rail-nav-dock" aria-label="Main Navigation">
        {/* 1. Dashboard / Mission Control */}
        <button
          className={`rail-nav-btn ${currentView === "dashboard" ? "nav-active" : ""}`}
          onClick={() => onSelect("dashboard")}
          aria-label="Spatial Dashboard"
        >
          <DashboardIcon />
          <span className="tooltip">Spatial Dashboard</span>
        </button>

        {/* 2. Systems & Digital Twins */}
        <button
          className={`rail-nav-btn ${currentView === "machines" || currentView === "detail" ? "nav-active" : ""}`}
          onClick={() => onSelect("machines")}
          aria-label="Industrial Systems & Digital Twins"
        >
          <CubeIcon />
          <span className="tooltip">Connected Systems</span>
        </button>

        {/* 3. Expert Network */}
        <button
          className={`rail-nav-btn ${currentView === "technicians" ? "nav-active" : ""}`}
          onClick={() => onSelect("technicians")}
          aria-label="Expert Network"
        >
          <UsersIcon />
          <span className="tooltip">Expert Network</span>
        </button>
      </nav>

      {/* Bottom Controls */}
      <div className="rail-foot">
        <div className="mesh-status-indicator" title="Voice relay connection"><span className="tooltip"><AppConnectionStatus /></span></div>

        <button
          className="rail-foot-btn"
          onClick={onSignOut}
          aria-label="Sign out"
          title={`Signed in as ${user.name} (${user.role})`}
        >
          <span>{user.name.split(" ").map((n) => n[0]).join("")}</span>
          <span className="tooltip">Sign out ({user.name})</span>
        </button>
      </div>
    </aside>
  );
}

/* =======================================================
   DASHBOARD / MISSION CONTROL (COMPLETELY REDESIGNED)
   Answers clearly: What is Arture? What can I do right now?
   ======================================================= */
function MachinesView({
  machines,
  filtered,
  query,
  setQuery,
  statusFilter,
  setStatusFilter,
  viewMode,
  setViewMode,
  open,
  add,
  admin,
  readOnly,
  onQuickLog
}: {
  machines: Machine[];
  filtered: Machine[];
  query: string;
  setQuery: (val: string) => void;
  statusFilter: "all" | Status;
  setStatusFilter: (val: "all" | Status) => void;
  viewMode: "grid" | "table";
  setViewMode: (val: "grid" | "table") => void;
  open: (id: string) => void;
  add: () => void;
  admin: boolean;
  readOnly: boolean;
  onQuickLog: (m: Machine) => void;
}) {
  const operationalCount = machines.filter((m) => m.status === "operational").length;
  const serviceDueCount = machines.filter((m) => m.status === "service_due").length;
  const offlineCount = machines.filter((m) => m.status === "offline").length;

  return (
    <div className="page systems-container">
      {/* Header */}
      <div className="page-head">
        <div>
          <p className="eyebrow">MACHINE RECORDS</p>
          <h1>Machines</h1>
          <p className="lede">
            Browse registered equipment, uploaded manuals, and recorded work history. App connection status is reported by the voice relay.
          </p>
        </div>
        {admin && (
          <button className="btn-primary btn-orange" onClick={add}>
            <PlusIcon />
            <span>Add Connected System</span>
          </button>
        )}
      </div>

      {/* KPI Filter Bar */}
      <div className="systems-kpi-bar">
        <button
          className={`systems-kpi-chip ${statusFilter === "all" ? "kpi-active" : ""}`}
          onClick={() => setStatusFilter("all")}
        >
          <div className="kpi-chip-title">
            <span>All Systems</span>
          </div>
          <span className="kpi-chip-num">{machines.length}</span>
        </button>

        <button
          className={`systems-kpi-chip ${statusFilter === "operational" ? "kpi-active" : ""}`}
          onClick={() => setStatusFilter("operational")}
        >
          <div className="kpi-chip-title">
            <span style={{ color: "var(--mint)" }}>●</span>
            <span>Operational</span>
          </div>
          <span className="kpi-chip-num" style={{ color: "var(--mint)" }}>{operationalCount}</span>
        </button>

        <button
          className={`systems-kpi-chip ${statusFilter === "service_due" ? "kpi-active" : ""}`}
          onClick={() => setStatusFilter("service_due")}
        >
          <div className="kpi-chip-title">
            <span style={{ color: "var(--amber)" }}>▲</span>
            <span>Service Due</span>
          </div>
          <span className="kpi-chip-num" style={{ color: "var(--amber)" }}>{serviceDueCount}</span>
        </button>

        <button
          className={`systems-kpi-chip ${statusFilter === "offline" ? "kpi-active" : ""}`}
          onClick={() => setStatusFilter("offline")}
        >
          <div className="kpi-chip-title">
            <span style={{ color: "var(--red)" }}>✖</span>
            <span>Offline</span>
          </div>
          <span className="kpi-chip-num" style={{ color: "var(--red)" }}>{offlineCount}</span>
        </button>
      </div>

      {/* Search & View Controls Bar */}
      <div className="systems-controls">
        <div className="search-input-wrap">
          <span className="search-input-icon">
            <SearchIcon />
          </span>
          <input
            type="text"
            className="search-input-field"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by system name, asset code, model, or bay..."
          />
          {query && (
            <button className="search-clear-btn" onClick={() => setQuery("")} title="Clear search">
              &times;
            </button>
          )}
        </div>

        <div className="controls-right-group">
          <span style={{ fontSize: 13, fontWeight: 700, color: "#64748b" }}>
            Showing {filtered.length} of {machines.length}
          </span>

          <div className="view-toggle-wrap">
            <button
              className={`view-toggle-btn ${viewMode === "grid" ? "view-active" : ""}`}
              onClick={() => setViewMode("grid")}
              title="Card Grid View"
            >
              <GridIcon />
            </button>
            <button
              className={`view-toggle-btn ${viewMode === "table" ? "view-active" : ""}`}
              onClick={() => setViewMode("table")}
              title="Table View"
            >
              <TableIcon />
            </button>
          </div>
        </div>
      </div>

      {/* Grid View */}
      {viewMode === "grid" && (
        <div className="systems-cards-grid">
          {filtered.map((item) => (
            <div key={item.id} className="system-card">
              {/* Holographic Header Banner */}
              <div className="system-card-banner">
                <StatusPill status={item.status} />
                <span style={{ fontSize: 11, fontWeight: 800, color: "#94a3b8", background: "rgba(0,0,0,0.4)", padding: "3px 8px", borderRadius: 6, border: "1px solid rgba(255,255,255,0.1)" }}>
                  {item.assetCode}
                </span>

                <div className="system-banner-iso-cube">
                  <CubeIconLarge />
                </div>
              </div>

              {/* Card Content */}
              <div className="system-card-content">
                <div className="system-card-meta">
                  <h3>{item.name}</h3>
                  <span className="system-model-tag">Model: {item.model}</span>
                  <div className="system-location-row">
                    <LocationPinIcon />
                    <span>{item.location}</span>
                  </div>
                </div>

                <dl className="system-specs-grid">
                  <div className="system-spec-item">
                    <dt>App Connection</dt>
                    <dd><AppConnectionStatus assetCode={item.assetCode} /></dd>
                  </div>
                  <div className="system-spec-item">
                    <dt>Assigned Bay</dt>
                    <dd>{item.location}</dd>
                  </div>
                </dl>

                <div className="system-card-actions">
                  <button
                    className="btn-primary"
                    style={{ flex: 1, justifyContent: "center" }}
                    onClick={() => open(item.id)}
                  >
                    <span>Open Machine &amp; Documents</span>
                    <span>&rarr;</span>
                  </button>
                  <button
                    className="btn-secondary"
                    onClick={() => onQuickLog(item)}
                    title="Log work or service event"
                    disabled={readOnly}
                  >
                    Log
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Table View */}
      {viewMode === "table" && (
        <div className="systems-table-card">
          <table className="modern-table">
            <thead>
              <tr>
                <th>System &amp; Model</th>
                <th>Asset Code</th>
                <th>Location</th>
                <th>Status</th>
                <th>App Connection</th>
                <th style={{ textAlign: "right" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((item) => (
                <tr key={item.id}>
                  <td>
                    <button className="table-system-link" onClick={() => open(item.id)}>
                      <b>{item.name}</b>
                      <small>{item.model}</small>
                    </button>
                  </td>
                  <td>
                    <code style={{ fontSize: 12, background: "#f1f5f9", padding: "2px 6px", borderRadius: 4 }}>
                      {item.assetCode}
                    </code>
                  </td>
                  <td>
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
                      <LocationPinIcon />
                      {item.location}
                    </span>
                  </td>
                  <td>
                    <StatusPill status={item.status} />
                  </td>
                  <td>
                    <span style={{ fontSize: 12, fontWeight: 700, color: "#64748b" }}>
                      <AppConnectionStatus assetCode={item.assetCode} />
                    </span>
                  </td>
                  <td style={{ textAlign: "right" }}>
                    <button
                      className="btn-primary"
                      style={{ padding: "6px 12px", fontSize: 12 }}
                      onClick={() => open(item.id)}
                    >
                      Open Twin &rarr;
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Empty State */}
      {filtered.length === 0 && (
        <div className="empty-state">
          <div className="empty-state-icon">
            <SearchIcon />
          </div>
          <h4>No matching systems found</h4>
          <p>We couldn&apos;t find any systems matching &ldquo;{query}&rdquo;. Try clearing filters or search terms.</p>
          <button
            className="btn-secondary"
            onClick={() => {
              setQuery("");
              setStatusFilter("all");
            }}
          >
            Clear All Filters
          </button>
        </div>
      )}
    </div>
  );
}

/* =======================================================
   EXPERT NETWORK VIEW
   ======================================================= */
function TechsView({
  techs,
  add,
  admin
}: {
  techs: Tech[];
  add: () => void;
  admin: boolean;
}) {
  return (
    <div className="page">
      <div className="page-head">
        <div>
          <p className="eyebrow">REGISTERED WORKERS</p>
          <h1>Workers</h1>
          <p className="lede">
            Registered workers and their contact details. Active status reflects the worker record; live availability is not tracked.
          </p>
        </div>
        {admin && (
          <button className="btn-primary btn-orange" onClick={add}>
            <PlusIcon />
            <span>Add Expert Specialist</span>
          </button>
        )}
      </div>

      <div className="tech-grid">
        {techs.map((tech) => (
          <article className="expert-card" key={tech.id}>
            <div className="expert-card-top">
              <div className="expert-avatar-wrap">
                {tech.name.split(" ").map((n) => n[0]).join("")}
              </div>
              <span className={`expert-status-badge ${tech.active ? "active" : "offline"}`}>
                ● {tech.active ? "Active" : "Inactive"}
              </span>
            </div>

            <div>
              <h3 className="expert-name">{tech.name}</h3>
              <p className="expert-specialty">{tech.specialty}</p>
            </div>

            <a className="expert-contact-btn" href={`tel:${tech.phone}`}>
              <span>📞</span>
              <span>Direct Link: {tech.phone}</span>
            </a>
          </article>
        ))}
      </div>
    </div>
  );
}

/* =======================================================
   DETAIL VIEW (SYSTEM 3D TWIN, MANUALS & SERVICE TIMELINE)
   ======================================================= */
function DetailView({
  machine,
  techs,
  refreshKey,
  readOnly,
  back,
  log
}: {
  machine: Machine;
  techs: Tech[];
  refreshKey: number;
  readOnly: boolean;
  back: () => void;
  log: () => void;
}) {
  const [logs, setLogs] = useState<ServiceLog[]>([]);
  const [message, setMessage] = useState("");

  const loadLogs = useCallback(async () => {
    try {
      setLogs((await api<{ logs: ServiceLog[] }>(`/api/maintenance?machineId=${machine.id}`)).logs);
    } catch (cause) {
      setMessage(cause instanceof Error ? cause.message : "Could not load service timeline.");
    }
  }, [machine.id]);

  useEffect(() => {
    void loadLogs();
  }, [loadLogs, refreshKey]);

  return (
    <div className="page">
      <button className="detail-back-btn" onClick={back}>
        <span>&larr;</span>
        <span>Back to Connected Systems</span>
      </button>

      {/* Detail Header Card */}
      <div className="detail-header-card">
        <div>
          <p className="eyebrow">{machine.assetCode} &middot; {machine.location}</p>
          <h1 style={{ margin: "4px 0 8px 0", fontSize: 32, fontWeight: 800 }}>{machine.name}</h1>
          <p style={{ margin: 0, color: "#64748b", fontSize: 14 }}>
            Model: <b>{machine.model}</b> &middot; <AppConnectionStatus assetCode={machine.assetCode} />
          </p>
        </div>
        <StatusPill status={machine.status} />
      </div>

      <div className="detail-grid-two">
        {/* System Overview Panel */}
        <section className="detail-panel">
          <p className="eyebrow">SPATIAL WORKFLOW CONTEXT</p>
          <h3 style={{ margin: "6px 0 16px 0", fontSize: 20, fontWeight: 800 }}>Machine Status</h3>

          <div style={{ padding: "16px", borderRadius: 12, background: "#f8fafc", border: "1px solid #e2e8f0", marginBottom: 20 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: "#64748b" }}>Current Status</span>
              <StatusPill status={machine.status} />
            </div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: "#64748b" }}>Assigned Worker</span>
              <span style={{ fontSize: 13, fontWeight: 800, color: "#0f172a" }}>
                Unassigned
              </span>
            </div>
          </div>

          <button
            className="btn-primary btn-orange"
            style={{ width: "100%", justifyContent: "center" }}
            onClick={log}
            disabled={readOnly || !techs.some((t) => t.active)}
          >
            + Document Service / Work Event
          </button>
          {readOnly && <p style={{ color: "#64748b", fontSize: 12 }}>Guest access is read-only. Sign in as an administrator to make changes.</p>}
        </section>

        {/* Knowledge Sources & Documents */}
        <DocumentKnowledge key={machine.id} machineId={machine.id} />
      </div>

      <ConversationSessions key={machine.id} machineId={machine.id} />

      {/* Service & Evidence Timeline */}
      <section className="detail-panel">
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
          <h3 style={{ margin: 0, fontSize: 18, fontWeight: 800 }}>Work &amp; Evidence Timeline</h3>
          <span style={{ fontSize: 12, color: "#64748b", fontWeight: 700 }}>{logs.length} Logged Events</span>
        </div>

        {message && <p style={{ color: "#ef4444", fontSize: 13 }}>{message}</p>}

        {logs.length ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {logs.map((entry) => (
              <article key={entry.id} className="attention-card-item">
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <b>{entry.technicianName}</b>
                    <span style={{ fontSize: 12, color: "#64748b" }}>
                      {new Date(entry.serviceDate).toLocaleDateString()} &middot; {entry.minutesSpent} mins spent
                    </span>
                  </div>
                  <p style={{ margin: "6px 0 0 0", fontSize: 13, color: "#334155" }}>{entry.notes}</p>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <p style={{ color: "#64748b", fontSize: 13, padding: "20px 0", textAlign: "center" }}>
            No work events documented for this system yet. Click &ldquo;Document Service / Work Event&rdquo; to add one.
          </p>
        )}
      </section>
    </div>
  );
}

/* =======================================================
   DOCUMENTS & SOP INGESTION
   ======================================================= */
/* =======================================================
   MODALS / DIALOGS
   ======================================================= */
function Dialog({ title, close, children }: { title: string; close: () => void; children: ReactNode }) {
  return (
    <div className="dialog-backdrop" onMouseDown={close}>
      <div className="dialog-box" onMouseDown={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
        <div className="dialog-head">
          <h2>{title}</h2>
          <button className="dialog-close-btn" onClick={close} aria-label="Close dialog">
            &times;
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function MachineForm({ close, submit }: { close: () => void; submit: (e: FormEvent<HTMLFormElement>) => void }) {
  return (
    <Dialog title="Add Connected System" close={close}>
      <form onSubmit={submit} className="dialog-form">
        <label>
          Asset Code
          <input name="assetCode" placeholder="e.g. ATR-DEMO-004" required />
        </label>
        <label>
          System Name
          <input name="name" placeholder="e.g. 5-Axis Milling Station" required />
        </label>
        <label>
          Model / Configuration
          <input name="model" placeholder="e.g. Mazak Integrex i-200" required />
        </label>
        <label>
          Plant Location / Bay
          <input name="location" placeholder="e.g. Workshop C, Bay 2" required />
        </label>
        <div className="dialog-actions">
          <button type="button" className="btn-secondary" onClick={close}>Cancel</button>
          <button type="submit" className="btn-primary btn-orange">Save System</button>
        </div>
      </form>
    </Dialog>
  );
}

function TechForm({ close, submit }: { close: () => void; submit: (e: FormEvent<HTMLFormElement>) => void }) {
  return (
    <Dialog title="Add Expert Specialist" close={close}>
      <form onSubmit={submit} className="dialog-form">
        <label>
          Full Name
          <input name="name" placeholder="e.g. David Kumar" required />
        </label>
        <label>
          Technical Specialty
          <input name="specialty" placeholder="e.g. Hydraulic systems, CNC servo alignment" required />
        </label>
        <label>
          Direct Contact Phone
          <input name="phone" placeholder="+91 90000 00004" required />
        </label>
        <div className="dialog-actions">
          <button type="button" className="btn-secondary" onClick={close}>Cancel</button>
          <button type="submit" className="btn-primary btn-orange">Save Specialist</button>
        </div>
      </form>
    </Dialog>
  );
}

function LogForm({
  techs,
  targetMachineName,
  close,
  submit
}: {
  techs: Tech[];
  targetMachineName?: string;
  close: () => void;
  submit: (e: FormEvent<HTMLFormElement>) => void;
}) {
  const active = techs.filter((t) => t.active);
  return (
    <Dialog title={`Document Work Event ${targetMachineName ? `(${targetMachineName})` : ""}`} close={close}>
      <form onSubmit={submit} className="dialog-form">
        <label>
          Assigned Specialist
          <select name="technicianId" required disabled={!active.length}>
            {active.length ? (
              active.map((t) => (
                <option key={t.id} value={t.id}>{t.name} ({t.specialty})</option>
              ))
            ) : (
              <option>No experts currently available</option>
            )}
          </select>
        </label>
        <label>
          Service Date
          <input name="serviceDate" type="date" defaultValue={new Date().toISOString().split("T")[0]} required />
        </label>
        <label>
          Minutes Spent
          <input name="minutesSpent" type="number" min="1" max="1440" defaultValue="45" required />
        </label>
        <label>
          Procedures &amp; Work Notes
          <input name="notes" placeholder="e.g. Replaced filter, calibrated optical mirror alignment." required />
        </label>
        <div className="dialog-actions">
          <button type="button" className="btn-secondary" onClick={close}>Cancel</button>
          <button type="submit" className="btn-primary btn-orange" disabled={!active.length}>
            Save Work Event
          </button>
        </div>
      </form>
    </Dialog>
  );
}


/* =======================================================
   STATUS PILL HELPER
   ======================================================= */
function StatusPill({ status }: { status: Status }) {
  return (
    <span className={`status-pill ${status}`}>
      <span className="status-pill-dot" />
      <span>{statusText(status)}</span>
    </span>
  );
}

/* =======================================================
   CLEAN VECTOR SVG ICONS (ZERO EXTRA NPM DEPENDENCIES)
   ======================================================= */
function DashboardIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect width="7" height="9" x="3" y="3" rx="1.5" />
      <rect width="7" height="5" x="14" y="3" rx="1.5" />
      <rect width="7" height="9" x="14" y="12" rx="1.5" />
      <rect width="7" height="5" x="3" y="16" rx="1.5" />
    </svg>
  );
}

function CubeIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m21 7.5-9-5.25L3 7.5m18 0-9 5.25m9-5.25v9l-9 5.25M3 7.5l9 5.25M3 7.5v9l9 5.25m0-9v9" />
    </svg>
  );
}

function CubeIconLarge() {
  return (
    <svg width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m21 7.5-9-5.25L3 7.5m18 0-9 5.25m9-5.25v9l-9 5.25M3 7.5l9 5.25M3 7.5v9l9 5.25m0-9v9" />
    </svg>
  );
}

function UsersIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

function GlassesIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="6" cy="14" r="4" />
      <circle cx="18" cy="14" r="4" />
      <path d="M14 14h-4" />
      <path d="M2 14l2.5-7" />
      <path d="M22 14l-2.5-7" />
    </svg>
  );
}

function DocumentIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
      <line x1="10" y1="9" x2="8" y2="9" />
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  );
}

function LocationPinIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  );
}

function GridIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect width="7" height="7" x="3" y="3" rx="1" />
      <rect width="7" height="7" x="14" y="3" rx="1" />
      <rect width="7" height="7" x="14" y="14" rx="1" />
      <rect width="7" height="7" x="3" y="14" rx="1" />
    </svg>
  );
}

function TableIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="3" x2="21" y1="6" y2="6" />
      <line x1="3" x2="21" y1="12" y2="12" />
      <line x1="3" x2="21" y1="18" y2="18" />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  );
}

function SignOutIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <polyline points="16 17 21 12 16 7" />
      <line x1="21" y1="12" x2="9" y2="12" />
    </svg>
  );
}
