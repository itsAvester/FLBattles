"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import type { User } from "@supabase/supabase-js";

export default function NavBar() {
  const [user, setUser] = useState<User | null>(null);
  const [displayName, setDisplayName] = useState<string | null>(null);
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

  // Load profile display name for navbar
  useEffect(() => {
    const loadDisplayName = async () => {
      if (!user?.id) {
        setDisplayName(null);
        return;
      }

      const { data, error } = await supabase
        .from("profiles")
        .select("display_name")
        .eq("id", user.id)
        .single();

      if (error) {
        console.error("Error loading display name:", error);
        setDisplayName(null);
        return;
      }

      setDisplayName(data?.display_name ?? null);
    };

    loadDisplayName();
  }, [user?.id]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setDisplayName(null);
  };

  return (
    <nav className="nav">
      {/* LEFT: BRAND */}
      <Link
        href="/"
        className="logo"
        style={{ textDecoration: "none", color: "#e2e8f0" }}
      >
        FL BATTLES
      </Link>

      {/* RIGHT: NAV LINKS */}
      <div className="nav-links">
        <Link href="/battles">Battles</Link>
        <Link href="/leaderboard">Leaderboard</Link>
        <Link href="/profile">Profile</Link>
        <Link href="/faq">FAQ</Link>

        {/* Auth Status */}
        {loading ? (
          <span style={{ color: "#94a3b8", fontSize: "0.85rem" }}>...</span>
        ) : user ? (
          <>
            <span style={{ color: "#94a3b8", fontSize: "0.85rem" }}>
              {displayName || user.email}
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
            className="btn-secondary"
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