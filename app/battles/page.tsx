"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { supabase } from "../../lib/supabaseClient";

type CreatingState = null | "ranked" | "custom" | "joining";
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

export default function BattlesPage() {
  const router = useRouter();

  const [creating, setCreating] = useState<CreatingState>(null);
  const [error, setError] = useState<string | null>(null);

  const [showCustomSetup, setShowCustomSetup] = useState(false);
  const [showJoinCustom, setShowJoinCustom] = useState(false);

  const [customMaxPlayers, setCustomMaxPlayers] = useState(7);
  const [customDurationSeconds, setCustomDurationSeconds] = useState(15 * 60);
  const [sampleSource, setSampleSource] = useState<SampleSource>("random");
  const [votingStyle, setVotingStyle] = useState<VotingStyle>("everyone");
  const [sampleFile, setSampleFile] = useState<File | null>(null);

  const [joinLobbyId, setJoinLobbyId] = useState("");

  const isBusy = creating !== null;

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

    const lobbyId = joinLobbyId.trim();

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

  const openCustomSetup = () => {
    if (isBusy) return;
    setError(null);
    setShowJoinCustom(false);
    setShowCustomSetup((prev) => !prev);
  };

  const openJoinCustom = () => {
    if (isBusy) return;
    setError(null);
    setShowCustomSetup(false);
    setShowJoinCustom((prev) => !prev);
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
              Queue into ranked battles that affect your rating, create an
              invite-only custom lobby, or join a custom room with the lobby ID.
            </p>

            {error && <div className="battle-error">{error}</div>}

            <div className="battle-mode-actions">
              <button
                type="button"
                className="btn-primary"
                onClick={handleRankedMatch}
                disabled={isBusy}
              >
                {creating === "ranked"
                  ? "Finding ranked match..."
                  : "Find Ranked Match"}
              </button>

              <button
                type="button"
                className="btn-secondary"
                onClick={openCustomSetup}
                disabled={isBusy}
              >
                {showCustomSetup ? "Hide Custom Setup" : "Create Custom Lobby"}
              </button>

              <button
                type="button"
                className="btn-secondary"
                onClick={openJoinCustom}
                disabled={isBusy}
              >
                {showJoinCustom ? "Hide Join Form" : "Join Custom Lobby"}
              </button>
            </div>

            {showCustomSetup && (
              <div className="card battle-custom-panel">
                <div className="battle-custom-panel-head">
                  <div>
                    <p className="panel-label">Custom battle setup</p>
                    <h3>Host an invite-only room</h3>
                    <p>
                      Custom lobbies are not public matchmaking. Share the lobby
                      ID or URL with people you want to invite.
                    </p>
                  </div>

                  <span className="custom-badge">2–30 Players</span>
                </div>

                <div className="battle-custom-form-grid">
                  <label className="battle-custom-field">
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

                  <label className="battle-custom-field">
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

                <div className="battle-custom-control-group">
                  <p className="panel-label">Sample choice</p>

                  <div className="battle-custom-segment-row">
                    <button
                      type="button"
                      className={
                        sampleSource === "random"
                          ? "battle-custom-segment battle-custom-segment-active"
                          : "battle-custom-segment"
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
                          ? "battle-custom-segment battle-custom-segment-active"
                          : "battle-custom-segment"
                      }
                      onClick={() => setSampleSource("host_upload")}
                    >
                      Upload sample
                    </button>
                  </div>

                  {sampleSource === "host_upload" && (
                    <div className="battle-custom-upload">
                      <input
                        type="file"
                        accept="audio/*"
                        onChange={(event) =>
                          setSampleFile(event.target.files?.[0] ?? null)
                        }
                      />
                      <small>
                        This sample will be saved to the lobby and shared when
                        the battle starts.
                      </small>
                    </div>
                  )}
                </div>

                <div className="battle-custom-control-group">
                  <p className="panel-label">Voting style</p>

                  <div className="battle-custom-segment-row">
                    <button
                      type="button"
                      className={
                        votingStyle === "everyone"
                          ? "battle-custom-segment battle-custom-segment-active"
                          : "battle-custom-segment"
                      }
                      onClick={() => setVotingStyle("everyone")}
                    >
                      Everyone votes
                    </button>

                    <button
                      type="button"
                      className={
                        votingStyle === "host"
                          ? "battle-custom-segment battle-custom-segment-active"
                          : "battle-custom-segment"
                      }
                      onClick={() => setVotingStyle("host")}
                    >
                      Host decides
                    </button>
                  </div>
                </div>

                <button
                  type="button"
                  className="btn-primary battle-custom-submit"
                  onClick={handleCreateCustomLobby}
                  disabled={isBusy}
                >
                  {creating === "custom"
                    ? "Creating invite-only lobby..."
                    : "Create Invite-Only Lobby"}
                </button>
              </div>
            )}

            {showJoinCustom && (
              <div className="card battle-custom-panel">
                <div className="battle-custom-panel-head">
                  <div>
                    <p className="panel-label">Join custom battle</p>
                    <h3>Enter a lobby ID</h3>
                    <p>
                      Paste the custom lobby ID from the host. Only players with
                      the exact ID or shared URL can join.
                    </p>
                  </div>

                  <span className="custom-badge">Invite Only</span>
                </div>

                <label className="battle-custom-field battle-custom-field-full">
                  <span>Lobby ID</span>
                  <input
                    type="text"
                    value={joinLobbyId}
                    onChange={(event) => setJoinLobbyId(event.target.value)}
                    placeholder="17bfba96-d6b2-4bd6-90e2-2f4d653640b2"
                    spellCheck={false}
                  />
                  <small>Only users with the exact lobby ID can join.</small>
                </label>

                <button
                  type="button"
                  className="btn-primary battle-custom-submit"
                  onClick={handleJoinCustomLobby}
                  disabled={isBusy || !joinLobbyId.trim()}
                >
                  {creating === "joining" ? "Joining..." : "Join Custom Lobby"}
                </button>
              </div>
            )}

            <div className="card battle-community-card">
              <p className="panel-label">Community samples</p>

              <h3>Submit a sample for future battles</h3>

              <p>
                Upload a short audio sample. If approved, it may appear in future
                beat battles.
              </p>

              <button
                type="button"
                className="btn-secondary"
                onClick={() => router.push("/samples/submit")}
              >
                Submit Sample
              </button>
            </div>

            <p className="mini-note">
              Ranked battles update rating and leaderboard stats. Custom battles
              are private, unranked, and shareable by URL or lobby ID.
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
                {creating ? "SYNCING" : "READY"}
              </span>
            </div>

            <div className="stats-grid">
              <div className="stat-box">
                <strong>
                  {showCustomSetup
                    ? `${Math.round(customDurationSeconds / 60)}:00`
                    : "15:00"}
                </strong>
                <span>Round timer</span>
              </div>
              <div className="stat-box">
                <strong>{showCustomSetup ? `2-${customMaxPlayers}` : "3-7"}</strong>
                <span>Players</span>
              </div>
              <div className="stat-box">
                <strong>3</strong>
                <span>Actions</span>
              </div>
            </div>

            <div className="sample-panel">
              <div>
                <p className="panel-label">Current selection</p>
                <h3>
                  {creating === "custom"
                    ? "Creating Custom Lobby"
                    : creating === "joining"
                      ? "Joining Custom Lobby"
                      : creating === "ranked"
                        ? "Ranked Queue"
                        : showCustomSetup
                          ? "Custom Setup"
                          : showJoinCustom
                            ? "Join Custom"
                            : "Choose Battle Mode"}
                </h3>
              </div>

              <div className="sample-badge">{creating ? "Loading" : "Live"}</div>
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
                    creating === "ranked" ? "status running" : "status complete"
                  }
                >
                  {creating === "ranked" ? "Searching" : "Ready"}
                </span>
                <span>Affects rank</span>
              </div>

              <div className="task-row">
                <span>Create Custom</span>
                <span
                  className={
                    creating === "custom" ? "status running" : "status waiting"
                  }
                >
                  {creating === "custom" ? "Creating" : "Invite-only"}
                </span>
                <span>Unranked</span>
              </div>

              <div className="task-row">
                <span>Join Custom</span>
                <span
                  className={
                    creating === "joining" ? "status running" : "status waiting"
                  }
                >
                  {creating === "joining" ? "Joining" : "Requires ID"}
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
            Ranked battles use public matchmaking. Custom battles are invite-only
            and can be joined by exact lobby ID or shared URL.
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
                Public server-side matchmaking backed by Supabase.
              </div>
              <div>
                <span>✓</span>
                Everyone flips the same shared sample.
              </div>
              <div>
                <span>✓</span>
                Fifteen minutes to produce and upload your track.
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
              disabled={isBusy}
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
                Creates an invite-only lobby with a shareable URL.
              </div>
              <div>
                <span>✓</span>
                Friends can join using the exact lobby ID.
              </div>
              <div>
                <span>✓</span>
                Customize players, timer, sample, and voting rules.
              </div>
              <div>
                <span>✓</span>
                Best for testing, friendly battles, and Discord sessions.
              </div>
            </div>

            <div className="battle-mode-actions">
              <button
                type="button"
                className="btn-secondary battle-card-button"
                onClick={openCustomSetup}
                disabled={isBusy}
              >
                Create Custom Lobby
              </button>

              <button
                type="button"
                className="btn-secondary battle-card-button"
                onClick={openJoinCustom}
                disabled={isBusy}
              >
                Join Custom Lobby
              </button>
            </div>

            <p className="battle-card-note">
              Once you&apos;re in the lobby, copy the URL or lobby ID and send it
              to anyone you want to invite.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
