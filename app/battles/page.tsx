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
    <main className="battles-shell">
      <section className="battles-hero">
        <div className="page-inner battles-grid">
          <div className="battles-copy">
            <div className="eyebrow">
              <span className="eyebrow-dot" />
              Battle hub · choose your mode
            </div>

            <h1>
              Enter the
              <br />
              Arena
            </h1>

            <p className="hero-description">
              Queue into ranked battles that affect your rating, or create a
              custom lobby for friends, collabs, and practice rounds.
            </p>

            {error && <div className="battle-error">{error}</div>}

            <div className="battle-mode-actions">
              <button
                type="button"
                className="btn-primary"
                onClick={handleRankedMatch}
                disabled={creating !== null}
              >
                {creating === "ranked"
                  ? "Finding ranked match..."
                  : "Find Ranked Match"}
              </button>

              <button
                type="button"
                className="btn-secondary"
                onClick={handleCustomLobby}
                disabled={creating !== null}
              >
                {creating === "custom"
                  ? "Creating custom lobby..."
                  : "Create Custom Lobby"}
              </button>
            </div>

            <p className="mini-note">
              Ranked battles update rating and leaderboard stats. Custom battles
              are private, unranked, and shareable by URL.
            </p>
          </div>

          <div className="battle-window battles-window">
            <div className="window-topbar">
              <div className="window-dots">
                <span />
                <span />
                <span />
              </div>
              <span className="window-title">MATCHMAKING</span>
              <span className="window-status">
                {creating ? "SEARCHING" : "READY"}
              </span>
            </div>

            <div className="stats-grid">
              <div className="stat-box">
                <strong>10:00</strong>
                <span>Round timer</span>
              </div>
              <div className="stat-box">
                <strong>3-7</strong>
                <span>Players</span>
              </div>
              <div className="stat-box">
                <strong>2</strong>
                <span>Modes</span>
              </div>
            </div>

            <div className="sample-panel">
              <div>
                <p className="panel-label">Current selection</p>
                <h3>
                  {creating === "custom"
                    ? "Custom Lobby"
                    : creating === "ranked"
                      ? "Ranked Queue"
                      : "Choose Battle Mode"}
                </h3>
              </div>

              <div className="sample-badge">
                {creating ? "Loading" : "Live"}
              </div>
            </div>

            <div className="waveform-card">
              <div className="waveform-header">
                <span>Queue Signal</span>
                <span>{creating ? "Syncing" : "Standby"}</span>
              </div>

              <div className="waveform">
                <span style={{ height: "30%" }} />
                <span style={{ height: "50%" }} />
                <span style={{ height: "36%" }} />
                <span style={{ height: "68%" }} />
                <span style={{ height: "44%" }} />
                <span style={{ height: "78%" }} />
                <span style={{ height: "54%" }} />
                <span style={{ height: "90%" }} />
                <span style={{ height: "64%" }} />
                <span style={{ height: "82%" }} />
                <span style={{ height: "48%" }} />
                <span style={{ height: "74%" }} />
                <span style={{ height: "58%" }} />
                <span style={{ height: "86%" }} />
                <span style={{ height: "42%" }} />
                <span style={{ height: "66%" }} />
              </div>
            </div>

            <div className="task-table">
              <div className="task-row task-head">
                <span>Battle mode</span>
                <span>Status</span>
                <span>Rating</span>
              </div>

              <div className="task-row">
                <span>Ranked Match</span>
                <span
                  className={
                    creating === "ranked"
                      ? "status running"
                      : "status complete"
                  }
                >
                  {creating === "ranked" ? "Searching" : "Ready"}
                </span>
                <span>Affects rank</span>
              </div>

              <div className="task-row">
                <span>Custom Lobby</span>
                <span
                  className={
                    creating === "custom"
                      ? "status running"
                      : "status waiting"
                  }
                >
                  {creating === "custom" ? "Creating" : "Optional"}
                </span>
                <span>Unranked</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="page-inner battle-options-section">
        <div className="section-heading">
          <div className="eyebrow centered">
            <span className="eyebrow-dot" />
            Pick your format
          </div>

          <h2>Ranked pressure or private practice.</h2>

          <p>
            Both modes use the same fast battle flow: join a lobby, receive the
            sample, make your beat, upload, and vote.
          </p>
        </div>

        <div className="battle-option-grid">
          <div className="card battle-option-card ranked-card">
            <span className="card-number">01</span>

            <div className="battle-card-topline">
              <p className="panel-label">Competitive mode</p>
              <span className="sample-badge">Ranked</span>
            </div>

            <h3>Ranked Battles</h3>

            <p>
              Play for points and climb the leaderboard. Ranked battles affect
              your rating, tier, global rank, and profile stats.
            </p>

            <div className="check-list battle-check-list">
              <div>
                <span>✓</span>
                Real server-side lobby backed by Supabase.
              </div>
              <div>
                <span>✓</span>
                Everyone flips the same shared sample.
              </div>
              <div>
                <span>✓</span>
                Ten minutes to produce and upload your track.
              </div>
              <div>
                <span>✓</span>
                Voting determines the winner and updates stats.
              </div>
            </div>

            <button
              type="button"
              className="btn-primary battle-card-button"
              onClick={handleRankedMatch}
              disabled={creating !== null}
            >
              {creating === "ranked"
                ? "Finding ranked match..."
                : "Find Ranked Match"}
            </button>
          </div>

          <div className="card battle-option-card custom-card">
            <span className="card-number">02</span>

            <div className="battle-card-topline">
              <p className="panel-label">Private mode</p>
              <span className="custom-badge">Unranked</span>
            </div>

            <h3>Custom Battles</h3>

            <p>
              Create a private lobby for friends, collabs, or practice. These
              battles do not affect your leaderboard position.
            </p>

            <div className="check-list battle-check-list">
              <div>
                <span>✓</span>
                Creates a private lobby with a shareable URL.
              </div>
              <div>
                <span>✓</span>
                Friends can join using the exact lobby link.
              </div>
              <div>
                <span>✓</span>
                Uses the same timer, upload, and voting flow.
              </div>
              <div>
                <span>✓</span>
                Best for testing, friendly battles, and Discord sessions.
              </div>
            </div>

            <button
              type="button"
              className="btn-secondary battle-card-button"
              onClick={handleCustomLobby}
              disabled={creating !== null}
            >
              {creating === "custom"
                ? "Creating custom lobby..."
                : "Create Custom Lobby"}
            </button>

            <p className="battle-card-note">
              Once you&apos;re in the lobby, copy the URL from your browser bar
              and send it to anyone you want to invite.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}