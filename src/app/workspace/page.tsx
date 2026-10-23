"use client";

import { FormEvent, ReactNode, useCallback, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";

type Status = "operational" | "service_due" | "offline";
type Machine = { id: string; assetCode: string; name: string; model: string; location: string; status: Status };
type Tech = { id: string; name: string; specialty: string; phone: string; active: boolean };
type User = { id: string; name: string; role: "admin" | "technician" };
type DocumentRecord = { id: string; originalName: string; mimeType: string; size: number };
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
      if (!user) {
        router.replace("/login");
      }
      setError(cause instanceof Error ? cause.message : "Could not load Arture.");
    }
  }, [router, user]);

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
              Plant Floor AR Mesh
            </span>
            <p className="topbar-title">Arture Spatial OS &middot; Digital Twin &amp; Knowledge Hub</p>
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
            admin={user.role === "admin"}
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
        <div className="mesh-status-indicator" title="Spatial Mesh Stream: 60 FPS Online">
          <div className="mesh-status-dot" />
          <span className="tooltip">AR Mesh Stream: Live</span>
        </div>

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
function Dashboard({
  machines,
  techs,
  open,
  all,
  viewTechs
}: {
  machines: Machine[];
  techs: Tech[];
  open: (id: string) => void;
  all: () => void;
  viewTechs: () => void;
}) {
  const operationalCount = machines.filter((m) => m.status === "operational").length;
  const serviceDueCount = machines.filter((m) => m.status === "service_due").length;
  const offlineCount = machines.filter((m) => m.status === "offline").length;
  const attentionList = machines.filter((m) => m.status !== "operational");
  const healthPercent = machines.length > 0 ? Math.round((operationalCount / machines.length) * 100) : 100;

  return (
    <div className="page dashboard-grid">
      {/* 1. Hero Mission Control Banner: Clear explanation of WHAT Arture is */}
      <div className="mission-banner">
        <div className="mission-banner-content">
          <div className="mission-tag-row">
            <span className="mission-tag">
              <span className="mission-tag-dot" />
              Plant Floor Mesh Active
            </span>
            <span className="mission-tag">3 Connected Digital Twins</span>
            <span className="mission-tag">🎙️ ConvoAI Voice Stream (24kHz Ready)</span>
          </div>

          <div>
            <p className="eyebrow" style={{ color: "#fb923c" }}>ARTURE // AI SPATIAL OPERATING SYSTEM</p>
            <h2>Industrial expertise, directly overlaid on the physical world.</h2>
            <p className="mission-desc">
              Arture connects heavy machinery with spatial AR computing. Turn technical manuals into step-by-step
              holographic guides for field technicians, converse with hands-free AI voice assistants on live equipment,
              and monitor plant-wide digital twins in real time.
            </p>
          </div>

          <div className="mission-quick-actions">
            <button className="btn-primary btn-orange" onClick={all}>
              <GlassesIcon />
              <span>Explore Systems &amp; Launch AR Guides</span>
            </button>
            <button className="btn-secondary" style={{ background: "rgba(255,255,255,0.12)", color: "#ffffff", borderColor: "rgba(255,255,255,0.2)" }} onClick={viewTechs}>
              <UsersIcon />
              <span>Connect Remote Expert</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. Core Spatial Workflows: "What You Can Do" */}
      <section>
        <div className="workflow-section-title">
          <h3>Core Spatial Operations</h3>
          <p>Choose an operational workflow to deploy on the plant floor.</p>
        </div>

        <div className="workflow-cards-grid">
          {/* Card 1 */}
          <div className="workflow-card" onClick={all} style={{ cursor: "pointer" }}>
            <div className="workflow-card-top">
              <div className="workflow-icon-wrap orange">
                <GlassesIcon />
              </div>
              <div>
                <h4>Guided AR Procedures</h4>
                <p>
                  Deploy interactive 3D spatial pins and checklist steps directly onto physical equipment for technicians wearing AR glasses or using mobile devices.
                </p>
              </div>
            </div>
            <span className="workflow-card-action">
              <span>View Systems &amp; Procedures</span> &rarr;
            </span>
          </div>

          {/* Card 2 */}
          <div className="workflow-card" onClick={all} style={{ cursor: "pointer" }}>
            <div className="workflow-card-top">
              <div className="workflow-icon-wrap cyan">
                <DocumentIcon />
              </div>
              <div>
                <h4>AI Knowledge &amp; SOP Ingestion</h4>
                <p>
                  Upload dense PDF manuals and schematics. Our AI automatically parses assemblies and indexes voice-interactive troubleshooting steps.
                </p>
              </div>
            </div>
            <span className="workflow-card-action">
              <span>Inspect Machine Manuals</span> &rarr;
            </span>
          </div>

          {/* Card 3 */}
          <div className="workflow-card" onClick={viewTechs} style={{ cursor: "pointer" }}>
            <div className="workflow-card-top">
              <div className="workflow-icon-wrap mint">
                <UsersIcon />
              </div>
              <div>
                <h4>Live Expert Telepresence</h4>
                <p>
                  Connect on-site operators with senior engineers via spatial audio and live AR telestration to resolve urgent bottlenecks with zero travel time.
                </p>
              </div>
            </div>
            <span className="workflow-card-action">
              <span>Open Expert Directory</span> &rarr;
            </span>
          </div>
        </div>
      </section>

      {/* 3. Telemetry & Metrics Row */}
      <section className="metrics-row">
        <div className="metric-card">
          <span className="metric-card-label">Fleet Health Index</span>
          <div className="metric-card-val-row">
            <span className="metric-card-val" style={{ color: healthPercent > 70 ? "var(--mint)" : "var(--amber)" }}>
              {healthPercent}%
            </span>
            <span className="metric-card-sub">{operationalCount} of {machines.length} nominal</span>
          </div>
          <div className="metric-bar-wrap">
            <div className="metric-bar-fill" style={{ width: `${healthPercent}%` }} />
          </div>
        </div>

        <div className="metric-card">
          <span className="metric-card-label">Connected Digital Twins</span>
          <div className="metric-card-val-row">
            <span className="metric-card-val">{String(machines.length).padStart(2, "0")}</span>
            <span className="metric-card-sub">Active 3D Models</span>
          </div>
          <div className="metric-bar-wrap">
            <div className="metric-bar-fill" style={{ width: "100%", background: "linear-gradient(90deg, #f97316 0%, #fb923c 100%)" }} />
          </div>
        </div>

        <div className="metric-card">
          <span className="metric-card-label">Maintenance Due</span>
          <div className="metric-card-val-row">
            <span className="metric-card-val" style={{ color: serviceDueCount > 0 ? "var(--amber)" : "var(--ink)" }}>
              {String(serviceDueCount).padStart(2, "0")}
            </span>
            <span className="metric-card-sub">Action Required</span>
          </div>
          <div className="metric-bar-wrap">
            <div className="metric-bar-fill" style={{ width: `${(serviceDueCount / Math.max(machines.length, 1)) * 100}%`, background: "#f59e0b" }} />
          </div>
        </div>

        <div className="metric-card">
          <span className="metric-card-label">Certified Experts</span>
          <div className="metric-card-val-row">
            <span className="metric-card-val">{String(techs.filter((t) => t.active).length).padStart(2, "0")}</span>
            <span className="metric-card-sub">On-Call Now</span>
          </div>
          <div className="metric-bar-wrap">
            <div className="metric-bar-fill" style={{ width: "100%", background: "#0284c7" }} />
          </div>
        </div>
      </section>

      {/* 4. Operations Command: Priority Systems Needing Attention + Recent Live Activity */}
      <section className="ops-two-col">
        {/* Systems Requiring Action */}
        <div className="ops-panel">
          <div className="ops-panel-head">
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <h3>Priority Attention Systems</h3>
              {attentionList.length > 0 && (
                <span className="ops-panel-badge">{attentionList.length} Action Needed</span>
              )}
            </div>
            <button className="btn-secondary" style={{ padding: "6px 12px", fontSize: 12 }} onClick={all}>
              View All Systems
            </button>
          </div>

          <div className="ops-panel-body">
            {attentionList.length > 0 ? (
              attentionList.map((m) => (
                <div key={m.id} className="attention-card-item">
                  <div className="attention-item-left">
                    <StatusPill status={m.status} />
                    <div className="attention-item-info">
                      <h5>{m.name}</h5>
                      <p>{m.assetCode} &middot; {m.location} &middot; {m.model}</p>
                    </div>
                  </div>
                  <button className="btn-primary" style={{ padding: "8px 14px", fontSize: 12 }} onClick={() => open(m.id)}>
                    Launch AR Twin &rarr;
                  </button>
                </div>
              ))
            ) : (
              <div style={{ padding: "32px 16px", textAlign: "center", color: "#64748b", fontSize: 14 }}>
                &check; All connected systems are currently operational and nominal.
              </div>
            )}
          </div>
        </div>

        {/* Live Plant Floor Activity Stream */}
        <div className="ops-panel">
          <div className="ops-panel-head">
            <h3>Recent Spatial Activity</h3>
            <span style={{ fontSize: 11, fontWeight: 700, color: "#64748b" }}>LIVE TELEMETRY</span>
          </div>

          <div className="ops-panel-body">
            <div className="activity-list">
              <div className="activity-item">
                <div className="activity-item-dot" style={{ background: "var(--mint)" }} />
                <div className="activity-item-content">
                  <p><b>Rohan Iyer</b> completed mirror alignment on <b>Laser Cutter</b> via AR overlay.</p>
                  <small>45 min &middot; ATR-DEMO-002</small>
                </div>
              </div>
              <div className="activity-item">
                <div className="activity-item-dot" style={{ background: "var(--orange)" }} />
                <div className="activity-item-content">
                  <p><b>Asha Mehta</b> calibrated spindle speed and bearing vibration on <b>CNC Router</b>.</p>
                  <small>30 min &middot; ATR-DEMO-001</small>
                </div>
              </div>
              <div className="activity-item">
                <div className="activity-item-dot" style={{ background: "var(--red)" }} />
                <div className="activity-item-content">
                  <p><b>Nisha Rao</b> flagged thermal fault on <b>Vacuum Former</b>; replacement heating coil pending.</p>
                  <small>60 min &middot; ATR-DEMO-003</small>
                </div>
              </div>
              <div className="activity-item">
                <div className="activity-item-dot" style={{ background: "var(--cyan)" }} />
                <div className="activity-item-content">
                  <p><b>AI Convo Assistant</b> indexed 14 spatial anchor points for Luma 60W manual.</p>
                  <small>Automated knowledge ingest</small>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

/* =======================================================
   SYSTEMS VIEW (REDESIGNED TO LOOK WORLD-CLASS)
   Grid cards + Table view, instant KPI filters, search
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
          <p className="eyebrow">FLEET TELEMETRY &amp; DIGITAL TWINS</p>
          <h1>Connected Industrial Systems</h1>
          <p className="lede">
            Live digital twin representations of on-floor machinery. Each asset contains 3D CAD references,
            AI-extracted procedures, maintenance history, and spatial anchors.
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
                    <dt>Spatial Mesh</dt>
                    <dd style={{ color: "var(--mint)" }}>&check; Ready in AR</dd>
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
                    <span>Inspect AR Twin &amp; SOPs</span>
                    <span>&rarr;</span>
                  </button>
                  <button
                    className="btn-secondary"
                    onClick={() => onQuickLog(item)}
                    title="Log work or service event"
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
                <th>Spatial Twin</th>
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
                    <span style={{ fontSize: 12, fontWeight: 700, color: "var(--mint)" }}>
                      &check; 3D Anchored
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
          <p className="eyebrow">ON-CALL SPECIALISTS</p>
          <h1>Expert Guidance Network</h1>
          <p className="lede">
            Specialized senior engineers and technicians available for real-time remote spatial assistance,
            live AR video annotations, and procedural validation.
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
                ● {tech.active ? "Available" : "Offline"}
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
  back,
  log
}: {
  machine: Machine;
  techs: Tech[];
  refreshKey: number;
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
            Model: <b>{machine.model}</b> &middot; Digital Twin mesh loaded &amp; ready for AR overlay.
          </p>
        </div>
        <StatusPill status={machine.status} />
      </div>

      <div className="detail-grid-two">
        {/* System Overview Panel */}
        <section className="detail-panel">
          <p className="eyebrow">SPATIAL WORKFLOW CONTEXT</p>
          <h3 style={{ margin: "6px 0 16px 0", fontSize: 20, fontWeight: 800 }}>Status &amp; Assigned Expert</h3>

          <div style={{ padding: "16px", borderRadius: 12, background: "#f8fafc", border: "1px solid #e2e8f0", marginBottom: 20 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: "#64748b" }}>Current Status</span>
              <StatusPill status={machine.status} />
            </div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: "#64748b" }}>Lead Technician</span>
              <span style={{ fontSize: 13, fontWeight: 800, color: "#0f172a" }}>
                {techs.find((t) => t.active)?.name || "Unassigned"}
              </span>
            </div>
          </div>

          <button
            className="btn-primary btn-orange"
            style={{ width: "100%", justifyContent: "center" }}
            onClick={log}
            disabled={!techs.some((t) => t.active)}
          >
            + Document Service / Work Event
          </button>
        </section>

        {/* Knowledge Sources & Documents */}
        <Documents machineId={machine.id} />
      </div>

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
function Documents({ machineId }: { machineId: string }) {
  const [documents, setDocuments] = useState<DocumentRecord[]>([]);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [admin, setAdmin] = useState(false);

  const load = useCallback(async () => {
    try {
      setDocuments((await api<{ documents: DocumentRecord[] }>(`/api/documents?machineId=${machineId}`)).documents);
    } catch (cause) {
      setMessage(cause instanceof Error ? cause.message : "Could not load knowledge sources.");
    }
  }, [machineId]);

  useEffect(() => {
    void load();
    void api<{ user: User | null }>("/api/auth/session")
      .then(({ user }) => setAdmin(user?.role === "admin"))
      .catch(() => setAdmin(false));
  }, [load]);

  const upload = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const file = new FormData(event.currentTarget).get("file");
    if (!(file instanceof File) || !file.size) {
      setMessage("Please choose a valid PDF, PNG, or JPEG file.");
      return;
    }
    setBusy(true);
    setMessage("");
    try {
      const form = new FormData();
      form.set("machineId", machineId);
      form.set("file", file);
      const response = await fetch("/api/documents", { method: "POST", body: form });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.error || "Upload failed.");
      event.currentTarget.reset();
      await load();
    } catch (cause) {
      setMessage(cause instanceof Error ? cause.message : "Upload failed.");
    } finally {
      setBusy(false);
    }
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this knowledge source?")) return;
    setBusy(true);
    try {
      const response = await fetch(`/api/documents/${id}`, { method: "DELETE" });
      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.error || "Delete failed.");
      }
      setDocuments((current) => current.filter((doc) => doc.id !== id));
    } catch (cause) {
      setMessage(cause instanceof Error ? cause.message : "Delete failed.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="detail-panel">
      <p className="eyebrow">AI KNOWLEDGE SOURCES</p>
      <h3 style={{ margin: "6px 0 16px 0", fontSize: 20, fontWeight: 800 }}>Manuals, SOPs &amp; Diagrams</h3>

      {admin && (
        <form onSubmit={upload} style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 16 }}>
          <label style={{ fontSize: 12, fontWeight: 700, color: "#475569" }}>
            Upload Technical Manual (PDF / PNG / JPEG)
            <input
              name="file"
              type="file"
              accept="application/pdf,image/png,image/jpeg"
              required
              style={{ marginTop: 6, padding: "8px", border: "1px solid #cbd5e1", borderRadius: 8, width: "100%", background: "#ffffff" }}
            />
          </label>
          <button className="btn-secondary" disabled={busy} style={{ alignSelf: "flex-start" }}>
            {busy ? "Processing & Ingesting..." : "+ Ingest Knowledge Document"}
          </button>
        </form>
      )}

      {message && <p style={{ color: "#ef4444", fontSize: 12 }}>{message}</p>}

      {documents.length ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {documents.map((doc) => (
            <div key={doc.id} className="doc-row-item">
              <div className="doc-row-left">
                <span className="doc-badge">
                  {doc.mimeType === "application/pdf" ? "PDF" : "IMG"}
                </span>
                <a className="doc-link" href={`/api/documents/${doc.id}/download`}>
                  {doc.originalName} ({Math.ceil(doc.size / 1024)} KB)
                </a>
              </div>
              {admin && (
                <button
                  onClick={() => void remove(doc.id)}
                  disabled={busy}
                  style={{ color: "#94a3b8", fontSize: 18, padding: 4 }}
                  title="Delete Document"
                >
                  &times;
                </button>
              )}
            </div>
          ))}
        </div>
      ) : (
        <p style={{ color: "#64748b", fontSize: 13 }}>
          No manuals or SOP documents attached. Upload a PDF or schematic to enable AI spatial step extraction.
        </p>
      )}
    </section>
  );
}

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
          Minutes Spent in AR Guidance
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
