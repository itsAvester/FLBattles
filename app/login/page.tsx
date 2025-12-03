"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabaseClient";

type Mode = "login" | "signup";

export default function LoginPage() {
  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setErrorMsg(null);

    try {
      if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
        });
        if (error) throw error;

        // Auto-create profile row after signup
        if (data.user) {
          await fetch("/api/create-profile", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              userId: data.user.id,
              email: data.user.email,
            }),
          });
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
      }

      // On success, go to profile
      router.push("/profile");
    } catch (err: any) {
      setErrorMsg(err.message || "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="page-inner">
      <h1>{mode === "login" ? "Login" : "Create Account"}</h1>
      <p className="page-description">
        Use your email and password to {mode === "login" ? "log in" : "sign up"}.
      </p>

      <div className="card" style={{ maxWidth: 400 }}>
        <div style={{ display: "flex", marginBottom: 16 }}>
          <button
            type="button"
            onClick={() => setMode("login")}
            className="btn-secondary"
            style={{
              flex: 1,
              borderBottomLeftRadius: 0,
              borderBottomRightRadius: 0,
              borderTopRightRadius: 0,
              background:
                mode === "login" ? "rgba(15,23,42,0.9)" : "rgba(15,23,42,0.5)",
            }}
          >
            Login
          </button>
          <button
            type="button"
            onClick={() => setMode("signup")}
            className="btn-secondary"
            style={{
              flex: 1,
              borderBottomLeftRadius: 0,
              borderBottomRightRadius: 0,
              borderTopLeftRadius: 0,
              background:
                mode === "signup" ? "rgba(15,23,42,0.9)" : "rgba(15,23,42,0.5)",
            }}
          >
            Sign Up
          </button>
        </div>

        <form
          onSubmit={handleSubmit}
          style={{ display: "flex", flexDirection: "column", gap: 12 }}
        >
          <label>
            <span>Email</span>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={{
                width: "100%",
                marginTop: 4,
                padding: "8px 10px",
                borderRadius: 8,
                border: "1px solid rgba(148,163,184,0.7)",
                background: "rgba(15,23,42,0.9)",
                color: "#e5e7eb",
              }}
            />
          </label>

          <label>
            <span>Password</span>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={{
                width: "100%",
                marginTop: 4,
                padding: "8px 10px",
                borderRadius: 8,
                border: "1px solid rgba(148,163,184,0.7)",
                background: "rgba(15,23,42,0.9)",
                color: "#e5e7eb",
              }}
            />
          </label>

          {errorMsg && (
            <p style={{ color: "#f97373", fontSize: "0.9rem" }}>{errorMsg}</p>
          )}

          <button
            type="submit"
            className="btn-primary"
            disabled={submitting}
            style={{ marginTop: 8, alignSelf: "flex-start" }}
          >
            {submitting
              ? mode === "login"
                ? "Logging in..."
                : "Creating account..."
              : mode === "login"
              ? "Login"
              : "Create Account"}
          </button>
        </form>
      </div>
    </section>
  );
}
