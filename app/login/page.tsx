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
    <main className="login-page-shell">
      <section className="login-page-grid">
        {/* Left: marketing / flavor */}
        <div className="login-page-copy">
          <p className="login-page-eyebrow">FL Battles · Early Access</p>

          <h1>
            {mode === "forgot"
              ? "Reset your FL Battles password."
              : "Log in to play 10-minute FL Studio beat battles."}
          </h1>

          <p className="login-page-description">
            {mode === "forgot"
              ? "Enter the email tied to your FL Battles account. If it exists, you’ll receive a link to set a new password."
              : "Your account keeps track of your ranked ladder, win rate, and battle history. Sign in with email and password to jump straight into the queue."}
          </p>

          {mode !== "forgot" && (
            <ul className="login-page-list">
              <li>Earn rating by winning ranked battles.</li>
              <li>View your past submissions and stats.</li>
              <li>Join custom lobbies with friends.</li>
            </ul>
          )}

          <p className="login-page-back-note">
            Just landed here?{" "}
            <Link href="/">
              Back to home
            </Link>
          </p>
        </div>

        {/* Right: auth card */}
        <div className="card login-auth-card">
          {/* Mode switch */}
          <div className="login-mode-tabs">
            <button
              type="button"
              onClick={() => switchMode("login")}
              className={mode === "login" ? "login-mode-tab active" : "login-mode-tab"}
            >
              Login
            </button>

            <button
              type="button"
              onClick={() => switchMode("signup")}
              className={mode === "signup" ? "login-mode-tab active" : "login-mode-tab"}
            >
              Sign Up
            </button>
          </div>

          <div className="login-auth-card-body">
            <h2>
              {mode === "login"
                ? "Welcome back"
                : mode === "signup"
                ? "Create your account"
                : "Forgot your password?"}
            </h2>

            <p className="page-description login-auth-description">
              {mode === "login" &&
                "Enter your details to access your profile and start battling."}
              {mode === "signup" &&
                "Sign up with an email and password to start playing ranked battles."}
              {mode === "forgot" &&
                "We’ll email you a secure link to set a new password."}
            </p>

            <form onSubmit={handleSubmit} className="login-auth-form">
              <label className="login-auth-label">
                <span>Email</span>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="login-auth-input"
                />
              </label>

              {mode !== "forgot" && (
                <label className="login-auth-label">
                  <span>Password</span>
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="At least 6 characters"
                    className="login-auth-input"
                  />
                </label>
              )}

              {errorMsg && <p className="login-auth-error">{errorMsg}</p>}

              {successMsg && <p className="login-auth-success">{successMsg}</p>}

              <button
                type="submit"
                className="btn-primary login-submit-button"
                disabled={submitting}
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
                  className="login-text-button"
                >
                  Forgot your password?
                </button>
              )}

              {mode === "forgot" && (
                <button
                  type="button"
                  onClick={() => switchMode("login")}
                  className="login-text-button"
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
