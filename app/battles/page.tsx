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
  const uuidMatch = trimmed.match(
    /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i
  );

  return uuidMatch?.[0] ?? trimmed;
}

export default function BattlesPage() {
  const router = useRouter();

  const [creating, setCreating] = useState<CreatingState>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeMode, setActiveMode] = useState<BattleMode>("ranked");

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
    <main className="battle-command-page">
      <section className="page-inner battle-command-shell">
        <header className="battle-command-header">
          <div>
            <div className="eyebrow battle-command-eyebrow">
              <span className="eyebrow-dot" />
              Battle hub
            </div>

            <h1 className="battle-command-title">Choose your battle.</h1>

            <p className="battle-command-description">
              Start ranked matchmaking, create an invite-only room, or join a
              private lobby with a code.
            </p>
          </div>

          <button
            type="button"
            className="btn-secondary battle-command-submit-sample-top"
            onClick={() => router.push("/samples/submit")}
          >
            Submit Sample
          </button>
        </header>

        {error && <div className="battle-command-error">{error}</div>}

        <div className="battle-command-layout">
          <nav className="battle-mode-selector" aria-label="Battle modes">
            <button
              type="button"
              className={
                activeMode === "ranked"
                  ? "battle-mode-card battle-mode-card-active"
                  : "battle-mode-card"
              }
              onClick={() => selectMode("ranked")}
              disabled={isBusy}
              aria-pressed={activeMode === "ranked"}
            >
              <span className="battle-mode-kicker">Ranked</span>
              <strong>Find a match</strong>
              <span>Public queue · affects rating</span>
            </button>

            <button
              type="button"
              className={
                activeMode === "custom"
                  ? "battle-mode-card battle-mode-card-active"
                  : "battle-mode-card"
              }
              onClick={() => selectMode("custom")}
              disabled={isBusy}
              aria-pressed={activeMode === "custom"}
            >
              <span className="battle-mode-kicker">Private</span>
              <strong>Create lobby</strong>
              <span>Invite-only · unranked</span>
            </button>

            <button
              type="button"
              className={
                activeMode === "join"
                  ? "battle-mode-card battle-mode-card-active"
                  : "battle-mode-card"
              }
              onClick={() => selectMode("join")}
              disabled={isBusy}
              aria-pressed={activeMode === "join"}
            >
              <span className="battle-mode-kicker">Code</span>
              <strong>Join lobby</strong>
              <span>Paste ID or full link</span>
            </button>
          </nav>

          <section className="battle-command-panel">
            {activeMode === "ranked" && (
              <div className="battle-panel-content">
                <div className="battle-panel-topline">
                  <div className="battle-panel-heading-block">
                    <span className="battle-panel-pill battle-panel-pill-ranked">
                      Current selection
                    </span>
                    <h2>Ranked Match</h2>
                    <p>
                      Queue into a public battle, flip the same sample, and play
                      for rating, season position, and profile stats.
                    </p>
                  </div>

                  <div className="battle-panel-meta-grid">
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
                </div>

                <div className="battle-ranked-action-card">
                  <div>
                    <p className="panel-label">Ready when you are</p>
                    <h3>Jump straight into matchmaking.</h3>
                    <p>
                      Best for players who want the fastest path into a battle
                      and a clear reason to return to the leaderboard.
                    </p>
                  </div>

                  <button
                    type="button"
                    className="btn-primary battle-command-main-button"
                    onClick={handleRankedMatch}
                    disabled={isBusy}
                  >
                    {creating === "ranked"
                      ? "Finding ranked match..."
                      : "Find Ranked Match"}
                  </button>
                </div>

                <div className="battle-command-info-grid">
                  <div>
                    <span>01</span>
                    Same sample for every player.
                  </div>
                  <div>
                    <span>02</span>
                    Voting decides the winner.
                  </div>
                  <div>
                    <span>03</span>
                    Results update the leaderboard.
                  </div>
                </div>
              </div>
            )}

            {activeMode === "custom" && (
              <form
                className="battle-panel-content"
                onSubmit={(event) => {
                  event.preventDefault();
                  handleCreateCustomLobby();
                }}
              >
                <div className="battle-panel-topline">
                  <div className="battle-panel-heading-block">
                    <span className="battle-panel-pill">Private setup</span>
                    <h2>Create Private Lobby</h2>
                    <p>
                      Build an invite-only room, then send the lobby link or ID
                      to friends. Custom battles stay unranked.
                    </p>
                  </div>

                  <div className="battle-panel-meta-grid">
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
                </div>

                <div className="battle-command-form-grid">
                  <label className="battle-command-field">
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
                    <small>Maximum invited players.</small>
                  </label>

                  <label className="battle-command-field">
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
                    <small>Production time before voting.</small>
                  </label>
                </div>

                <div className="battle-command-control-grid">
                  <div className="battle-command-control-group">
                    <p className="panel-label">Sample choice</p>
                    <div className="battle-command-segment-row">
                      <button
                        type="button"
                        className={
                          sampleSource === "random"
                            ? "battle-command-segment battle-command-segment-active"
                            : "battle-command-segment"
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
                            ? "battle-command-segment battle-command-segment-active"
                            : "battle-command-segment"
                        }
                        onClick={() => setSampleSource("host_upload")}
                      >
                        Upload sample
                      </button>
                    </div>

                    {sampleSource === "host_upload" && (
                      <div className="battle-command-upload">
                        <input
                          type="file"
                          accept="audio/*"
                          onChange={(event) =>
                            setSampleFile(event.target.files?.[0] ?? null)
                          }
                        />
                        <small>
                          {sampleFile
                            ? sampleFile.name
                            : "Choose an audio file to use for this lobby."}
                        </small>
                      </div>
                    )}
                  </div>

                  <div className="battle-command-control-group">
                    <p className="panel-label">Voting style</p>
                    <div className="battle-command-segment-row">
                      <button
                        type="button"
                        className={
                          votingStyle === "everyone"
                            ? "battle-command-segment battle-command-segment-active"
                            : "battle-command-segment"
                        }
                        onClick={() => setVotingStyle("everyone")}
                      >
                        Everyone votes
                      </button>

                      <button
                        type="button"
                        className={
                          votingStyle === "host"
                            ? "battle-command-segment battle-command-segment-active"
                            : "battle-command-segment"
                        }
                        onClick={() => setVotingStyle("host")}
                      >
                        Host decides
                      </button>
                    </div>
                  </div>
                </div>

                <button
                  type="submit"
                  className="btn-primary battle-command-main-button battle-command-wide-button"
                  disabled={
                    isBusy || (sampleSource === "host_upload" && !sampleFile)
                  }
                >
                  {creating === "custom"
                    ? "Creating invite-only lobby..."
                    : "Create Invite-Only Lobby"}
                </button>
              </form>
            )}

            {activeMode === "join" && (
              <form
                className="battle-panel-content"
                onSubmit={(event) => {
                  event.preventDefault();
                  handleJoinCustomLobby();
                }}
              >
                <div className="battle-panel-topline">
                  <div className="battle-panel-heading-block">
                    <span className="battle-panel-pill">Invite code</span>
                    <h2>Join Private Lobby</h2>
                    <p>
                      Paste a lobby ID or the full shared battle link. The page
                      will pull out the lobby ID automatically.
                    </p>
                  </div>

                  <div className="battle-panel-meta-grid">
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
                </div>

                <label className="battle-command-field battle-command-field-full">
                  <span>Lobby ID or invite link</span>
                  <input
                    type="text"
                    value={joinLobbyId}
                    onChange={(event) => setJoinLobbyId(event.target.value)}
                    placeholder="Paste lobby ID or full lobby URL"
                    spellCheck={false}
                  />
                  <small>
                    Use the exact ID or link from the host. Custom lobbies are
                    not shown in public matchmaking.
                  </small>
                </label>

                <button
                  type="submit"
                  className="btn-primary battle-command-main-button battle-command-wide-button"
                  disabled={isBusy || !joinLobbyId.trim()}
                >
                  {creating === "joining" ? "Joining..." : "Join Custom Lobby"}
                </button>
              </form>
            )}
          </section>
        </div>

        <aside className="battle-command-sample-strip">
          <div>
            <p className="panel-label">Community samples</p>
            <strong>Want your sound in future ranked battles?</strong>
            <span>Submit a short audio sample for approval.</span>
          </div>

          <button
            type="button"
            className="btn-secondary"
            onClick={() => router.push("/samples/submit")}
          >
            Submit Sample
          </button>
        </aside>
      </section>
    </main>
  );
}
