// app/components/BattleQueue.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabaseClient";

type Status = "idle" | "searching" | "creating" | "joining" | "error";
type SampleSource = "random" | "host_upload";
type VotingStyle = "everyone" | "host";

type LobbyRpcResponse = {
  lobby_id?: string;
  out_lobby_id?: string;
  player_count?: number;
  out_player_count?: number;
};

const BATTLE_DURATIONS = [
  { label: "5 min", seconds: 5 * 60 },
  { label: "10 min", seconds: 10 * 60 },
  { label: "15 min", seconds: 15 * 60 },
  { label: "20 min", seconds: 20 * 60 },
  { label: "30 min", seconds: 30 * 60 },
];

function normalizeLobbyId(value: string) {
  return value.trim();
}

export default function BattleQueue() {
  const router = useRouter();

  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);

  const [showCustomSetup, setShowCustomSetup] = useState(false);
  const [showJoinCustom, setShowJoinCustom] = useState(false);

  const [customMaxPlayers, setCustomMaxPlayers] = useState(7);
  const [customDurationSeconds, setCustomDurationSeconds] = useState(15 * 60);
  const [sampleSource, setSampleSource] = useState<SampleSource>("random");
  const [votingStyle, setVotingStyle] = useState<VotingStyle>("everyone");
  const [sampleFile, setSampleFile] = useState<File | null>(null);

  const [joinLobbyId, setJoinLobbyId] = useState("");

  const isBusy =
    status === "searching" || status === "creating" || status === "joining";

  const resetError = () => {
    if (error) setError(null);
    if (status === "error") setStatus("idle");
  };

  const getCurrentUser = async () => {
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      throw new Error("You must be logged in to create or join a battle.");
    }

    return user;
  };

  const handleFindRankedMatch = async () => {
    setStatus("searching");
    setError(null);

    try {
      const user = await getCurrentUser();

      const { data, error } = await supabase.rpc("join_battle_lobby", {
        p_mode: "ranked",
        p_user_id: user.id,
      });

      if (error) {
        console.error("Ranked lobby join error:", error);
        throw new Error(error.message || "Failed to find a ranked match.");
      }

      const rows = data as LobbyRpcResponse[] | null;
      const row = rows?.[0];
      const lobbyId = row?.out_lobby_id ?? row?.lobby_id;

      if (!lobbyId) {
        console.error("join_battle_lobby returned no lobby id:", data);
        throw new Error("Could not create or join a ranked lobby.");
      }

      router.push(`/battles/${lobbyId}?mode=ranked`);
    } catch (err: any) {
      setError(err?.message || "Failed to find a ranked match.");
      setStatus("error");
    }
  };

  const uploadHostSample = async (userId: string) => {
    if (!sampleFile) {
      throw new Error("Choose a sample file or switch the sample option to random.");
    }

    const safeName = sampleFile.name
      .replace(/[^a-zA-Z0-9._-]/g, "_")
      .replace(/_+/g, "_");

    const extension = safeName.includes(".")
      ? safeName.split(".").pop()
      : "webm";

    const path = `custom-samples/${userId}/${crypto.randomUUID()}.${extension}`;

    const { error: uploadError } = await supabase.storage
      .from("battle-audio")
      .upload(path, sampleFile, {
        cacheControl: "3600",
        upsert: false,
      });

    if (uploadError) {
      console.error("Custom sample upload error:", uploadError);
      throw new Error(uploadError.message || "Failed to upload custom sample.");
    }

    const { data: publicUrlData } = supabase.storage
      .from("battle-audio")
      .getPublicUrl(path);

    return {
      sampleName: safeName,
      sampleUrl: publicUrlData.publicUrl,
    };
  };

  const handleCreateCustomLobby = async () => {
    setStatus("creating");
    setError(null);

    try {
      const user = await getCurrentUser();

      const boundedMaxPlayers = Math.min(Math.max(Number(customMaxPlayers), 2), 30);

      let sampleName: string | null = null;
      let sampleUrl: string | null = null;

      if (sampleSource === "host_upload") {
        const uploaded = await uploadHostSample(user.id);
        sampleName = uploaded.sampleName;
        sampleUrl = uploaded.sampleUrl;
      }

      // IMPORTANT:
      // Custom lobby creation must use create_custom_battle_lobby.
      // Do not call join_battle_lobby here, because that is public ranked matchmaking only.
      const { data, error } = await supabase.rpc("create_custom_battle_lobby", {
        p_max_players: boundedMaxPlayers,
        p_battle_duration_seconds: Number(customDurationSeconds),
        p_sample_source: sampleSource,
        p_sample_name: sampleName,
        p_sample_url: sampleUrl,
        p_voting_style: votingStyle,
      });

      if (error) {
        console.error("Custom lobby create error:", error);
        throw new Error(error.message || "Failed to create custom lobby.");
      }

      const rows = data as LobbyRpcResponse[] | null;
      const row = rows?.[0];
      const lobbyId = row?.out_lobby_id ?? row?.lobby_id;

      if (!lobbyId) {
        console.error("create_custom_battle_lobby returned no lobby id:", data);
        throw new Error("Could not create custom lobby.");
      }

      router.push(`/battles/${lobbyId}?mode=custom`);
    } catch (err: any) {
      setError(err?.message || "Failed to create custom lobby.");
      setStatus("error");
    }
  };

  const handleJoinCustomLobby = async () => {
    setStatus("joining");
    setError(null);

    try {
      await getCurrentUser();

      const lobbyId = normalizeLobbyId(joinLobbyId);

      if (!lobbyId) {
        throw new Error("Enter a custom lobby ID first.");
      }

      // IMPORTANT:
      // Joining custom lobbies requires the exact lobby ID.
      // This prevents custom lobbies from becoming public matchmaking rooms.
      const { data, error } = await supabase.rpc("join_custom_battle_lobby", {
        p_lobby_id: lobbyId,
      });

      if (error) {
        console.error("Custom lobby join error:", error);
        throw new Error(error.message || "Failed to join custom lobby.");
      }

      const rows = data as LobbyRpcResponse[] | null;
      const row = rows?.[0];
      const returnedLobbyId = row?.out_lobby_id ?? row?.lobby_id ?? lobbyId;

      router.push(`/battles/${returnedLobbyId}?mode=custom`);
    } catch (err: any) {
      setError(err?.message || "Failed to join custom lobby.");
      setStatus("error");
    }
  };

  return (
    <div className="card battle-queue-card">
      <div className="battle-queue-head">
        <div>
          <p className="panel-label">Battle queue</p>
          <h2>Choose your battle type</h2>
          <p>
            Queue into ranked battles that affect your rating, or create an
            invite-only custom lobby for friends, collabs, and practice rounds.
          </p>
        </div>
      </div>

      <div className="battle-queue-action-row">
        <button
          type="button"
          onClick={handleFindRankedMatch}
          className="btn-primary"
          disabled={isBusy}
        >
          {status === "searching" ? "Searching..." : "Find Ranked Match"}
        </button>

        <button
          type="button"
          onClick={() => {
            setShowCustomSetup((prev) => !prev);
            setShowJoinCustom(false);
            resetError();
          }}
          className="btn-secondary"
          disabled={isBusy}
        >
          {showCustomSetup ? "Hide Custom Setup" : "Create Custom Lobby"}
        </button>

        <button
          type="button"
          onClick={() => {
            setShowJoinCustom((prev) => !prev);
            setShowCustomSetup(false);
            resetError();
          }}
          className="btn-secondary"
          disabled={isBusy}
        >
          {showJoinCustom ? "Hide Join Form" : "Join Custom Lobby"}
        </button>
      </div>

      {isBusy && (
        <div className="queue-status">
          <div className="spinner" />
          <span>
            {status === "creating"
              ? "Creating invite-only custom lobby..."
              : status === "joining"
              ? "Joining custom lobby..."
              : "Searching for ranked opponents..."}
          </span>
        </div>
      )}

      {showCustomSetup && (
        <div className="custom-lobby-builder">
          <div className="custom-lobby-builder-head">
            <div>
              <p className="panel-label">Custom battle setup</p>
              <h3>Host an invite-only room</h3>
            </div>
            <span className="custom-lobby-builder-pill">2–30 players</span>
          </div>

          <p className="custom-lobby-helper">
            Custom lobbies are not public matchmaking. Share the lobby ID or URL
            with people you want to invite.
          </p>

          <div className="custom-lobby-form-grid">
            <label className="custom-lobby-field">
              <span>Player limit</span>
              <input
                type="number"
                min={2}
                max={30}
                value={customMaxPlayers}
                onChange={(e) => {
                  const next = Number(e.target.value);
                  setCustomMaxPlayers(Number.isFinite(next) ? next : 2);
                }}
                onBlur={() => {
                  setCustomMaxPlayers((prev) => Math.min(Math.max(prev, 2), 30));
                }}
              />
              <small>Maximum number of invited players who can join this lobby.</small>
            </label>

            <label className="custom-lobby-field">
              <span>Battle length</span>
              <select
                value={customDurationSeconds}
                onChange={(e) => setCustomDurationSeconds(Number(e.target.value))}
              >
                {BATTLE_DURATIONS.map((duration) => (
                  <option key={duration.seconds} value={duration.seconds}>
                    {duration.label}
                  </option>
                ))}
              </select>
              <small>How long producers have before voting begins.</small>
            </label>

            <div className="custom-lobby-field custom-lobby-field-wide">
              <span>Sample choice</span>
              <div className="custom-lobby-segment-row">
                <button
                  type="button"
                  className={
                    sampleSource === "random" ? "custom-lobby-segment-active" : ""
                  }
                  onClick={() => {
                    setSampleSource("random");
                    setSampleFile(null);
                  }}
                >
                  Random sample
                </button>
                <button
                  type="button"
                  className={
                    sampleSource === "host_upload"
                      ? "custom-lobby-segment-active"
                      : ""
                  }
                  onClick={() => setSampleSource("host_upload")}
                >
                  Upload sample
                </button>
              </div>

              {sampleSource === "host_upload" && (
                <div className="custom-lobby-upload-box">
                  <input
                    type="file"
                    accept="audio/*"
                    onChange={(e) => setSampleFile(e.target.files?.[0] ?? null)}
                  />
                  <small>
                    This sample will be saved to the lobby and shared with
                    everyone when the battle starts.
                  </small>
                </div>
              )}
            </div>

            <div className="custom-lobby-field custom-lobby-field-wide">
              <span>Voting style</span>
              <div className="custom-lobby-segment-row">
                <button
                  type="button"
                  className={
                    votingStyle === "everyone" ? "custom-lobby-segment-active" : ""
                  }
                  onClick={() => setVotingStyle("everyone")}
                >
                  Everyone votes
                </button>
                <button
                  type="button"
                  className={
                    votingStyle === "host" ? "custom-lobby-segment-active" : ""
                  }
                  onClick={() => setVotingStyle("host")}
                >
                  Host decides
                </button>
              </div>
              <small>
                Everyone votes uses normal voting. Host decides lets only the
                lobby host choose the winner.
              </small>
            </div>
          </div>

          <button
            type="button"
            onClick={handleCreateCustomLobby}
            className="btn-primary custom-lobby-create-button"
            disabled={isBusy}
          >
            {status === "creating" ? "Creating..." : "Create Invite-Only Lobby"}
          </button>
        </div>
      )}

      {showJoinCustom && (
        <div className="custom-lobby-builder">
          <div className="custom-lobby-builder-head">
            <div>
              <p className="panel-label">Join custom battle</p>
              <h3>Enter a lobby ID</h3>
            </div>
            <span className="custom-lobby-builder-pill">Invite only</span>
          </div>

          <p className="custom-lobby-helper">
            Paste the custom lobby ID from the host. You can also join directly
            from a shared lobby URL.
          </p>

          <label className="custom-lobby-field custom-lobby-field-wide">
            <span>Lobby ID</span>
            <input
              type="text"
              value={joinLobbyId}
              onChange={(e) => setJoinLobbyId(e.target.value)}
              placeholder="example: 17bfba96-d6b2-4bd6-90e2-2f4d653640b2"
              spellCheck={false}
            />
            <small>Only users with the exact lobby ID can join.</small>
          </label>

          <button
            type="button"
            onClick={handleJoinCustomLobby}
            className="btn-primary custom-lobby-create-button"
            disabled={isBusy || !joinLobbyId.trim()}
          >
            {status === "joining" ? "Joining..." : "Join Custom Lobby"}
          </button>
        </div>
      )}

      {error && <p className="battle-error">{error}</p>}
    </div>
  );
}
