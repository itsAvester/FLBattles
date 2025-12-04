"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "../../lib/supabaseClient";
import type { User } from "@supabase/supabase-js";

export default function ChangePasswordPage() {
  const [user, setUser] = useState<User | null>(null);
  const [loadingUser, setLoadingUser] = useState(true);

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const router = useRouter();

  // Load current user
  useEffect(() => {
    const loadUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      setUser(user ?? null);
      setLoadingUser(false);
    };

    loadUser();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!user) {
      setErrorMsg("You must be logged in to change your password.");
      return;
    }

    if (newPassword.length < 6) {
      setErrorMsg("Password must be at least 6 characters long.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMsg("New password and confirmation do not match.");
      return;
    }

    setSubmitting(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) throw error;

      setSuccessMsg("Your password has been updated.");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to update password.");
    } finally {
      setSubmitting(false);
    }
  };

  // While we check auth state
  if (loadingUser) {
    return (
      <main
        style={{
          minHeight: "calc(100vh - 60px)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "32px 16px",
        }}
      >
        <p style={{ color: "#94a3b8" }}>Loading...</p>
      </main>
    );
  }

  // If not logged in
  if (!user) {
    return (
      <main
        style={{
          minHeight: "calc(100vh - 60px)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "32px 16px",
        }}
      >
        <section className="card" style={{ maxWidth: 420, width: "100%" }}>
          <h2 style={{ marginTop: 0, marginBottom: 8 }}>Sign in required</h2>
          <p style={{ color: "#9ca3af", fontSize: "0.95rem", marginBottom: 16 }}>
            You need to be logged in to change your password.
          </p>
          <div style={{ display: "flex", gap: 12 }}>
            <Link href="/login" className="btn-primary">
              Go to Login
            </Link>
            <button
              type="button"
              className="btn-secondary"
              onClick={() => router.push("/")}
            >
              Back to Home
            </button>
          </div>
        </section>
      </main>
    );
  }

  // Main change-password UI
  return (
    <main
      style={{
        minHeight: "calc(100vh - 60px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "32px 16px",
      }}
    >
      <section
        className="page-inner"
        style={{
          maxWidth: 720,
          width: "100%",
          flexDirection: "row",
          alignItems: "stretch",
          gap: 32,
        }}
      >
        {/* Left: context / copy */}
        <div
          style={{
            flex: 1.1,
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            gap: 10,
          }}
        >
          <p
            style={{
              textTransform: "uppercase",
              letterSpacing: "0.18em",
              fontSize: 11,
              fontWeight: 600,
              color: "#60a5fa",
            }}
          >
            Account security
          </p>

          <h1
            style={{
              fontSize: "1.9rem",
              lineHeight: 1.2,
              margin: 0,
            }}
          >
            Change your FL Battles password.
          </h1>

          <p
            style={{
              color: "#9ca3af",
              fontSize: "0.98rem",
              maxWidth: 420,
            }}
          >
            Use a strong password you don&apos;t reuse on other sites. You will
            stay logged in on this device after changing it.
          </p>

          <p style={{ marginTop: 8, fontSize: "0.85rem", color: "#6b7280" }}>
            Logged in as{" "}
            <span style={{ color: "#e5e7eb" }}>{user.email}</span>.
          </p>

          <p style={{ marginTop: 10, fontSize: "0.85rem", color: "#6b7280" }}>
            If you forgot your current password and can&apos;t log in, use the
            reset link on the{" "}
            <Link
              href="/login"
              style={{ color: "#60a5fa", textDecoration: "none" }}
            >
              login page
            </Link>
            .
          </p>
        </div>

        {/* Right: form card */}
        <div
          className="card"
          style={{
            flex: 1,
            maxWidth: 380,
            marginTop: 0,
            borderRadius: 20,
          }}
        >
          <h2 style={{ marginTop: 0, marginBottom: 4, fontSize: "1.25rem" }}>
            Update password
          </h2>
          <p
            style={{
              color: "#9ca3af",
              fontSize: "0.9rem",
              marginBottom: 16,
            }}
          >
            Enter a new password and confirm it. Minimum 6 characters.
          </p>

          <form
            onSubmit={handleSubmit}
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 12,
            }}
          >
            <label
              style={{
                fontSize: "0.85rem",
                display: "flex",
                flexDirection: "column",
                gap: 4,
              }}
            >
              <span>New password</span>
              <input
                type="password"
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="••••••••"
                style={{
                  width: "100%",
                  padding: "9px 11px",
                  borderRadius: 8,
                  border: "1px solid rgba(148,163,184,0.7)",
                  background: "rgba(15,23,42,0.9)",
                  color: "#e5e7eb",
                  fontSize: "0.9rem",
                  outline: "none",
                }}
              />
            </label>

            <label
              style={{
                fontSize: "0.85rem",
                display: "flex",
                flexDirection: "column",
                gap: 4,
              }}
            >
              <span>Confirm new password</span>
              <input
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Repeat new password"
                style={{
                  width: "100%",
                  padding: "9px 11px",
                  borderRadius: 8,
                  border: "1px solid rgba(148,163,184,0.7)",
                  background: "rgba(15,23,42,0.9)",
                  color: "#e5e7eb",
                  fontSize: "0.9rem",
                  outline: "none",
                }}
              />
            </label>

            {errorMsg && (
              <p
                style={{
                  color: "#f97373",
                  fontSize: "0.9rem",
                  marginTop: 4,
                }}
              >
                {errorMsg}
              </p>
            )}

            {successMsg && (
              <p
                style={{
                  color: "#4ade80",
                  fontSize: "0.9rem",
                  marginTop: 4,
                }}
              >
                {successMsg}
              </p>
            )}

            <button
              type="submit"
              className="btn-primary"
              disabled={submitting}
              style={{ marginTop: 10, alignSelf: "flex-start" }}
            >
              {submitting ? "Updating..." : "Save new password"}
            </button>

            <button
              type="button"
              className="btn-secondary"
              style={{ marginTop: 8, alignSelf: "flex-start" }}
              onClick={() => router.push("/profile")}
            >
              Back to profile
            </button>
          </form>
        </div>
      </section>
    </main>
  );
}
