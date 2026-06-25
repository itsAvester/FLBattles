"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { supabase } from "../../lib/supabaseClient";

type CreatingState = null | "ranked" | "custom" | "joining";
type BattleMode = "ranked" | "custom" | "join";
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

function getLobbyIdFromResponse(data: unknown): string | null {
  const rows = data as LobbyRpcResponse[] | null;
  const row = rows?.[0];

  return row?.out_lobby_id ?? row?.lobby_id ?? null;
}

function getLobbyIdFromInput(value: string): string {
  const trimmed = value.trim();

  if (!trimmed) return "";

  const uuidMatch = trimmed.match(
    /[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/i
  );

  if (uuidMatch?.[0]) return uuidMatch[0];

  try {
    const url = new URL(trimmed);
    const pathMatch = url.pathname.match(
      /[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/i
    );

    return pathMatch?.[0] ?? trimmed;
  } catch {
    return trimmed;
  }
}

export default function BattlesPage() {
  const router = useRouter();

  const [activeMode, setActiveMode] = useState<BattleMode>("ranked");
  const [creating, setCreating] = useState<CreatingState>(null);
  const [error, setError] = useState<string | null>(null);

  const [customMaxPlayers, setCustomMaxPlayers] = useState(7);
  const [customDurationSeconds, setCustomDurationSeconds] = useState(15 * 60);
  const [sampleSource, setSampleSource] = useState<SampleSource>("random");
  const [votingStyle, setVotingStyle] = useState<VotingStyle>("everyone");
  const [sampleFile, setSampleFile] = useState<File | null>(null);

  const [joinLobbyId, setJoinLobbyId] = useState("");

  const isBusy = creating !== null;
  const selectedDuration = BATTLE_DURATIONS.find(
    (duration) => duration.seconds === customDurationSeconds
  );

  const getCurrentUser = async () => {
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      throw new Error("You must be logged in to create or join a battle.");
    }

    return user;
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

  const selectMode = (mode: BattleMode) => {
    if (isBusy) return;
    setError(null);
    setActiveMode(mode);
  };

  const handleRankedMatch = async () => {
    if (isBusy) return;

    setError(null);
    setCreating("ranked");

    try {
      const user = await getCurrentUser();

      const { data, error } = await supabase.rpc("join_battle_lobby", {
        p_mode: "ranked",
        p_user_id: user.id,
      });

      if (error) {
        console.error("join_battle_lobby ranked error:", error.message, error);
        throw new Error(error.message || "Failed to find a ranked match.");
      }

      const lobbyId = getLobbyIdFromResponse(data);

      if (!lobbyId) {
        console.error("join_battle_lobby returned no lobby id:", data);
        throw new Error("Lobby creation failed. Please try again.");
      }

      router.push(`/battles/${lobbyId}?mode=ranked`);
    } catch (err: any) {
      console.error("Unexpected ranked lobby error:", err);
      setError(err.message || "Something went wrong finding a ranked match.");
      setCreating(null);
    }
  };

  const handleCreateCustomLobby = async () => {
    if (isBusy) return;

    setError(null);
    setCreating("custom");

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

      const { data, error } = await supabase.rpc("create_custom_battle_lobby", {
        p_max_players: boundedMaxPlayers,
        p_battle_duration_seconds: Number(customDurationSeconds),
        p_sample_source: sampleSource,
        p_sample_name: sampleName,
        p_sample_url: sampleUrl,
        p_voting_style: votingStyle,
      });

      if (error) {
        console.error("create_custom_battle_lobby error:", error.message, error);
        throw new Error(error.message || "Failed to create custom lobby.");
      }

      const lobbyId = getLobbyIdFromResponse(data);

      if (!lobbyId) {
        console.error("create_custom_battle_lobby returned no lobby id:", data);
        throw new Error("Custom lobby creation failed. Please try again.");
      }

      router.push(`/battles/${lobbyId}?mode=custom`);
    } catch (err: any) {
      console.error("Unexpected custom lobby error:", err);
      setError(err.message || "Something went wrong creating the custom lobby.");
      setCreating(null);
    }
  };

  const handleJoinCustomLobby = async () => {
    if (isBusy) return;

    const lobbyId = getLobbyIdFromInput(joinLobbyId);

    if (!lobbyId) {
      setError("Enter a custom lobby ID first.");
      return;
    }

    setError(null);
    setCreating("joining");

    try {
      await getCurrentUser();

      const { data, error } = await supabase.rpc("join_custom_battle_lobby", {
        p_lobby_id: lobbyId,
      });

      if (error) {
        console.error("join_custom_battle_lobby error:", error.message, error);
        throw new Error(error.message || "Failed to join custom lobby.");
      }

      const returnedLobbyId = getLobbyIdFromResponse(data) ?? lobbyId;

      router.push(`/battles/${returnedLobbyId}?mode=custom`);
    } catch (err: any) {
      console.error("Unexpected join custom lobby error:", err);
      setError(err.message || "Something went wrong joining the custom lobby.");
      setCreating(null);
    }
  };

  return (
    <main className="battle-app-page">
      <section className="page-inner battle-app-shell">
        <header className="battle-app-header">
          <div className="battle-app-title-block">
            <div className="eyebrow battle-app-eyebrow">
              <span className="eyebrow-dot" />
              Battle hub
            </div>

            <h1>Choose your battle.</h1>

            <p>
              Start ranked matchmaking, create a private room, or join with a
              lobby code.
            </p>
          </div>

          <button
            type="button"
            className="btn-secondary battle-app-submit-sample"
            onClick={() => router.push("/samples/submit")}
          >
            Submit Sample
          </button>
        </header>

        {error && <div className="battle-app-error">{error}</div>}

        <nav className="battle-app-tabs" aria-label="Battle modes">
          <button
            type="button"
            className={
              activeMode === "ranked"
                ? "battle-app-tab battle-app-tab-active"
                : "battle-app-tab"
            }
            onClick={() => selectMode("ranked")}
            disabled={isBusy}
            aria-pressed={activeMode === "ranked"}
          >
            <span className="battle-app-tab-icon" aria-hidden="true">
              <img src="/icons/battle-ranked.png" alt="" />
            </span>

            <span className="battle-app-tab-copy">
              <strong>Ranked match</strong>
              <em>Public queue · affects rating</em>
            </span>
          </button>

          <button
            type="button"
            className={
              activeMode === "custom"
                ? "battle-app-tab battle-app-tab-active"
                : "battle-app-tab"
            }
            onClick={() => selectMode("custom")}
            disabled={isBusy}
            aria-pressed={activeMode === "custom"}
          >
            <span
              className="battle-app-tab-icon battle-app-tab-icon-private"
              aria-hidden="true"
            >
              <img src="/icons/battle-private.png" alt="" />
            </span>

            <span className="battle-app-tab-copy">
              <strong>Private lobby</strong>
              <em>Invite-only · unranked</em>
            </span>
          </button>

          <button
            type="button"
            className={
              activeMode === "join"
                ? "battle-app-tab battle-app-tab-active"
                : "battle-app-tab"
            }
            onClick={() => selectMode("join")}
            disabled={isBusy}
            aria-pressed={activeMode === "join"}
          >
            <span
              className="battle-app-tab-icon battle-app-tab-icon-join"
              aria-hidden="true"
            >
              <img src="/icons/battle-join.png" alt="" />
            </span>

            <span className="battle-app-tab-copy">
              <strong>Join with code</strong>
              <em>Paste ID or lobby link</em>
            </span>
          </button>
        </nav>

        <section className="battle-app-panel">
          {activeMode === "ranked" && (
            <div className="battle-app-panel-inner">
              <div className="battle-app-panel-main">
                <span className="battle-app-pill battle-app-pill-ranked">
                  Current selection
                </span>

                <h2>Ranked Match</h2>

                <p>
                  Queue into a public battle, flip the same sample, and play for
                  rating, monthly season position, and profile stats.
                </p>

                <button
                  type="button"
                  className="btn-primary battle-app-primary-button"
                  onClick={handleRankedMatch}
                  disabled={isBusy}
                >
                  {creating === "ranked"
                    ? "Finding ranked match..."
                    : "Find Ranked Match"}
                </button>
              </div>

              <div className="battle-app-meta-stack">
                <div className="battle-app-meta-grid">
                  <div>
                    <strong>15:00</strong>
                    <span>Round timer</span>
                  </div>
                  <div>
                    <strong>3–7</strong>
                    <span>Players</span>
                  </div>
                  <div>
                    <strong>Ranked</strong>
                    <span>Rating</span>
                  </div>
                </div>

                <div className="battle-app-chip-row">
                  <span>Same sample</span>
                  <span>Live voting</span>
                  <span>Leaderboard stats</span>
                </div>
              </div>
            </div>
          )}

          {activeMode === "custom" && (
            <form
              className="battle-app-panel-inner battle-app-panel-inner-form"
              onSubmit={(event) => {
                event.preventDefault();
                handleCreateCustomLobby();
              }}
            >
              <div className="battle-app-panel-main battle-app-custom-main">
                <span className="battle-app-pill">Private setup</span>

                <h2>Create Private Lobby</h2>

                <p>
                  Build an invite-only room, choose the round settings, then send
                  the lobby link or ID to friends.
                </p>

                <div className="battle-app-custom-grid">
                  <label className="battle-app-field">
                    <span>Player limit</span>
                    <input
                      type="number"
                      min={2}
                      max={30}
                      value={customMaxPlayers}
                      onChange={(event) => {
                        const next = Number(event.target.value);
                        setCustomMaxPlayers(Number.isFinite(next) ? next : 2);
                      }}
                      onBlur={() => {
                        setCustomMaxPlayers((prev) =>
                          Math.min(Math.max(prev, 2), 30)
                        );
                      }}
                    />
                  </label>

                  <label className="battle-app-field">
                    <span>Battle length</span>
                    <select
                      value={customDurationSeconds}
                      onChange={(event) =>
                        setCustomDurationSeconds(Number(event.target.value))
                      }
                    >
                      {BATTLE_DURATIONS.map((duration) => (
                        <option key={duration.seconds} value={duration.seconds}>
                          {duration.label}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
              </div>

              <div className="battle-app-meta-stack battle-app-custom-controls">
                <div className="battle-app-meta-grid">
                  <div>
                    <strong>{selectedDuration?.label ?? "15 min"}</strong>
                    <span>Length</span>
                  </div>
                  <div>
                    <strong>2–{customMaxPlayers}</strong>
                    <span>Players</span>
                  </div>
                  <div>
                    <strong>Private</strong>
                    <span>Lobby</span>
                  </div>
                </div>

                <div className="battle-app-control-group">
                  <p className="panel-label">Sample</p>

                  <div className="battle-app-segment-row">
                    <button
                      type="button"
                      className={
                        sampleSource === "random"
                          ? "battle-app-segment battle-app-segment-active"
                          : "battle-app-segment"
                      }
                      onClick={() => {
                        setSampleSource("random");
                        setSampleFile(null);
                      }}
                    >
                      Random
                    </button>

                    <button
                      type="button"
                      className={
                        sampleSource === "host_upload"
                          ? "battle-app-segment battle-app-segment-active"
                          : "battle-app-segment"
                      }
                      onClick={() => setSampleSource("host_upload")}
                    >
                      Upload
                    </button>
                  </div>

                  {sampleSource === "host_upload" && (
                    <label className="battle-app-upload">
                      <input
                        type="file"
                        accept="audio/*"
                        onChange={(event) =>
                          setSampleFile(event.target.files?.[0] ?? null)
                        }
                      />

                      <span>
                        {sampleFile ? sampleFile.name : "Choose audio file"}
                      </span>
                    </label>
                  )}
                </div>

                <div className="battle-app-control-group">
                  <p className="panel-label">Voting</p>

                  <div className="battle-app-segment-row">
                    <button
                      type="button"
                      className={
                        votingStyle === "everyone"
                          ? "battle-app-segment battle-app-segment-active"
                          : "battle-app-segment"
                      }
                      onClick={() => setVotingStyle("everyone")}
                    >
                      Everyone
                    </button>

                    <button
                      type="button"
                      className={
                        votingStyle === "host"
                          ? "battle-app-segment battle-app-segment-active"
                          : "battle-app-segment"
                      }
                      onClick={() => setVotingStyle("host")}
                    >
                      Host
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  className="btn-primary battle-app-primary-button battle-app-full-button"
                  disabled={
                    isBusy || (sampleSource === "host_upload" && !sampleFile)
                  }
                >
                  {creating === "custom"
                    ? "Creating invite-only lobby..."
                    : "Create Invite-Only Lobby"}
                </button>
              </div>
            </form>
          )}

          {activeMode === "join" && (
            <form
              className="battle-app-panel-inner"
              onSubmit={(event) => {
                event.preventDefault();
                handleJoinCustomLobby();
              }}
            >
              <div className="battle-app-panel-main">
                <span className="battle-app-pill">Invite code</span>

                <h2>Join Private Lobby</h2>

                <p>
                  Paste a lobby ID or full invite link. FL Battles will extract
                  the lobby ID automatically.
                </p>

                <label className="battle-app-field battle-app-join-field">
                  <span>Lobby ID or invite link</span>

                  <input
                    type="text"
                    value={joinLobbyId}
                    onChange={(event) => setJoinLobbyId(event.target.value)}
                    placeholder="Paste lobby ID or full lobby URL"
                    spellCheck={false}
                  />
                </label>
              </div>

              <div className="battle-app-meta-stack">
                <div className="battle-app-meta-grid">
                  <div>
                    <strong>ID</strong>
                    <span>Required</span>
                  </div>
                  <div>
                    <strong>Private</strong>
                    <span>Access</span>
                  </div>
                  <div>
                    <strong>Unranked</strong>
                    <span>Rating</span>
                  </div>
                </div>

                <button
                  type="submit"
                  className="btn-primary battle-app-primary-button battle-app-full-button"
                  disabled={isBusy || !joinLobbyId.trim()}
                >
                  {creating === "joining" ? "Joining..." : "Join Custom Lobby"}
                </button>

                <div className="battle-app-chip-row">
                  <span>Paste ID</span>
                  <span>Or full URL</span>
                  <span>Invite-only</span>
                </div>
              </div>
            </form>
          )}
        </section>
      </section>
    </main>
  );
}