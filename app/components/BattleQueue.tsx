// app/components/BattleQueue.tsx
"use client";

import { useState } from "react";
import BattleLobby from "./BattleLobby";

type Status = "idle" | "searching" | "found";

export default function BattleQueue() {
  const [status, setStatus] = useState<Status>("idle");
  const [battleId, setBattleId] = useState<string | null>(null);

  const handleFindMatch = () => {
    setStatus("searching");

    // Fake "match found" after 2 seconds
    setTimeout(() => {
      setBattleId("BATTLE-12345");
      setStatus("found");
    }, 2000);
  };

  const handleLeave = () => {
    setStatus("idle");
    setBattleId(null);
  };

  if (status === "found" && battleId) {
    return <BattleLobby battleId={battleId} onLeave={handleLeave} />;
  }

  return (
    <div className="card">
      <h2>Ranked Battle Queue</h2>
      <p>
        Click the button to search for a match. In the real app, the server
        would find other players and assign a shared sample.
      </p>

      {status === "idle" && (
        <button onClick={handleFindMatch} className="btn-primary">
          Find Ranked Match
        </button>
      )}

      {status === "searching" && (
        <div className="queue-status">
          <div className="spinner" />
          <span>Searching for opponents...</span>
        </div>
      )}
    </div>
  );
}