"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import type { User } from "@supabase/supabase-js";

export default function NavBar() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const load = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      setUser(user ?? null);
      setLoading(false);
    };

    load();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const closeMenu = () => setMenuOpen(false);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setMenuOpen(false);
  };

  const displayName = user?.email?.split("@")[0] ?? "Producer";

  return (
    <nav className="nav nav-pro">
      <div className="nav-pro-main">
        <Link href="/" className="logo nav-pro-logo" onClick={closeMenu}>
          FL BATTLES
        </Link>

        <button
          type="button"
          className="nav-menu-button"
          onClick={() => setMenuOpen((current) => !current)}
          aria-label="Toggle navigation menu"
          aria-expanded={menuOpen}
        >
          <span />
          <span />
          <span />
        </button>
      </div>

      <div className={`nav-links nav-pro-links ${menuOpen ? "nav-pro-links-open" : ""}`}>
        <Link href="/battles" onClick={closeMenu}>
          Battles
        </Link>
        <Link href="/leaderboard" onClick={closeMenu}>
          Leaderboard
        </Link>
        <Link href="/profile" onClick={closeMenu}>
          Profile
        </Link>
        <Link href="/faq" onClick={closeMenu}>
          FAQ
        </Link>
        <Link href="/report" onClick={closeMenu}>
          Support
        </Link>

        <div className="nav-account-block">
          {loading ? (
            <span className="nav-user-name">Loading</span>
          ) : user ? (
            <>
              <span className="nav-user-name" title={user.email ?? ""}>
                {displayName}
              </span>
              <button type="button" onClick={handleLogout} className="btn-secondary nav-auth-button">
                Logout
              </button>
            </>
          ) : (
            <Link href="/login" className="btn-secondary nav-auth-button" onClick={closeMenu}>
              Login
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
}