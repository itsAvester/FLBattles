// app/components/BattleQueue.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabaseClient";

type Status = "idle" | "searching" | "error";

type JoinLobbyResponse = {
  lobby_id: string;
  player_count: number;
};

export default function BattleQueue() {
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleFindMatch = async () => {
    setStatus("searching");
    setError(null);

    // 🔥 Call Supabase RPC to join/create a lobby
    const { data, error } = await supabase.rpc("join_battle_lobby", {
      p_mode: "ranked",
    });

    if (error) {
      console.error("Lobby join error:", error);
      setError("Failed to find a match. Please try again.");
      setStatus("error");
      return;
    }

    const rows = data as JoinLobbyResponse[] | null;
    const row = rows?.[0];

    console.log("join_battle_lobby result:", rows); // ← keep this for debugging

    if (!row?.lobby_id) {
      console.error("join_battle_lobby returned no lobby_id:", data);
      setError("Could not create or join a lobby.");
      setStatus("error");
      return;
    }

    // 👇 IMPORTANT: use the lobby_id from Supabase as the URL param
    router.push(`/battles/${row.lobby_id}`);
  };

  const isSearching = status === "searching";

  return (
    <div className="card">
      <h2>Ranked Battle Queue</h2>
      <p>
        Click the button to search for a match. You&apos;ll be placed into a
        lobby with other players.
      </p>

      {!isSearching && (
        <button
          onClick={handleFindMatch}
          className="btn-primary"
          disabled={isSearching}
        >
          {status === "error" ? "Try Again" : "Find Ranked Match"}
        </button>
      )}

      {isSearching && (
        <div className="queue-status">
          <div className="spinner" />
          <span>Searching for opponents...</span>
        </div>
      )}

      {error && (
        <p className="text-red-500 text-sm mt-2">
          {error}
        </p>
      )}
    </div>
  );
}
