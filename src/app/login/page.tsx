"use client";

import { FormEvent, useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [tab, setTab] = useState<"login" | "signup">("login");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Preload workspace route chunk in background
    router.prefetch("/workspace");

    // Check if session already exists
    fetch("/api/auth/session")
      .then((res) => res.json())
      .then((data) => {
        if (data.user) {
          try {
            sessionStorage.setItem("arture_user", JSON.stringify(data.user));
          } catch {}
          router.replace("/workspace");
        }
      })
      .catch(() => {});
  }, [router]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const email = form.get("email") as string;
    const password = form.get("password") as string;
    setLoading(true);
    setMessage("");

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "Authentication failed.");
      if (data.user) {
        try {
          sessionStorage.setItem("arture_user", JSON.stringify(data.user));
        } catch {}
      }
      router.push("/workspace");
    } catch (cause) {
      setMessage(cause instanceof Error ? cause.message : "Sign in failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="shell auth-shell">
      <section className="workspace">
        <div className="auth-layout">
          {/* Left Intro Banner */}
          <div className="auth-intro">
            <Link href="/" className="brand" aria-label="Return to Arture Home">
              <Image src="/icons/logo.svg" alt="Arture Logo" width={36} height={36} className="brand-logo" />
              <span>ARTURE<span className="brand-sub"> / AI SPATIAL OS</span></span>
            </Link>

            <p className="eyebrow">AI spatial operating system</p>
            <h1>Industrial expertise, without boundaries.</h1>
            <p>
              Arture turns manuals, SOPs, and expert knowledge into spatial workflows for XR training,
              guided work, remote assistance, and digital-twin operations.
            </p>

            <div className="auth-stats">
              <span>Spatial learning &amp; guided procedures</span>
              <span>Remote expert collaboration</span>
              <span>Digital-twin ready operations</span>
            </div>
          </div>

          {/* Right Auth Card */}
          <section className="auth-card">
            <div>
              <p className="eyebrow">Secure workspace access</p>
              <h2>{tab === "login" ? "Enter the spatial workspace." : "Create operator access."}</h2>
              <p className="auth-copy">
                Open your organization&apos;s knowledge, workflows, and machine context.
              </p>
            </div>

            {/* Login / Signup Tab Toggle */}
            <div className="auth-tab-row">
              <button
                type="button"
                className={`auth-tab-btn ${tab === "login" ? "active" : ""}`}
                onClick={() => setTab("login")}
              >
                Log In
              </button>
              <button
                type="button"
                className={`auth-tab-btn ${tab === "signup" ? "active" : ""}`}
                onClick={() => setTab("signup")}
              >
                Sign Up
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              {tab === "signup" && (
                <label>
                  Full name
                  <input name="name" type="text" placeholder="e.g. Alex Morgan" required />
                </label>
              )}

              <label>
                Email address
                <input
                  name="email"
                  type="email"
                  autoComplete="email"
                  defaultValue="admin@arture.demo"
                  required
                />
              </label>

              <label>
                Password
                <input
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  defaultValue="Arture-Demo-2026!"
                  minLength={8}
                  required
                />
              </label>

              {message && (
                <p className="form-error" role="alert" style={{ margin: "6px 0", padding: "10px", borderRadius: 6, background: "#fee2e2", color: "#b91c1c", fontSize: 13 }}>
                  {message}
                </p>
              )}

              <div className="form-actions">
                <button className="primary" disabled={loading}>
                  <span>{loading ? "Verifying..." : tab === "login" ? "Open workspace" : "Create account"}</span>
                  <span aria-hidden="true">&rarr;</span>
                </button>
              </div>
            </form>

            <aside className="demo-access">
              <p>Hackathon demo workspace</p>
              <code>admin@arture.demo</code>
              <code>Arture-Demo-2026!</code>
            </aside>
          </section>
        </div>
      </section>
    </main>
  );
}
