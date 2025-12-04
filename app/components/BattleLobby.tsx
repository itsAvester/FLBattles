"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { supabase } from "../../lib/supabaseClient";

const INITIAL_TIME = 10 * 60; // 10 minutes in seconds

type Phase = "countdown" | "upload" | "results";

type BattleLobbyProps = {
  battleId: string;
  onLeave?: () => void;
};

type Profile = {
  id: string;
  total_battles: number | null;
  win_rate: number | null;
  rating: number | null;
};

type SubmissionView = {
  id: string;
  user_id: string;
  audio_path: string;
  url: string;
  isSelf: boolean;
};

// NEW: lobby-related types
type Lobby = {
  id: string;
  status: string; // 'searching' | 'in_progress' | 'finished'
  mode: string;
  min_players: number;
  max_players: number;
  created_at: string;
  ready_at: string | null;
  force_start: boolean;
};

type LobbyPlayer = {
  id: string;
  lobby_id: string;
  user_id: string;
  joined_at: string;
};

// Helper: decide if lobby should start
function shouldStartGame(lobby: Lobby | null, playerCount: number): boolean {
  if (!lobby) return false;
  if (lobby.status !== "searching") return false;

  // if dev forced start, we start immediately
  if (lobby.force_start) return true;

  // max players reached
  if (playerCount >= lobby.max_players) return true;

  // if min players and 3 minutes have passed since ready_at
  if (lobby.ready_at && playerCount >= lobby.min_players) {
    const readyTime = new Date(lobby.ready_at).getTime();
    const THREE_MIN = 3 * 60 * 1000;
    if (Date.now() - readyTime >= THREE_MIN) return true;
  }

  return false;
}

