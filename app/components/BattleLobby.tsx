"use client";

import { useEffect, useRef, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { supabase } from "../../lib/supabaseClient";

const INITIAL_TIME = 15 * 60; // 15 minutes in seconds
const QUEUE_READY_TIME = 60; // 60 seconds after min players are reached

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
  displayName: string;
};

type Lobby = {
  id: string;
  status: string; // 'searching' | 'in_progress' | 'finished'
  mode: string;
  min_players: number;
  max_players: number;
  created_at: string;
  ready_at: string | null;
  force_start: boolean;
  // universal match timer
  battle_started_at: string | null;
};

type LobbyPlayer = {
  id: string;
  lobby_id: string;
  user_id: string;
  joined_at: string;
  displayName?: string;
};

// Helper: decide if lobby should start
/*function shouldStartGame(lobby: Lobby | null, playerCount: number): boolean {
  if (!lobby) return false;
  if (lobby.status !== "searching") return false;

  // if debug flag is set in DB (in the future), start now
  if (lobby.force_start) return true;

  // max players reached
  if (playerCount >= lobby.max_players) return true;

  // min players reached + 3 minute search window
  if (lobby.ready_at && playerCount >= lobby.min_players) {
    const readyTime = new Date(lobby.ready_at).getTime();
    const THREE_MIN = 3 * 60 * 1000;
    if (Date.now() - readyTime >= THREE_MIN) return true;
  }

  return false;
}
*/
function getQueueAutoStartEta(lobby: Lobby | null, playerCount: number): number | null {
  if (!lobby) return null;
  if (lobby.status !== "searching") return null;
  if (lobby.force_start) return 0;
  if (!lobby.ready_at) return null;
  if (playerCount < lobby.min_players) return null;

  const readyTime = new Date(lobby.ready_at).getTime();
  const startTime = readyTime + QUEUE_READY_TIME * 1000;
  const eta = Math.ceil((startTime - Date.now()) / 1000);

  return Math.max(0, eta);
}
export default function BattleLobby({ battleId, onLeave }: BattleLobbyProps) {
  const searchParams = useSearchParams();
  const router = useRouter();

  console.log("BattleLobby mounted with battleId:", battleId);

  const mode = searchParams.get("mode") ?? "ranked";
  const isRanked = mode !== "custom";
const playedStartSoundFor = useRef<string | null>(null);

const playMatchStartSound = () => {
  try {
    const AudioContextClass =
      window.AudioContext || (window as any).webkitAudioContext;

    if (!AudioContextClass) return;

    const audioCtx = new AudioContextClass();
    const oscillator = audioCtx.createOscillator();
    const gain = audioCtx.createGain();

    oscillator.type = "sawtooth";
    oscillator.frequency.setValueAtTime(220, audioCtx.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(
      880,
      audioCtx.currentTime + 0.18
    );

    gain.gain.setValueAtTime(0.0001, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.18, audioCtx.currentTime + 0.03);
    gain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + 0.35);

    oscillator.connect(gain);
    gain.connect(audioCtx.destination);

    oscillator.start();
    oscillator.stop(audioCtx.currentTime + 0.35);
  } catch (err) {
    console.warn("Could not play match start sound:", err);
  }
};
  // lobby state
  const [lobby, setLobby] = useState<Lobby | null>(null);
  const [players, setPlayers] = useState<LobbyPlayer[]>([]);
  const [lobbyLoading, setLobbyLoading] = useState(true);
  const [playerNamesById, setPlayerNamesById] = useState<Record<string, string>>({});
  const [lobbyError, setLobbyError] = useState<string | null>(null);
  const [matchStarted, setMatchStarted] = useState(false);
  const [autoStartEta, setAutoStartEta] = useState<number | null>(null);
  const [debugStarting, setDebugStarting] = useState(false);
  const [debugError, setDebugError] = useState<string | null>(null);
  const [missingSubmissionCount, setMissingSubmissionCount] = useState(0);

  // timer / phase
  const [timeLeft, setTimeLeft] = useState<number>(INITIAL_TIME);
  const [phase, setPhase] = useState<Phase>("countdown");
  useEffect(() => {
  const startKey = lobby?.battle_started_at;

  if (!matchStarted || !startKey) return;

  if (playedStartSoundFor.current === startKey) return;

  playedStartSoundFor.current = startKey;
  playMatchStartSound();
}, [matchStarted, lobby?.battle_started_at]);

  // LOCAL debug start time (used only when you hit the debug button)
  const [debugStartTime, setDebugStartTime] = useState<string | null>(null);

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

  const [allVotesIn, setAllVotesIn] = useState(false);

  // leaving / penalty
  const [leaving, setLeaving] = useState(false);
  const [leaveError, setLeaveError] = useState<string | null>(null);

  // Reset all per-lobby client state whenever the URL changes to a different lobby.
  // This prevents a finished lobby's timer/phase/upload state from carrying into a new lobby.
  useEffect(() => {
    setLobby(null);
    setPlayers([]);
    setMatchStarted(false);
    setAutoStartEta(null);
    setDebugStarting(false);
    setDebugError(null);
    setTimeLeft(INITIAL_TIME);
    setPhase("countdown");
    setDebugStartTime(null);
    setSampleName(null);
    setSampleUrl(null);
    setSampleLoading(true);
    setSampleError(null);
    setFile(null);
    setUploading(false);
    setUploadError(null);
    setUploadDone(false);
    setUpdatingStats(false);
    setStatsUpdated(false);
    setSubmissions([]);
    setLoadingSubmissions(false);
    setVoteSubmitting(false);
    setVotedForUserId(null);
    setVoteError(null);
    setAllVotesIn(false);
    setLeaving(false);
    setLeaveError(null);
  }, [battleId]);

  // ───────────────── LOBBY: fetch & realtime ─────────────────
const loadPlayerNames = async (playerRows: LobbyPlayer[]) => {
  const userIds = Array.from(new Set(playerRows.map((p) => p.user_id)));

  if (userIds.length === 0) {
    setPlayerNamesById({});
    return;
  }

  const { data, error } = await supabase
    .from("profiles")
    .select("id, display_name")
    .in("id", userIds);

  if (error) {
    console.error("Failed to load player names:", error);
    return;
  }

  const nameMap: Record<string, string> = {};

  for (const profile of data ?? []) {
    nameMap[profile.id] = profile.display_name || "Unnamed Producer";
  }

  setPlayerNamesById(nameMap);
};
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

      let lobbyRow = lobbyData as Lobby;

      // Defensive cleanup: a lobby in "searching" should never have an old
      // battle_started_at. If it does, the client would calculate the timer
      // from that stale timestamp and immediately show 0:00. Clear it.
      if (lobbyRow.status === "searching" && lobbyRow.battle_started_at) {
        const { data: cleanedLobby, error: cleanupErr } = await supabase
          .from("battle_lobbies")
          .update({
            battle_started_at: null,
            force_start: false,
          })
          .eq("id", battleId)
          .eq("status", "searching")
          .select("*")
          .single();

        if (cleanupErr) {
          console.warn("Could not clear stale battle_started_at:", cleanupErr);
        } else if (cleanedLobby) {
          lobbyRow = cleanedLobby as Lobby;
        }
      }

      setLobby(lobbyRow);

      if (lobbyRow.status === "in_progress" && lobbyRow.battle_started_at) {
        setMatchStarted(true);
      } else {
        setMatchStarted(false);
        setPhase("countdown");
        setTimeLeft(INITIAL_TIME);
      }

      const { data: playersData, error: playersErr } = await supabase
        .from("battle_lobby_players")
        .select("*")
        .eq("lobby_id", battleId)
        .order("joined_at", { ascending: true });

      if (!playersErr && playersData) {
  const playerRows = playersData as LobbyPlayer[];
  setPlayers(playerRows);
  await loadPlayerNames(playerRows);
}

      setLobbyLoading(false);
    };

    fetchLobby();
  }, [battleId]);

  // Realtime subscriptions for lobby + players
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
          const updated = payload.new as Lobby;
          setLobby(updated);

          if (updated.status === "in_progress" && updated.battle_started_at) {
            setMatchStarted(true);
          } else if (updated.status === "searching") {
            setMatchStarted(false);
            setPhase("countdown");
            setTimeLeft(INITIAL_TIME);
            setDebugStartTime(null);
          } else if (updated.status === "voting" || updated.status === "finished") {
  setMatchStarted(true);
  setPhase("results");
}
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
  const playerRows = playersData as LobbyPlayer[];
  setPlayers(playerRows);
  await loadPlayerNames(playerRows);
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
/*useEffect(() => {
  if (!lobby) return;

  let cancelled = false;

  const checkAutoStart = async () => {
    if (!lobby || cancelled) return;

    const playerCount = new Set(players.map((p) => p.user_id)).size;

    // compute time until auto-start for display
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

    // If conditions are met, start the battle
    if (shouldStartGame(lobby, playerCount)) {
      try {
        const nowIso = new Date().toISOString();

        const { data, error } = await supabase
          .from("battle_lobbies")
          .update({
            status: "in_progress",
            battle_started_at: nowIso,
            force_start: false,
          })
          .eq("id", lobby.id)
          .eq("status", "searching")
          .select("*")
          .single();

        if (error) {
          console.error("Failed to update lobby to in_progress:", error);
          return;
        }

        if (data && !cancelled) {
          setLobby(data as Lobby);
          setMatchStarted(true);
          setPhase("countdown");
          setTimeLeft(INITIAL_TIME);
        }
      } catch (err) {
        console.error("startMatch unexpected error:", err);
      }
    }
  };

  checkAutoStart();

  const interval = setInterval(checkAutoStart, 1000);

  return () => {
    cancelled = true;
    clearInterval(interval);
  };
}, [lobby, players]);*/
// Compute queue auto-start countdown for display only.
// Supabase advance_battle_lobbies() is responsible for actually starting the battle.
useEffect(() => {
  if (!lobby) {
    setAutoStartEta(null);
    return;
  }

  const tick = () => {
    const playerCount = new Set(players.map((p) => p.user_id)).size;
    setAutoStartEta(getQueueAutoStartEta(lobby, playerCount));
  };

  tick();

  const interval = setInterval(tick, 1000);

  return () => clearInterval(interval);
}, [lobby, players]);

