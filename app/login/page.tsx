"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "../../lib/supabaseClient";

type Mode = "login" | "signup" | "forgot";

export default function LoginPage() {
  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      if (mode === "forgot") {
        if (!email) {
          throw new Error("Please enter your email to reset your password.");
        }

        const redirectTo =
          typeof window !== "undefined"
            ? `${window.location.origin}/change-password`
            : undefined;

        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo,
        });

        if (error) throw error;

        setSuccessMsg(
          "If an account exists for that email, a password reset link has been sent."
        );
        return;
      }

      if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
        });
        if (error) throw error;

        // Auto-create profile row after signup (best-effort)
        if (data.user) {
          try {
            await fetch("/api/create-profile", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                userId: data.user.id,
                email: data.user.email,
              }),
            });
          } catch {
            // Non-fatal – profile creation can be handled elsewhere if needed
          }
        }
      } else if (mode === "login") {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
      }

      // On successful login/signup, go to profile
      if (mode === "login" || mode === "signup") {
        router.push("/profile");
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  };

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
          maxWidth: 960,
          width: "100%",
          flexDirection: "row",
          alignItems: "stretch",
          gap: 32,
        }}
      >
        {/* Left: marketing / flavor */}
        <div
          style={{
            flex: 1.2,
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            gap: 12,
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
            FL Battles · Early Access
          </p>

          <h1
            style={{
              fontSize: "2.1rem",
              lineHeight: 1.15,
              margin: 0,
            }}
          >
            {mode === "forgot"
              ? "Reset your FL Battles password."
              : "Log in to play 10-minute FL Studio beat battles."}
          </h1>

          <p
            style={{
              color: "#9ca3af",
              fontSize: "0.98rem",
              maxWidth: 480,
            }}
          >
            {mode === "forgot"
              ? "Enter the email tied to your FL Battles account. If it exists, you’ll receive a link to set a new password."
              : "Your account keeps track of your ranked ladder, win rate, and battle history. Sign in with email and password to jump straight into the queue."}
          </p>

          <ul
            style={{
              listStyle: "none",
              padding: 0,
              marginTop: 8,
              display: mode === "forgot" ? "none" : "grid",
              gap: 6,
              fontSize: "0.9rem",
              color: "#cbd5f5",
            }}
          >
            <li>• Earn rating by winning ranked battles.</li>
            <li>• View your past submissions and stats.</li>
            <li>• Join custom lobbies with friends.</li>
          </ul>

          <p style={{ marginTop: 16, fontSize: "0.85rem", color: "#6b7280" }}>
            Just landed here?{" "}
            <Link href="/" style={{ color: "#60a5fa", textDecoration: "none" }}>
              Back to home
            </Link>
          </p>
        </div>

        {/* Right: auth card */}
        <div
          className="card"
          style={{
            flex: 1,
            maxWidth: 420,
            marginTop: 0,
            borderRadius: 20,
          }}
        >
          {/* Mode switch (login/signup) */}
          <div
            style={{
              display: "flex",
              background: "rgba(15,23,42,0.9)",
              borderRadius: 999,
              padding: 3,
              marginBottom: 18,
              border: "1px solid rgba(148,163,184,0.4)",
            }}
          >
            <button
              type="button"
              onClick={() => {
                setMode("login");
                setErrorMsg(null);
                setSuccessMsg(null);
              }}
              className="btn-secondary"
              style={{
                flex: 1,
                borderRadius: 999,
                border: "none",
                background:
                  mode === "login"
                    ? "rgba(30,64,175,0.9)"
                    : "transparent",
                color: mode === "login" ? "#e5e7eb" : "#9ca3af",
                boxShadow:
                  mode === "login"
                    ? "0 0 0 1px rgba(191,219,254,0.4)"
                    : "none",
              }}
            >
              Login
            </button>
            <button
              type="button"
              onClick={() => {
                setMode("signup");
                setErrorMsg(null);
                setSuccessMsg(null);
              }}
              className="btn-secondary"
              style={{
                flex: 1,
                borderRadius: 999,
                border: "none",
                background:
                  mode === "signup"
                    ? "rgba(30,64,175,0.9)"
                    : "transparent",
                color: mode === "signup" ? "#e5e7eb" : "#9ca3af",
                boxShadow:
                  mode === "signup"
                    ? "0 0 0 1px rgba(191,219,254,0.4)"
                    : "none",
              }}
            >
              Sign Up
            </button>
          </div>

          <h2 style={{ margin: "0 0 4px", fontSize: "1.25rem" }}>
            {mode === "login"
              ? "Welcome back"
              : mode === "signup"
              ? "Create your account"
              : "Forgot your password?"}
          </h2>
          <p
            className="page-description"
            style={{ marginBottom: 16, fontSize: "0.9rem" }}
          >
            {mode === "login" &&
              "Enter your details to access your profile and start battling."}
            {mode === "signup" &&
              "Sign up with an email and password to start playing ranked battles."}
            {mode === "forgot" &&
              "We’ll email you a secure link to set a new password."}
          </p>

          <form
            onSubmit={handleSubmit}
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 12,
            }}
          >
            {/* Email always shown */}
            <label
              style={{
                fontSize: "0.85rem",
                display: "flex",
                flexDirection: "column",
                gap: 4,
              }}
            >
              <span>Email</span>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
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

            {/* Password only for login/signup */}
            {mode !== "forgot" && (
              <label
                style={{
                  fontSize: "0.85rem",
                  display: "flex",
                  flexDirection: "column",
                  gap: 4,
                }}
              >
                <span>Password</span>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 6 characters"
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
            )}

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
              {submitting
                ? mode === "login"
                  ? "Logging in..."
                  : mode === "signup"
                  ? "Creating account..."
                  : "Sending reset link..."
                : mode === "login"
                ? "Log In"
                : mode === "signup"
                ? "Create Account"
                : "Send reset link"}
            </button>

            {/* Forgot password / back links */}
            {mode === "login" && (
              <button
                type="button"
                onClick={() => {
                  setMode("forgot");
                  setErrorMsg(null);
                  setSuccessMsg(null);
                }}
                style={{
                  marginTop: 8,
                  fontSize: "0.78rem",
                  color: "#60a5fa",
                  background: "none",
                  border: "none",
                  padding: 0,
                  textAlign: "left",
                  cursor: "pointer",
                }}
              >
                Forgot your password?
              </button>
            )}

            {mode === "forgot" && (
              <button
                type="button"
                onClick={() => {
                  setMode("login");
                  setErrorMsg(null);
                  setSuccessMsg(null);
                }}
                style={{
                  marginTop: 8,
                  fontSize: "0.78rem",
                  color: "#9ca3af",
                  background: "none",
                  border: "none",
                  padding: 0,
                  textAlign: "left",
                  cursor: "pointer",
                }}
              >
                ← Back to login
              </button>
            )}
          </form>
        </div>
      </section>
    </main>
  );
}
