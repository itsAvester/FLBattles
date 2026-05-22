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
            // Non-fatal. Profile creation can be handled elsewhere if needed.
          }
        }
      } else if (mode === "login") {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) throw error;
      }

      if (mode === "login" || mode === "signup") {
        router.push("/profile");
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  };

  const switchMode = (nextMode: Mode) => {
    setMode(nextMode);
    setErrorMsg(null);
    setSuccessMsg(null);
  };

  return (
    <main
      style={{
        minHeight: "calc(100vh - 60px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "32px 16px",
        fontFamily:
          "var(--font-manrope), Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
      }}
    >
      <section
        className="page-inner"
        style={{
          maxWidth: 960,
          width: "100%",
          display: "flex",
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
              fontWeight: 800,
              color: "var(--orange)",
            }}
          >
            FL Battles · Early Access
          </p>

          <h1
            style={{
              fontFamily:
                "var(--font-manrope), Inter, ui-sans-serif, system-ui, sans-serif",
              fontSize: "2.4rem",
              lineHeight: 1.05,
              letterSpacing: "-0.055em",
              fontWeight: 800,
              margin: 0,
              color: "var(--text)",
            }}
          >
            {mode === "forgot"
              ? "Reset your FL Battles password."
              : "Log in to play 10-minute FL Studio beat battles."}
          </h1>

          <p
            style={{
              color: "var(--muted)",
              fontSize: "0.98rem",
              lineHeight: 1.7,
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
              gap: 8,
              fontSize: "0.95rem",
              color: "var(--text)",
              lineHeight: 1.5,
            }}
          >
            <li>• Earn rating by winning ranked battles.</li>
            <li>• View your past submissions and stats.</li>
            <li>• Join custom lobbies with friends.</li>
          </ul>

          <p
            style={{
              marginTop: 16,
              fontSize: "0.85rem",
              color: "var(--muted-2)",
            }}
          >
            Just landed here?{" "}
            <Link
              href="/"
              style={{
                color: "var(--orange)",
                textDecoration: "none",
                fontWeight: 800,
              }}
            >
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
            padding: 0,
            overflow: "hidden",
            borderRadius: 0,
          }}
        >
          {/* Mode switch */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              background: "rgba(255, 255, 255, 0.025)",
              borderBottom: "1px solid var(--line)",
            }}
          >
            <button
              type="button"
              onClick={() => switchMode("login")}
              style={{
                minHeight: 56,
                border: "none",
                borderRight: "1px solid var(--line)",
                background:
                  mode === "login"
                    ? "var(--orange)"
                    : "rgba(255,255,255,0.025)",
                color: mode === "login" ? "#050505" : "var(--muted)",
                boxShadow:
                  mode === "login"
                    ? "0 0 28px rgba(255, 77, 28, 0.24)"
                    : "none",
                fontFamily:
                  "var(--font-manrope), Inter, ui-sans-serif, system-ui, sans-serif",
                fontSize: "0.76rem",
                fontWeight: 900,
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                cursor: "pointer",
              }}
            >
              Login
            </button>

            <button
              type="button"
              onClick={() => switchMode("signup")}
              style={{
                minHeight: 56,
                border: "none",
                background:
                  mode === "signup"
                    ? "var(--orange)"
                    : "rgba(255,255,255,0.025)",
                color: mode === "signup" ? "#050505" : "var(--muted)",
                boxShadow:
                  mode === "signup"
                    ? "0 0 28px rgba(255, 77, 28, 0.24)"
                    : "none",
                fontFamily:
                  "var(--font-manrope), Inter, ui-sans-serif, system-ui, sans-serif",
                fontSize: "0.76rem",
                fontWeight: 900,
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                cursor: "pointer",
              }}
            >
              Sign Up
            </button>
          </div>

          <div style={{ padding: 24 }}>
            <h2
              style={{
                margin: "0 0 8px",
                fontFamily:
                  "var(--font-manrope), Inter, ui-sans-serif, system-ui, sans-serif",
                fontSize: "1.5rem",
                lineHeight: 1,
                letterSpacing: "-0.055em",
                fontWeight: 800,
                color: "var(--text)",
              }}
            >
              {mode === "login"
                ? "Welcome back"
                : mode === "signup"
                ? "Create your account"
                : "Forgot your password?"}
            </h2>

            <p
              className="page-description"
              style={{
                marginBottom: 18,
                fontSize: "0.92rem",
                lineHeight: 1.6,
                color: "var(--muted)",
              }}
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
                gap: 14,
              }}
            >
              <label
                style={{
                  fontSize: "0.85rem",
                  display: "flex",
                  flexDirection: "column",
                  gap: 6,
                  color: "var(--text)",
                  fontWeight: 700,
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
                    padding: "11px 12px",
                    borderRadius: 0,
                    border: "1px solid var(--line-bright)",
                    background: "rgba(5, 5, 5, 0.85)",
                    color: "var(--text)",
                    fontFamily:
                      "var(--font-manrope), Inter, ui-sans-serif, system-ui, sans-serif",
                    fontSize: "0.95rem",
                    outline: "none",
                  }}
                />
              </label>

              {mode !== "forgot" && (
                <label
                  style={{
                    fontSize: "0.85rem",
                    display: "flex",
                    flexDirection: "column",
                    gap: 6,
                    color: "var(--text)",
                    fontWeight: 700,
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
                      padding: "11px 12px",
                      borderRadius: 0,
                      border: "1px solid var(--line-bright)",
                      background: "rgba(5, 5, 5, 0.85)",
                      color: "var(--text)",
                      fontFamily:
                        "var(--font-manrope), Inter, ui-sans-serif, system-ui, sans-serif",
                      fontSize: "0.95rem",
                      outline: "none",
                    }}
                  />
                </label>
              )}

              {errorMsg && (
                <p
                  style={{
                    color: "#ffd4ca",
                    border: "1px solid rgba(255, 77, 28, 0.45)",
                    background: "rgba(255, 77, 28, 0.075)",
                    fontSize: "0.9rem",
                    fontWeight: 700,
                    lineHeight: 1.45,
                    padding: "10px 12px",
                    margin: "2px 0 0",
                  }}
                >
                  {errorMsg}
                </p>
              )}

              {successMsg && (
                <p
                  style={{
                    color: "#d9ffd0",
                    border: "1px solid rgba(140, 255, 107, 0.4)",
                    background: "rgba(140, 255, 107, 0.07)",
                    fontSize: "0.9rem",
                    fontWeight: 700,
                    lineHeight: 1.45,
                    padding: "10px 12px",
                    margin: "2px 0 0",
                  }}
                >
                  {successMsg}
                </p>
              )}

              <button
                type="submit"
                className="btn-primary"
                disabled={submitting}
                style={{
                  marginTop: 8,
                  alignSelf: "flex-start",
                }}
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
                  : "Send Reset Link"}
              </button>

              {mode === "login" && (
                <button
                  type="button"
                  onClick={() => switchMode("forgot")}
                  style={{
                    marginTop: 14,
                    color: "var(--orange)",
                    background: "none",
                    border: "none",
                    padding: 0,
                    textAlign: "left",
                    cursor: "pointer",
                    fontFamily:
                      "var(--font-manrope), Inter, ui-sans-serif, system-ui, sans-serif",
                    fontSize: "0.78rem",
                    fontWeight: 900,
                    letterSpacing: "0.12em",
                    textTransform: "uppercase",
                    alignSelf: "center",
                  }}
                >
                  Forgot your password?
                </button>
              )}

              {mode === "forgot" && (
                <button
                  type="button"
                  onClick={() => switchMode("login")}
                  style={{
                    marginTop: 14,
                    color: "var(--orange)",
                    background: "none",
                    border: "none",
                    padding: 0,
                    textAlign: "left",
                    cursor: "pointer",
                    fontFamily:
                      "var(--font-manrope), Inter, ui-sans-serif, system-ui, sans-serif",
                    fontSize: "0.78rem",
                    fontWeight: 900,
                    letterSpacing: "0.12em",
                    textTransform: "uppercase",
                    alignSelf: "center",
                  }}
                >
                  ← Back to Login
                </button>
              )}
            </form>
          </div>
        </div>
      </section>
    </main>
  );
}