// Automatically advance lobby phases while users are in a battle lobby.
// This keeps lobbies moving from searching → in_progress → voting → finished.
useEffect(() => {
  if (!battleId) return;

  const advanceLobbies = async () => {
    const { error } = await supabase.rpc("advance_battle_lobbies");

    if (error) {
      console.error("Failed to advance battle lobbies:", error);
    }
  };

  // Run once immediately when the lobby page loads
  advanceLobbies();

  // Then run every 10 seconds while the user is on this lobby page
  const interval = setInterval(advanceLobbies, 10000);

  return () => clearInterval(interval);
}, [battleId]);

  // Debug: force start lobby on THIS CLIENT ONLY
  // (Does not rely on DB or RPC. Perfect for solo dev testing.)
  const handleDebugForceStart = async () => {
    setDebugError(null);
    setDebugStarting(true);

    try {
      const nowIso = new Date().toISOString();
      setDebugStartTime(nowIso);
      setMatchStarted(true);
      setPhase("countdown");
      setTimeLeft(INITIAL_TIME);

      // Locally mark lobby as in_progress so the UI shows started
      setLobby((prev) =>
        prev
          ? {
              ...prev,
              status: "in_progress",
              battle_started_at: prev.battle_started_at ?? nowIso,
            }
          : prev
      );
    } catch (err: any) {
      console.error("Debug force start error:", err);
      setDebugError(err.message || "Failed to force start lobby.");
    } finally {
      setDebugStarting(false);
    }
  };

  // ───────────────── SAMPLE FETCH ─────────────────

  // When match has started, fetch a random sample.
  // Depend on the start timestamp so a newly started lobby gets a fresh sample,
  // but ordinary timer ticks do not refetch it.
  useEffect(() => {
    const startIso = lobby?.battle_started_at ?? debugStartTime;
    if (!matchStarted || !startIso) return;

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
  }, [matchStarted, lobby?.battle_started_at, debugStartTime]);

  // ───────────────── UNIVERSAL / DEBUG TIMER ─────────────────

  // If lobby has a real battle_started_at, that's authoritative.
  // If it is back in searching, reset the local timer state.
  useEffect(() => {
    if (lobby?.status === "in_progress" && lobby.battle_started_at) {
      setMatchStarted(true);
      return;
    }

    if (lobby?.status === "searching") {
      setMatchStarted(false);
      setPhase("countdown");
      setTimeLeft(INITIAL_TIME);
    }
  }, [lobby?.status, lobby?.battle_started_at]);

  // Compute timeLeft from:
  // 1) lobby.battle_started_at (real universal timer), OR
  // 2) debugStartTime (when you hit the debug button)
  useEffect(() => {
    const startIso = lobby?.battle_started_at ?? debugStartTime;

    if (!startIso) {
      setTimeLeft(INITIAL_TIME);
      return;
    }

    if (phase === "results") return;

    // Do not run the timer from an old DB value unless the lobby is actually in progress.
    if (!debugStartTime && lobby?.status !== "in_progress") {
      setTimeLeft(INITIAL_TIME);
      return;
    }

    const startMs = new Date(startIso).getTime();

    const tick = () => {
      const elapsed = Math.floor((Date.now() - startMs) / 1000);
      const remaining = INITIAL_TIME - elapsed;

      if (remaining <= 0) {
        setTimeLeft(0);
        if (phase !== "upload") {
          setPhase("upload");
        }
        return;
      }

      setTimeLeft(remaining);
    };

    // run once immediately
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [lobby?.status, lobby?.battle_started_at, debugStartTime, phase]);

  // ───────────────── RANKED STATS UPDATE ─────────────────

 /* useEffect(() => {
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
*/
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
      const { data: lobbyPlayers, error: playersError } = await supabase
  .from("battle_lobby_players")
  .select("user_id")
  .eq("lobby_id", battleId);

if (playersError) {
  console.error("Error loading lobby players:", playersError);
}

const totalPlayers = lobbyPlayers?.length ?? 0;
const totalSubmissions = data?.length ?? 0;

setMissingSubmissionCount(Math.max(totalPlayers - totalSubmissions, 0));

const allUserIds = Array.from(
  new Set([
    ...(lobbyPlayers ?? []).map((p: any) => p.user_id),
    ...(data ?? []).map((s: any) => s.user_id),
  ])
);

const { data: profilesData } = await supabase
  .from("profiles")
  .select("id, display_name")
  .in("id", allUserIds);

const profileNameById = new Map(
  (profilesData ?? []).map((profile: any) => [
    profile.id,
    profile.display_name || "Unnamed Producer",
  ])
);

const lobbyPlayersWithNames: LobbyPlayer[] = (lobbyPlayers ?? []).map(
  (player: any) => ({
    ...player,
    displayName: profileNameById.get(player.user_id) ?? "Unnamed Producer",
  })
);

setPlayers(lobbyPlayersWithNames);

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

  const displayName =
    profileNameById.get(row.user_id) ?? "Unnamed Producer";

  return {
    id: row.id,
    user_id: row.user_id,
    audio_path: row.audio_path,
    url: urlData.publicUrl,
    isSelf: currentUserId !== null && row.user_id === currentUserId,
    displayName,
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
        const requiredVotes = submissions.length <= 1 ? 0 : submissions.length;

if (submissions.length === 1 || count >= requiredVotes) {
  const { error: finalizeError } = await supabase.rpc(
    "finalize_battle_results",
    {
      p_battle_id: battleId,
    }
  );

  if (finalizeError) {
    console.error("Failed to finalize battle:", finalizeError);
    setAllVotesIn(false);
    setVoteError(finalizeError.message || "Failed to finalize battle.");
    return;
  }

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

    const uploadWindowOpen = matchStarted && phase !== "results" && timeLeft > 0;

    const submittedUserIds = new Set(submissions.map((s) => s.user_id));

const uniqueActivePlayers = Array.from(
  new Map(players.map((p) => [p.user_id, p])).values()
);

const playersWithoutSubmissions = uniqueActivePlayers.filter(
  (p) => !submittedUserIds.has(p.user_id)
);

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

      const safeName = file.name
        .replace(/[^a-zA-Z0-9._-]/g, "_")
        .replace(/_+/g, "_");
      const extension = safeName.includes(".")
        ? safeName.split(".").pop()
        : "webm";

      // Stable path per user + battle. This lets a player replace their upload
      // without creating a second DB row or orphaning new timestamped files.
      const path = `${user.id}/${battleId}/submission.${extension}`;

      const { error: uploadErr } = await supabase.storage
        .from("battle-audio")
        .upload(path, file, {
          cacheControl: "3600",
          upsert: true,
        });

      if (uploadErr) {
        console.error("Storage upload error:", uploadErr);
        setUploadError(
          `Storage upload error: ${uploadErr.message ?? "unknown error"}`
        );
        return;
      }

      const { error: submissionErr } = await supabase
        .from("battle_submissions")
        .upsert(
          {
            battle_id: battleId,
            user_id: user.id,
            audio_path: path,
            created_at: new Date().toISOString(),
          },
          {
            onConflict: "battle_id,user_id",
          }
        );

      if (submissionErr) {
        console.error("DB submission upsert error:", submissionErr);
        setUploadError(
          `Database error: ${submissionErr.message ?? "unknown error"}`
        );
        return;
      }

      setUploadDone(true);
// Do NOT immediately switch to results.
// Stay on this screen until the shared lobby status changes to "voting" or "finished".
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
    setLeaving(true);

    // only penalize if ranked AND match actually started AND not all votes in
    const shouldPenalize = isRanked && matchStarted && !allVotesIn;

    try {
      // 1) Get current user
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (!user || userError) {
        console.warn("Could not load user when leaving battle:", userError);
      } else {
        // 2) ALWAYS remove this user from the lobby so counts stay correct
        const { error: deleteErr } = await supabase
          .from("battle_lobby_players")
          .delete()
          .eq("lobby_id", battleId)
          .eq("user_id", user.id);

        if (deleteErr) {
          console.error("Failed to remove player from lobby:", deleteErr);
        }

        // 3) If ranked and leaving during/after battle, apply rating penalty
        if (shouldPenalize) {
          const { data, error } = await supabase
            .from("profiles")
            .select("rating")
            .eq("id", user.id)
            .single();

          if (!error && data) {
            const prevRating: number = data.rating ?? 0;
            const newRating = Math.max(prevRating - 50, 0);

            const { error: updErr } = await supabase
              .from("profiles")
              .update({
                rating: newRating,
                updated_at: new Date().toISOString(),
              })
              .eq("id", user.id);

            if (updErr) {
              console.error("Leave penalty update error:", updErr);
              setLeaveError(
                "Something went wrong applying your leave penalty, but you have left the battle."
              );
            }
          } else {
            console.error("Failed to load profile for leave penalty:", error);
          }
        }
      }
    } catch (err) {
      console.error("Leave battle error:", err);
      if (shouldPenalize) {
        setLeaveError(
          "Something went wrong applying your leave penalty, but you have left the battle."
        );
      }
    } finally {
      setLeaving(false);
      if (onLeave) onLeave();
      else router.push("/battles");
    }
  };
const submittedUserIds = new Set(submissions.map((s) => s.user_id));

const uniqueActivePlayers: LobbyPlayer[] = Array.from(
  new Map(players.map((p) => [p.user_id, p])).values()
);

const playersWithoutSubmissions: LobbyPlayer[] = uniqueActivePlayers.filter(
  (p) => !submittedUserIds.has(p.user_id)
);
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
              Players in lobby: {new Set(players.map((p) => p.user_id)).size} / {lobby.max_players}
            </p>
            <div style={{ marginTop: 10, marginBottom: 12 }}>
  <p style={{ fontSize: "0.9rem", color: "#9ca3af", marginBottom: 6 }}>
    Players:
  </p>

  <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
    {Array.from(new Map(players.map((p) => [p.user_id, p])).values()).map(
      (player, index) => (
        <span
          key={player.user_id}
          style={{
            padding: "6px 10px",
            borderRadius: 999,
            border: "1px solid rgba(255,255,255,0.18)",
            background: "rgba(255,255,255,0.06)",
            color: "#e5e7eb",
            fontSize: "0.85rem",
            fontWeight: 700,
          }}
        >
          {playerNamesById[player.user_id] ?? `Player ${index + 1}`}
        </span>
      )
    )}
  </div>
</div>
            {lobby.status === "searching" && !matchStarted && (
              <>
                <p>
                  Waiting for at least {lobby.min_players} players to
                  start.
                </p>
                {new Set(players.map((p) => p.user_id)).size < lobby.min_players && (
                  <p style={{ fontSize: "0.9rem", color: "#9ca3af" }}>
                    The battle will automatically start once{" "}
                    {lobby.min_players} players have joined (up to{" "}
                    {lobby.max_players}).
                  </p>
                )}
                {new Set(players.map((p) => p.user_id)).size>= lobby.min_players && (
  <p style={{ fontSize: "0.9rem", color: "#9ca3af" }}>
    Minimum players reached. Battle starts 60 seconds after the newest player joins{" "}
{autoStartEta != null && `(~${autoStartEta}s until auto-start)`}

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

        
          
      </div>

      {/* TIMER */}
      {matchStarted && phase !== "results" && (
        <p className="highlight">
          Time left to produce: {minutes}:{seconds}
        </p>
      )}

      {!matchStarted && (
        <p style={{ marginBottom: 12 }}>
          Waiting for enough players to start the battle. Once the battle
          starts, you&apos;ll get a sample and a 15-minute timer to make
          your beat.
        </p>
      )}

      {/* COUNTDOWN & UPLOAD PHASES */}
      {matchStarted && (phase === "countdown" || phase === "upload") && (
        <>
          <p>
            Open FL Studio on your computer and use the sample below to
            create a beat. You can upload your clip at any time during the
            15-minute window. Once you upload, you&apos;re locked in for
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
              Accepted: mp3, wav, etc. You can replace your upload during
              the 15-minute window.
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

{missingSubmissionCount > 0 && (
  <div
    style={{
      marginTop: 12,
      marginBottom: 12,
      padding: "12px 14px",
      border: "1px solid rgba(234, 179, 8, 0.45)",
      background: "rgba(234, 179, 8, 0.12)",
      color: "#facc15",
      borderRadius: 12,
      fontSize: "0.95rem",
    }}
  >
    {missingSubmissionCount === 1
      ? "1 player did not submit a beat, so they are not included in voting."
      : `${missingSubmissionCount} players did not submit beats, so they are not included in voting.`}
  </div>
)}

{submissions.length === 1 && missingSubmissionCount > 0 && (
  <div
    style={{
      marginTop: 12,
      marginBottom: 12,
      padding: "12px 14px",
      border: "1px solid rgba(34, 197, 94, 0.45)",
      background: "rgba(34, 197, 94, 0.12)",
      color: "#22c55e",
      borderRadius: 12,
      fontSize: "0.95rem",
    }}
  >
    Only one beat was submitted. This battle should finish without normal voting.
  </div>
)}

<div style={{ marginTop: 16 }}>
            {loadingSubmissions ? (
              <p>Loading submissions...</p>
            ) : submissions.length === 0 ? (
              <p>No submissions yet for this battle.</p>
            ) : (
              <div className="results-list">
                {submissions.map((sub, index) => {
                  const label = sub.isSelf
  ? `You (${sub.displayName})`
  : sub.displayName;

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
                {playersWithoutSubmissions.map((player) => (
  <div
    key={`missing-${player.user_id}`}
    className="sample-box"
    style={{
      marginBottom: 12,
      border: "1px solid rgba(249,115,115,0.45)",
      background: "rgba(127,29,29,0.18)",
    }}
  >
    <h3>{player.displayName ?? "Producer"} did not submit</h3>
    <p style={{ color: "#fca5a5", marginTop: 4 }}>
      {player.displayName ?? "This player"} joined the battle but did not upload a beat before the
submission window closed.
    </p>
  </div>
))}
              </div>
            )}

            {voteError && (
              <p style={{ color: "#f97373", marginTop: 6 }}>{voteError}</p>
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

      {/* Leave button: always visible, only penalizes after match start */}
      <button
  onClick={handleLeaveBattle}
  className="btn-secondary leave-btn"
  disabled={leaving}
>
  {leaving
    ? "Leaving..."
    : isRanked && matchStarted && !allVotesIn
      ? "Leave Battle (-50 rating)"
      : "Leave Battle"}
</button>

    </div>
  );
}
