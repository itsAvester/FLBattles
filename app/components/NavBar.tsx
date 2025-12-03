"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import type { User } from "@supabase/supabase-js";

export default function NavBar() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Load auth status
  useEffect(() => {
    const load = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      setUser(user ?? null);
      setLoading(false);
    };

    load();

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUser(null);
  };

  return (
    <nav
      style={{
        width: "100%",
        padding: "12px 24px",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        background: "rgba(15, 23, 42, 0.85)",
        backdropFilter: "blur(6px)",
        borderBottom: "1px solid rgba(255,255,255,0.08)",
      }}
    >
      {/* Left side brand */}
      <Link
        href="/"
        style={{
          fontSize: "1.25rem",
          fontWeight: 700,
          color: "#e2e8f0",
          textDecoration: "none",
        }}
      >
        FL BATTLES
      </Link>

      {/* Right side nav */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "18px",
          fontSize: "0.95rem",
        }}
      >
        <Link href="/battles" style={{ color: "#e2e8f0" }}>
          Battles
        </Link>

        <Link href="/leaderboard" style={{ color: "#e2e8f0" }}>
          Leaderboard
        </Link>

        <Link href="/profile" style={{ color: "#e2e8f0" }}>
          Profile
        </Link>
        <Link href= "/faq"style={{ color: "#e2e8f0" }}>
          FAQ
        </Link>

        {/* Auth Status */}
        {loading ? (
          <span style={{ color: "#94a3b8" }}>...</span>
        ) : user ? (
          <>
            <span style={{ color: "#94a3b8", fontSize: "0.85rem" }}>
              {user.email}
            </span>

            <button
              onClick={handleLogout}
              className="btn-secondary"
              style={{
                padding: "6px 14px",
                borderRadius: 20,
                background: "rgba(30,41,59,0.8)",
                border: "1px solid rgba(148,163,184,0.4)",
                color: "#e2e8f0",
                cursor: "pointer",
              }}
            >
              Logout
            </button>
          </>
        ) : (
          <Link
            href="/login"
            style={{
              padding: "6px 14px",
              borderRadius: 20,
              background: "rgba(30,41,59,0.8)",
              border: "1px solid rgba(148,163,184,0.4)",
              color: "#e2e8f0",
            }}
          >
            Login
          </Link>
        )}
      </div>
    </nav>
  );
}
