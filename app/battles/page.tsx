"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { supabase } from "../../lib/supabaseClient";

type CreatingState = null | "ranked" | "custom";

type JoinLobbyResponse = {
  out_lobby_id: string;
  out_player_count: number;
};

export default function BattlesPage() {
  const router = useRouter();
  const [creating, setCreating] = useState<CreatingState>(null);
  const [error, setError] = useState<string | null>(null);

  const createAndGoToLobby = async (mode: "ranked" | "custom") => {
    setError(null);
    setCreating(mode);

    try {
      // 1) Get the logged-in user from Supabase Auth
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user) {
        console.error("auth error", authError);
        setError("You must be logged in to join a battle.");
        setCreating(null);
        return;
      }

      // 2) Call the matchmaking function with mode + user id
      const { data, error } = await supabase.rpc("join_battle_lobby", {
        p_mode: mode,
        p_user_id: user.id,
      });

      if (error) {
        console.error("join_battle_lobby error:", error.message, error);
        setError(
          error.message ||
            "Failed to create or join a lobby. Please try again."
        );
        setCreating(null);
        return;
      }

      const rows = data as JoinLobbyResponse[] | null;
      const row = rows?.[0];

      if (!row?.out_lobby_id) {
        console.error("join_battle_lobby returned no out_lobby_id:", data);
        setError("Lobby creation failed. Please try again.");
        setCreating(null);
        return;
      }

      // 3) Go to the lobby using the Supabase lobby id
      router.push(`/battles/${row.out_lobby_id}?mode=${mode}`);
    } catch (err: any) {
      console.error("Unexpected lobby error:", err);
      setError(err.message || "Something went wrong creating the lobby.");
      setCreating(null);
    }
  };

  const handleRankedMatch = () => {
    if (creating) return;
    createAndGoToLobby("ranked");
  };

  const handleCustomLobby = () => {
    if (creating) return;
    createAndGoToLobby("custom");
  };

  return (
    <section className="page-inner">
      <h1>Battle Hub</h1>
      <p className="page-description">
        Choose between ranked battles that affect your rating, or custom lobbies
        you can invite friends to for unranked practice sessions.
      </p>

      {error && (
        <p style={{ color: "#f97373", marginTop: 8 }}>{error}</p>
      )}

      <div
        style={{
          display: "grid",
          gap: 24,
          gridTemplateColumns: "minmax(0, 1fr)",
        }}
      >
        {/* Ranked Battles */}
        <div className="card">
          <h2>Ranked Battles</h2>
          <p style={{ marginTop: 8, maxWidth: 720 }}>
            Play for points and climb the leaderboard. Ranked battles use a
            shared sample and affect your rating, tier (Bronze, Silver, Gold,
            etc.), and global rank.
          </p>

          <ul
            style={{
              listStyle: "disc",
              paddingLeft: "1.5rem",
              marginTop: 12,
              display: "grid",
              gap: 6,
              color: "#cbd5f5",
              fontSize: "0.95rem",
            }}
          >
            <li>Join a lobby backed by Supabase (real server-side lobby).</li>
            <li>All players use the same sample.</li>
            <li>10 minutes to produce and upload your track.</li>
            <li>Vote on the submissions and determine the winner.</li>
            <li>Rating, tier, and stats are updated at the end.</li>
          </ul>

          <button
            type="button"
            className="btn-primary"
            onClick={handleRankedMatch}
            disabled={creating !== null}
            style={{ marginTop: 16 }}
          >
            {creating === "ranked"
              ? "Finding ranked match..."
              : "Find Ranked Match"}
          </button>
        </div>

        {/* Custom / Unranked Battles */}
        <div className="card">
          <h2>Custom Battles (Unranked)</h2>
          <p style={{ marginTop: 8, maxWidth: 720 }}>
            Create a private lobby for friends, collabs, or practice. These
            battles do <strong>not</strong> affect rating or leaderboard
            position.
          </p>

          <ul
            style={{
              listStyle: "disc",
              paddingLeft: "1.5rem",
              marginTop: 12,
              display: "grid",
              gap: 6,
              color: "#cbd5f5",
              fontSize: "0.95rem",
            }}
          >
            <li>Creates a lobby in Supabase with a shareable URL.</li>
            <li>Friends can join that exact lobby link.</li>
            <li>Uses the same 10-minute timer and upload flow.</li>
            <li>Great for friendly battles and testing.</li>
          </ul>

          <button
            type="button"
            className="btn-secondary"
            onClick={handleCustomLobby}
            disabled={creating !== null}
            style={{ marginTop: 16 }}
          >
            {creating === "custom"
              ? "Creating custom lobby..."
              : "Create Custom Lobby"}
          </button>

          <p
            style={{
              marginTop: 10,
              fontSize: "0.85rem",
              color: "#9ca3af",
            }}
          >
            Once you&apos;re in the lobby, copy the URL from your browser bar
            and send it to anyone you want to invite.
          </p>
        </div>
      </div>
    </section>
  );
}
