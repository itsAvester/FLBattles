"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

function createLobbyId(prefix: string) {
  const num = Math.floor(10000 + Math.random() * 90000);
  return `${prefix}-${num}`;
}

export default function BattlesPage() {
  const router = useRouter();
  const [creating, setCreating] = useState<null | "ranked" | "custom">(null);

  const handleRankedMatch = () => {
    if (creating) return;
    setCreating("ranked");

    const lobbyId = createLobbyId("RANKED");
    // mode=ranked – lobby can use this later to award rating
    router.push(`/battles/${lobbyId}?mode=ranked`);
  };

  const handleCustomLobby = () => {
    if (creating) return;
    setCreating("custom");

    const lobbyId = createLobbyId("CUSTOM");
    // mode=custom – lobby can treat this as unranked
    router.push(`/battles/${lobbyId}?mode=custom`);
  };

  return (
    <section className="page-inner">
      <h1>Battle Hub</h1>
      <p className="page-description">
        Choose between ranked battles that affect your rating, or custom lobbies
        you can invite friends to for unranked practice sessions.
      </p>

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
            <li>Join a lobby with a unique battle ID.</li>
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
            {creating === "ranked" ? "Creating ranked lobby..." : "Find Ranked Match"}
          </button>
        </div>

        {/* Custom / Unranked Battles */}
        <div className="card">
          <h2>Custom Battles (Unranked)</h2>
          <p style={{ marginTop: 8, maxWidth: 720 }}>
            Create a private lobby for friends, collabs, or practice. These
            battles do <strong>not</strong> affect rating or leaderboard
            position (once we wire the lobby to treat them as unranked).
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
            <li>Creates a lobby with a shareable URL.</li>
            <li>Send the link to your friends so they can join.</li>
            <li>Use the same 10-minute timer and upload flow.</li>
            <li>Great for testing samples, friendly battles, or teaching.</li>
            <li>Intended to be completely unranked / no rating changes.</li>
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
            Tip: once you&apos;re in the lobby, copy the URL from your browser
            bar and send it to anyone you want to invite. As long as they have
            an account and are logged in, they can join that battle.
          </p>
        </div>
      </div>
    </section>
  );
}