export default function BattleLobby({ battleId, onLeave }: BattleLobbyProps) {
  const searchParams = useSearchParams();
  const router = useRouter();

  console.log("BattleLobby mounted with battleId:", battleId);

  // "mode" comes from /battles/[id]?mode=ranked or ?mode=custom
  const mode = searchParams.get("mode") ?? "ranked";
  const isRanked = mode !== "custom";

  // NEW: lobby state
  const [lobby, setLobby] = useState<Lobby | null>(null);
  const [players, setPlayers] = useState<LobbyPlayer[]>([]);
  const [lobbyLoading, setLobbyLoading] = useState(true);
  const [lobbyError, setLobbyError] = useState<string | null>(null);
  const [matchStarted, setMatchStarted] = useState(false);
  const [autoStartEta, setAutoStartEta] = useState<number | null>(null);
  const [debugStarting, setDebugStarting] = useState(false);
  const [debugError, setDebugError] = useState<string | null>(null);

  const [timeLeft, setTimeLeft] = useState<number>(INITIAL_TIME);
  const [phase, setPhase] = useState<Phase>("countdown");

  // sample state
  const [sampleName, setSampleName] = useState<string | null>(null);
  const [sampleUrl, setSampleUrl] = useState<string | null>(null);
  const [sampleLoading, setSampleLoading] = useState<boolean>(true);
  const [sampleError, setSampleError] = useState<string | null>(null);

  // upload state
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadDone, setUploadDone] = useState(false);

  // stats update state
  const [updatingStats, setUpdatingStats] = useState(false);
  const [statsUpdated, setStatsUpdated] = useState(false);

  // submissions & voting
  const [submissions, setSubmissions] = useState<SubmissionView[]>([]);
  const [loadingSubmissions, setLoadingSubmissions] = useState(false);
  const [voteSubmitting, setVoteSubmitting] = useState(false);
  const [votedForUserId, setVotedForUserId] = useState<string | null>(null);
  const [voteError, setVoteError] = useState<string | null>(null);

  // track when all votes are in
  const [allVotesIn, setAllVotesIn] = useState(false);

  // leaving / penalty state
  const [leaving, setLeaving] = useState(false);
  const [leaveError, setLeaveError] = useState<string | null>(null);

  // ───────────────── LOBBY: fetch & realtime ─────────────────

  // Initial lobby + players load
  useEffect(() => {
    const fetchLobby = async () => {
      setLobbyLoading(true);
      setLobbyError(null);

      const { data: lobbyData, error: lobbyErr } = await supabase
        .from("battle_lobbies")
        .select("*")
        .eq("id", battleId)
        .single();

      if (lobbyErr || !lobbyData) {
        console.error("Failed to load lobby:", lobbyErr);
        setLobbyError("Failed to load lobby.");
        setLobbyLoading(false);
        return;
      }

      const lobbyRow = lobbyData as Lobby;
      setLobby(lobbyRow);

      // If lobby already in progress when you join, start match immediately
      if (lobbyRow.status === "in_progress") {
        setMatchStarted(true);
      }

      const { data: playersData, error: playersErr } = await supabase
        .from("battle_lobby_players")
        .select("*")
        .eq("lobby_id", battleId)
        .order("joined_at", { ascending: true });

      if (!playersErr && playersData) {
        setPlayers(playersData as LobbyPlayer[]);
      }

      setLobbyLoading(false);
    };

    fetchLobby();
  }, [battleId]);

  // Realtime updates for lobby + players
  useEffect(() => {
    const lobbyChannel = supabase
      .channel(`battle_lobbies:${battleId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "battle_lobbies",
          filter: `id=eq.${battleId}`,
        },
        (payload) => {
          setLobby(payload.new as Lobby);
        }
      )
      .subscribe();

    const playersChannel = supabase
      .channel(`battle_lobby_players:${battleId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "battle_lobby_players",
          filter: `lobby_id=eq.${battleId}`,
        },
        async () => {
          const { data: playersData } = await supabase
            .from("battle_lobby_players")
            .select("*")
            .eq("lobby_id", battleId)
            .order("joined_at", { ascending: true });

          if (playersData) {
            setPlayers(playersData as LobbyPlayer[]);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(lobbyChannel);
      supabase.removeChannel(playersChannel);
    };
  }, [battleId]);

  // Decide when to start match + compute auto-start countdown
  useEffect(() => {
    if (!lobby) return;

    const playerCount = players.length;

    // auto-start logic
    if (shouldStartGame(lobby, playerCount) && !matchStarted) {
      const startMatch = async () => {
        setMatchStarted(true);
        setPhase("countdown");

        // mark lobby as in progress (best-effort)
        await supabase
          .from("battle_lobbies")
          .update({ status: "in_progress" })
          .eq("id", lobby.id);
      };

      startMatch();
    }

    // compute time until auto-start (for UI)
    if (
      lobby.status === "searching" &&
      !lobby.force_start &&
      lobby.ready_at &&
      playerCount >= lobby.min_players
    ) {
      const readyTime = new Date(lobby.ready_at).getTime();
      const THREE_MIN = 3 * 60 * 1000;
      const etaMs = readyTime + THREE_MIN - Date.now();
      setAutoStartEta(etaMs > 0 ? Math.round(etaMs / 1000) : 0);
    } else {
      setAutoStartEta(null);
    }
  }, [lobby, players, matchStarted]);

  // Debug: force start lobby now (dev only, per-lobby)
  const handleDebugForceStart = async () => {
    setDebugError(null);
    setDebugStarting(true);

    try {
      const { error } = await supabase.rpc("force_start_battle_lobby", {
        p_lobby_id: battleId,
      });

      if (error) {
        console.error("force_start_battle_lobby error:", error);
        setDebugError(error.message || "Failed to force start lobby.");
        return;
      }

      // Optimistically start the match immediately on the client
      setMatchStarted(true);
      setPhase("countdown");
    } catch (err: any) {
      console.error("force_start_battle_lobby error:", err);
      setDebugError(err.message || "Failed to force start lobby.");
    } finally {
      setDebugStarting(false);
    }
  };

  // ───────────────── SAMPLE FETCH ─────────────────

  // Fetch a random sample when match starts (not just on mount)
  useEffect(() => {
    if (!matchStarted) return;

    const fetchSample = async () => {
      try {
        setSampleLoading(true);
        setSampleError(null);

        const res = await fetch("/api/random-sample");
        if (!res.ok) {
          let msg = "Failed to fetch sample";
          try {
            const body = await res.json();
            msg = body.error || msg;
          } catch {
            // ignore
          }
          throw new Error(msg);
        }

        const data: { filename: string; url: string } = await res.json();
        setSampleName(data.filename);
        setSampleUrl(data.url);
      } catch (err: any) {
        setSampleError(err.message || "Unknown error");
      } finally {
        setSampleLoading(false);
      }
    };

    fetchSample();
  }, [matchStarted]);

  // ───────────────── TIMER ─────────────────

  // Only tick timer once match has started
  useEffect(() => {
    if (!matchStarted) return;
    if (phase === "results") return;

    if (timeLeft <= 0) {
      if (phase !== "upload") setPhase("upload");
      return;
    }

    const interval = setInterval(() => {
      setTimeLeft((t) => t - 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [phase, timeLeft, matchStarted]);

  // ───────────────── RANKED STATS UPDATE ─────────────────

  useEffect(() => {
    if (!isRanked) return;
    if (phase !== "results" || statsUpdated) return;

    const updateStats = async () => {
      setUpdatingStats(true);
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
          setUpdatingStats(false);
          return;
        }

        const { data, error } = await supabase
          .from("profiles")
          .select("id, total_battles, win_rate, rating")
          .eq("id", user.id)
          .single();

        if (error || !data) {
          setUpdatingStats(false);
          return;
        }

        const profile = data as Profile;

        const prevTotal = profile.total_battles ?? 0;
        const prevWinRate = profile.win_rate ?? 0;
        const prevRating = profile.rating ?? 0;

        const prevWins =
          prevTotal > 0 ? Math.round((prevWinRate / 100) * prevTotal) : 0;

        const newTotal = prevTotal + 1;
        const newWins = prevWins + 1; // simple "you won" mock
        const newWinRate =
          newTotal === 0 ? 0 : (newWins / newTotal) * 100;

        const newRating = prevRating + 25; // simple rating bump

        await supabase
          .from("profiles")
          .update({
            total_battles: newTotal,
            win_rate: newWinRate,
            rating: newRating,
            updated_at: new Date().toISOString(),
          })
          .eq("id", user.id);

        setStatsUpdated(true);
      } finally {
        setUpdatingStats(false);
      }
    };

    updateStats();
  }, [phase, statsUpdated, isRanked]);

  // ───────────────── SUBMISSIONS / VOTING ─────────────────

  useEffect(() => {
    if (phase !== "results") return;
    if (!battleId || !battleId.trim()) {
      console.warn("No battleId provided when loading submissions");
      return;
    }

    const loadSubmissions = async () => {
      setLoadingSubmissions(true);
      setVoteError(null);

      const {
        data: { user },
      } = await supabase.auth.getUser();
      const currentUserId = user?.id ?? null;

      const { data, error } = await supabase
        .from("battle_submissions")
        .select("id, user_id, audio_path, created_at")
        .eq("battle_id", battleId)
        .order("created_at", { ascending: false });

      if (error || !data) {
        setLoadingSubmissions(false);
        return;
      }

      const seen = new Set<string>();
      const uniqueRows: any[] = [];
      for (const row of data as any[]) {
        if (seen.has(row.user_id)) continue;
        seen.add(row.user_id);
        uniqueRows.push(row);
      }

      const mapped: SubmissionView[] = uniqueRows.map((row) => {
        const { data: urlData } = supabase.storage
          .from("battle-audio")
          .getPublicUrl(row.audio_path);
        return {
          id: row.id,
          user_id: row.user_id,
          audio_path: row.audio_path,
          url: urlData.publicUrl,
          isSelf: currentUserId !== null && row.user_id === currentUserId,
        };
      });

      setSubmissions(mapped);
      setLoadingSubmissions(false);
    };

    loadSubmissions();
  }, [phase, battleId]);

  useEffect(() => {
    if (phase !== "results") return;
    if (!battleId || !battleId.trim()) return;
    if (submissions.length === 0) return;

    let cancelled = false;

    const checkVotes = async () => {
      const { count, error } = await supabase
        .from("battle_votes")
        .select("id", { count: "exact", head: true })
        .eq("battle_id", battleId);

      if (!error && count != null && !cancelled) {
        if (count >= submissions.length) {
          setAllVotesIn(true);
          router.push(`/battles/${battleId}/results`);
        }
      }
    };

    checkVotes();
    const interval = setInterval(checkVotes, 5000);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [phase, battleId, submissions.length, router]);

  const minutes = Math.floor(timeLeft / 60);
  const seconds = String(timeLeft % 60).padStart(2, "0");

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setUploadError(null);
    const f = e.target.files?.[0] ?? null;
    setFile(f);
  };

  const handleUpload = async () => {
    setUploadError(null);

    if (!battleId || !battleId.trim()) {
      console.error("Missing battleId in handleUpload:", battleId);
      setUploadError(
        "Missing battle id for this lobby. Please leave and rejoin the battle."
      );
      return;
    }

    if (!file) {
      setUploadError("Please choose an audio file first.");
      return;
    }

    if (uploadDone) {
      setUploadError("You have already uploaded for this battle.");
      return;
    }

    const uploadWindowOpen = matchStarted && phase !== "results" && timeLeft > 0;

    if (!uploadWindowOpen) {
      setUploadError("Upload window has closed for this battle.");
      return;
    }

    setUploading(true);

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        throw new Error("You must be logged in to upload.");
      }

      const safeName = file.name.replace(/\s+/g, "_");
      const path = `${user.id}/${battleId}/${Date.now()}_${safeName}`;

      const { error: uploadErr } = await supabase.storage
        .from("battle-audio")
        .upload(path, file, {
          cacheControl: "3600",
          upsert: false,
        });

      if (uploadErr) {
        console.error("Storage upload error:", uploadErr);
        setUploadError(
          `Storage upload error: ${uploadErr.message ?? "unknown error"}`
        );
        return;
      }

      const { error: insertErr } = await supabase
        .from("battle_submissions")
        .insert({
          battle_id: battleId,
          user_id: user.id,
          audio_path: path,
        });

      if (insertErr) {
        console.error("DB insert error:", insertErr);
        setUploadError(
          `Database error: ${insertErr.message ?? "unknown error"}`
        );
        return;
      }

      setUploadDone(true);
      setPhase("results");
    } catch (err: any) {
      console.error("Unexpected upload error:", err);
      setUploadError(err.message || "Failed to upload audio.");
    } finally {
      setUploading(false);
    }
  };

  const handleVote = async (submission: SubmissionView) => {
    setVoteError(null);

    if (votedForUserId) {
      setVoteError("You already voted in this battle.");
      return;
    }

    if (!battleId || !battleId.trim()) {
      console.error("Missing battleId in handleVote:", battleId);
      setVoteError(
        "Missing battle id for this lobby. Please leave and rejoin the battle."
      );
      return;
    }

    setVoteSubmitting(true);

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        setVoteError("You must be logged in to vote.");
        return;
      }

      const { error } = await supabase.from("battle_votes").insert({
        battle_id: battleId,
        voter_id: user.id,
        submission_user_id: submission.user_id,
      });

      if (error) {
        if ((error as any).code === "23505") {
          setVoteError("You already voted in this battle.");
        } else {
          setVoteError(error.message || "Failed to record vote.");
        }
        return;
      }

      setVotedForUserId(submission.user_id);
    } finally {
      setVoteSubmitting(false);
    }
  };

  const handleDebugVoteForSelf = async () => {
    setVoteError(null);

    const selfSub = submissions.find((s) => s.isSelf);
    if (!selfSub) {
      setVoteError("No self submission found to vote for.");
      return;
    }

    if (!battleId || !battleId.trim()) {
      console.error("Missing battleId in handleDebugVoteForSelf:", battleId);
      setVoteError(
        "Missing battle id for this lobby. Please leave and rejoin the battle."
      );
      return;
    }

    setVoteSubmitting(true);
    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        setVoteError("You must be logged in to use debug vote.");
        return;
      }

      const { error } = await supabase.from("battle_votes").insert({
        battle_id: battleId,
        voter_id: user.id,
        submission_user_id: selfSub.user_id,
      });

      if (error) {
        setVoteError(error.message || "Failed to insert debug vote.");
        return;
      }
    } finally {
      setVoteSubmitting(false);
    }
  };

  const uploadWindowOpen =
    matchStarted && phase !== "results" && timeLeft > 0;

  // ───────────────── LEAVE / PENALTY ─────────────────

  const handleLeaveBattle = async () => {
    setLeaveError(null);

    const shouldPenalize = isRanked && !allVotesIn;

    if (!shouldPenalize) {
      if (onLeave) onLeave();
      else router.push("/battles");
      return;
    }

    setLeaving(true);

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        if (onLeave) onLeave();
        else router.push("/battles");
        return;
      }

      const { data, error } = await supabase
        .from("profiles")
        .select("rating")
        .eq("id", user.id)
        .single();

      if (error || !data) {
        console.error("Failed to load profile for leave penalty:", error);
        if (onLeave) onLeave();
        else router.push("/battles");
        return;
      }

      const prevRating: number = data.rating ?? 0;
      const newRating = Math.max(prevRating - 50, 0);

      await supabase
        .from("profiles")
        .update({
          rating: newRating,
          updated_at: new Date().toISOString(),
        })
        .eq("id", user.id);
    } catch (err) {
      console.error("Leave penalty error:", err);
      setLeaveError(
        "Something went wrong applying your leave penalty, but you have left the battle."
      );
    } finally {
      setLeaving(false);
      if (onLeave) onLeave();
      else router.push("/battles");
    }
  };

  // ───────────────── RENDER ─────────────────

  return (
    <div className="card">
      <h2>Battle Lobby: {battleId}</h2>
      <p className="page-description" style={{ marginBottom: 12 }}>
        {isRanked ? "Ranked Battle" : "Custom Battle (Unranked)"}
      </p>
      <p style={{ color: "#cbd5f5", marginBottom: 16 }}>
        {isRanked
          ? "This battle affects your rating, rank tier, and leaderboard position."
          : "This is a custom, unranked lobby. Results here will not change your rating or rank."}
      </p>

      {/* LOBBY INFO */}
      <div className="sample-box" style={{ marginBottom: 16 }}>
        <h3>Lobby status</h3>
        {lobbyLoading && <p>Loading lobby...</p>}
        {lobbyError && (
          <p style={{ color: "#f97373" }}>{lobbyError}</p>
        )}
        {!lobbyLoading && !lobbyError && lobby && (
          <>
            <p>
              Players in lobby: {players.length} / {lobby.max_players}
            </p>
            {lobby.status === "searching" && !matchStarted && (
              <>
                <p>
                  Waiting for at least {lobby.min_players} players to
                  start.
                </p>
                {players.length < lobby.min_players && (
                  <p style={{ fontSize: "0.9rem", color: "#9ca3af" }}>
                    The battle will automatically start once{" "}
                    {lobby.min_players} players have joined (up to{" "}
                    {lobby.max_players}).
                  </p>
                )}
                {players.length >= lobby.min_players && (
                  <p style={{ fontSize: "0.9rem", color: "#9ca3af" }}>
                    Minimum players reached. Looking for more players for
                    up to 3 minutes{" "}
                    {autoStartEta != null
                      ? `(~${autoStartEta}s until auto-start)`
                      : ""}
                    .
                  </p>
                )}
              </>
            )}
            {matchStarted && (
              <p style={{ fontSize: "0.9rem", color: "#22c55e" }}>
                Battle has started!
              </p>
            )}
          </>
        )}

        {/* Debug: force start lobby with just you */}
        {lobby &&
          lobby.status === "searching" &&
          !matchStarted && (
            <div style={{ marginTop: 8 }}>
              <button
                onClick={handleDebugForceStart}
                className="btn-secondary"
                disabled={debugStarting}
              >
                {debugStarting
                  ? "Forcing start..."
                  : "Debug: Force start lobby (start with current players)"}
              </button>
              {debugError && (
                <p
                  style={{ color: "#f97373", marginTop: 4, fontSize: 12 }}
                >
                  {debugError}
                </p>
              )}
              <p
                style={{
                  marginTop: 4,
                  fontSize: "0.75rem",
                  color: "#9ca3af",
                }}
              >
                Dev-only: instantly starts the battle even if there are
                fewer than 3 players.
              </p>
            </div>
          )}
      </div>

      {/* TIMER */}
      {matchStarted && phase !== "results" && (
        <p className="highlight">
          Time left to produce: {minutes}:{seconds}
        </p>
      )}

      {/* BEFORE MATCH STARTS */}
      {!matchStarted && (
        <p style={{ marginBottom: 12 }}>
          Waiting for enough players to start the battle. Once the battle
          starts, you&apos;ll get a sample and a 10-minute timer to make
          your beat.
        </p>
      )}

      {/* COUNTDOWN & UPLOAD PHASES */}
      {matchStarted && (phase === "countdown" || phase === "upload") && (
        <>
          <p>
            Open FL Studio on your computer and use the sample below to
            create a beat. You can upload your clip at any time during the
            10-minute window. Once you upload, you&apos;re locked in for
            this battle.
          </p>

          <div className="sample-box">
            <h3>Sample for this battle</h3>

            {sampleLoading && (
              <p style={{ color: "#9ca3af" }}>Loading sample...</p>
            )}

            {sampleError && (
              <p style={{ color: "#f97373" }}>
                Failed to load sample: {sampleError}
              </p>
            )}

            {!sampleLoading && !sampleError && sampleUrl && (
              <>
                <p style={{ marginBottom: 8 }}>
                  Sample file: <strong>{sampleName}</strong>
                </p>

                <audio controls style={{ width: "100%" }}>
                  <source src={sampleUrl} />
                  Your browser does not support the audio element.
                </audio>

                <p
                  style={{
                    marginTop: 8,
                    fontSize: "0.9rem",
                    color: "#9ca3af",
                  }}
                >
                  Download this sample and drop it into FL Studio to start
                  your beat.
                </p>
              </>
            )}
          </div>

          {/* UPLOAD UI */}
          <div style={{ marginTop: 16 }}>
            <h3>Upload your track</h3>
            <p style={{ fontSize: "0.9rem", color: "#9ca3af" }}>
              Accepted: mp3, wav, etc. Max one upload per battle. Upload
              window closes when the 10 minutes expire.
            </p>

            <input
              type="file"
              accept="audio/*"
              onChange={handleFileChange}
              disabled={!uploadWindowOpen || uploading || uploadDone}
              style={{ marginTop: 8 }}
            />

            <div style={{ marginTop: 8 }}>
              <button
                onClick={handleUpload}
                className="btn-primary"
                disabled={
                  !uploadWindowOpen || uploading || uploadDone || !file
                }
              >
                {uploading
                  ? "Uploading..."
                  : uploadDone
                  ? "Uploaded"
                  : "Upload Track"}
              </button>
            </div>

            {uploadError && (
              <p style={{ color: "#f97373", marginTop: 6 }}>{uploadError}</p>
            )}

            {!uploadWindowOpen && !uploadDone && (
              <p
                style={{
                  color: "#f97373",
                  marginTop: 6,
                  fontSize: "0.9rem",
                }}
              >
                Upload window has closed for this battle.
              </p>
            )}

            {uploadDone && (
              <p
                style={{
                  color: "#22c55e",
                  marginTop: 6,
                  fontSize: "0.9rem",
                }}
              >
                Upload successful! Voting phase will begin shortly.
              </p>
            )}
          </div>
        </>
      )}

      {/* RESULTS PHASE */}
      {matchStarted && phase === "results" && (
        <>
          <p className="highlight">Results / Voting</p>
          <p>
            Listen to all submissions for this battle and cast your vote.
            You can only vote once per battle.
          </p>

          {/* Submissions list */}
          <div style={{ marginTop: 16 }}>
            {loadingSubmissions ? (
              <p>Loading submissions...</p>
            ) : submissions.length === 0 ? (
              <p>No submissions yet for this battle.</p>
            ) : (
              <div className="results-list">
                {submissions.map((sub, index) => {
                  const label = sub.isSelf
                    ? "You"
                    : `Producer ${index + 1}`;

                  const isVoted = votedForUserId === sub.user_id;

                  return (
                    <div
                      key={sub.id}
                      className="sample-box"
                      style={{ marginBottom: 12 }}
                    >
                      <h3>{label}</h3>
                      <audio
                        controls
                        style={{ width: "100%", marginTop: 4 }}
                      >
                        <source src={sub.url} />
                        Your browser does not support the audio element.
                      </audio>
                      <div
                        style={{
                          marginTop: 8,
                          display: "flex",
                          alignItems: "center",
                          gap: 8,
                        }}
                      >
                        {!sub.isSelf && (
                          <button
                            onClick={() => handleVote(sub)}
                            className="btn-secondary"
                            disabled={
                              voteSubmitting ||
                              (!!votedForUserId && !isVoted)
                            }
                          >
                            {isVoted ? "You voted for this" : "Vote"}
                          </button>
                        )}
                        {sub.isSelf && (
                          <span
                            style={{
                              fontSize: "0.8rem",
                              color: "#9ca3af",
                            }}
                          >
                            (Your track)
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {voteError && (
              <p style={{ color: "#f97373", marginTop: 6 }}>{voteError}</p>
            )}

            {submissions.some((s) => s.isSelf) && (
              <button
                onClick={handleDebugVoteForSelf}
                className="btn-secondary"
                style={{ marginTop: 12 }}
                disabled={voteSubmitting}
              >
                Debug: Simulate vote for my track
              </button>
            )}

            {allVotesIn && (
              <p
                style={{
                  marginTop: 8,
                  fontSize: "0.9rem",
                  color: "#22c55e",
                }}
              >
                All votes are in – redirecting to final results...
              </p>
            )}
          </div>

          {isRanked ? (
            <>
              {updatingStats && (
                <p
                  style={{
                    marginTop: 8,
                    fontSize: "0.9rem",
                    color: "#9ca3af",
                  }}
                >
                  Updating your stats...
                </p>
              )}
              {statsUpdated && !updatingStats && (
                <p
                  style={{
                    marginTop: 8,
                    fontSize: "0.9rem",
                    color: "#22c55e",
                  }}
                >
                  Stats updated! Check your profile to see your new rating.
                </p>
              )}
            </>
          ) : (
            <p
              style={{
                marginTop: 8,
                fontSize: "0.9rem",
                color: "#9ca3af",
              }}
            >
              Custom battle: stats and rating are not changed by this match.
            </p>
          )}
        </>
      )}

      {leaveError && (
        <p style={{ color: "#f97373", marginTop: 8 }}>{leaveError}</p>
      )}

      <button
        onClick={handleLeaveBattle}
        className="btn-secondary leave-btn"
        disabled={leaving}
      >
        {leaving
          ? "Leaving..."
          : isRanked && !allVotesIn
          ? "Leave Battle (-50 rating)"
          : "Leave Battle"}
      </button>
    </div>
  );
}
