"use client";

import { useEffect, useRef, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { supabase } from "../../lib/supabaseClient";

const INITIAL_TIME = 15 * 60; // 15 minutes in seconds
const QUEUE_READY_TIME = 60; // 60 seconds after min players are reached
const VOTING_TIME = 2 * 60 + 30; // 2 minutes 30 seconds
const PRODUCTION_WARNING_SECONDS = [60, 50, 40, 30, 20, 10];

const BATTLE_UPLOAD_RIGHTS_AGREEMENT_VERSION = "battle-upload-v1";

const BATTLE_UPLOAD_RIGHTS_AGREEMENT =
  "I confirm that I created this beat or have all necessary rights, licenses, and permissions to upload it to FLBattles for temporary battle hosting, streaming, voting, moderation, and results display. I understand that I am responsible for my submission and that FLBattles may remove it if it may violate copyright, site rules, or applicable law.";

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
  status: string; // 'searching' | 'in_progress' | 'voting' | 'finished'
  mode: string;
  min_players: number;
  max_players: number;
  created_at: string;
  ready_at: string | null;
  force_start: boolean;
  battle_started_at: string | null;
  upload_ends_at: string | null;
  voting_started_at: string | null;
  voting_ends_at: string | null;
  finished_at: string | null;
  host_user_id: string | null;
  battle_duration_seconds: number | null;
  sample_source: "random" | "host_upload" | null;
  voting_style: "everyone" | "host" | null;
  sample_name: string | null;
  sample_url: string | null;
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
function getRankFromRating(rating: number | null | undefined): string {
  const r = rating ?? 0;

  if (r <= 0) return "Unranked";
  if (r >= 600) return "Ruby";
  if (r >= 400) return "Emerald";
  if (r >= 300) return "Diamond";
  if (r >= 200) return "Platinum";
  if (r >= 100) return "Gold";
  if (r >= 50) return "Silver";
  return "Bronze";
}

function getRankTheme(rank: string) {
  switch (rank) {
    case "Top 10":
      return {
        text: "#050505",
        border: "rgba(255, 77, 28, 0.95)",
        background: "linear-gradient(90deg, #ff4d1c 0%, #f6c65b 100%)",
        glow: "0 0 20px rgba(255, 77, 28, 0.28)",
      };
    case "Ruby":
      return {
        text: "#fda4af",
        border: "rgba(244, 63, 94, 0.42)",
        background: "rgba(244, 63, 94, 0.14)",
        glow: "0 0 18px rgba(244, 63, 94, 0.18)",
      };
    case "Emerald":
      return {
        text: "#6ee7b7",
        border: "rgba(16, 185, 129, 0.42)",
        background: "rgba(16, 185, 129, 0.14)",
        glow: "0 0 18px rgba(16, 185, 129, 0.18)",
      };
    case "Diamond":
      return {
        text: "#c4b5fd",
        border: "rgba(139, 92, 246, 0.42)",
        background: "rgba(139, 92, 246, 0.14)",
        glow: "0 0 18px rgba(139, 92, 246, 0.18)",
      };
    case "Platinum":
      return {
        text: "#7dd3fc",
        border: "rgba(14, 165, 233, 0.42)",
        background: "rgba(14, 165, 233, 0.14)",
        glow: "0 0 18px rgba(14, 165, 233, 0.18)",
      };
    case "Gold":
      return {
        text: "#f6c65b",
        border: "rgba(246, 198, 91, 0.42)",
        background: "rgba(246, 198, 91, 0.14)",
        glow: "0 0 18px rgba(246, 198, 91, 0.16)",
      };
    case "Silver":
      return {
        text: "#d1d5db",
        border: "rgba(209, 213, 219, 0.35)",
        background: "rgba(209, 213, 219, 0.10)",
        glow: "none",
      };
    case "Bronze":
      return {
        text: "#d6a46a",
        border: "rgba(214, 164, 106, 0.35)",
        background: "rgba(214, 164, 106, 0.12)",
        glow: "none",
      };
    default:
      return {
        text: "#a1a1aa",
        border: "rgba(161, 161, 170, 0.26)",
        background: "rgba(161, 161, 170, 0.10)",
        glow: "none",
      };
  }
}

function formatQueueEta(seconds: number | null): string {
  if (seconds == null) return "--:--";
  const mins = Math.floor(seconds / 60);
  const secs = String(seconds % 60).padStart(2, "0");
  return `${mins}:${secs}`;
}

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = String(seconds % 60).padStart(2, "0");
  return `${mins}:${secs}`;
}

export default function BattleLobby({ battleId, onLeave }: BattleLobbyProps) {
  const searchParams = useSearchParams();
  const router = useRouter();

  console.log("BattleLobby mounted with battleId:", battleId);

  const requestedMode = searchParams.get("mode") ?? "ranked";
const activeBattleIdRef = useRef<string>(battleId);
const playedStartSoundFor = useRef<string | null>(null);
const votingSectionRef = useRef<HTMLDivElement | null>(null);
const previousPlayerIdsRef = useRef<Set<string>>(new Set());
const playersLoadedOnceRef = useRef(false);
const lastLoadedPlayerProfileKeyRef = useRef<string>("");
const minPlayersSoundPlayedRef = useRef(false);
const finalCountdownPlayedForRef = useRef<Set<number>>(new Set());
const warningTimerLastValueRef = useRef<number | null>(null);

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

const playSubmitDing = () => {
  try {
    const AudioContextClass =
      window.AudioContext || (window as any).webkitAudioContext;

    if (!AudioContextClass) return;

    const audioCtx = new AudioContextClass();
    const oscillator = audioCtx.createOscillator();
    const gain = audioCtx.createGain();

    oscillator.type = "sine";
    oscillator.frequency.setValueAtTime(880, audioCtx.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(
      1320,
      audioCtx.currentTime + 0.12
    );

    gain.gain.setValueAtTime(0.0001, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.16, audioCtx.currentTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + 0.28);

    oscillator.connect(gain);
    gain.connect(audioCtx.destination);

    oscillator.start();
    oscillator.stop(audioCtx.currentTime + 0.28);
  } catch (err) {
    console.warn("Could not play submit ding:", err);
  }
};

const playTone = (
  frequency: number,
  duration = 0.16,
  type: OscillatorType = "sine",
  volume = 0.14
) => {
  try {
    const AudioContextClass =
      window.AudioContext || (window as any).webkitAudioContext;

    if (!AudioContextClass) return;

    const audioCtx = new AudioContextClass();
    const oscillator = audioCtx.createOscillator();
    const gain = audioCtx.createGain();

    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, audioCtx.currentTime);

    gain.gain.setValueAtTime(0.0001, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(volume, audioCtx.currentTime + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + duration);

    oscillator.connect(gain);
    gain.connect(audioCtx.destination);

    oscillator.start();
    oscillator.stop(audioCtx.currentTime + duration);
  } catch (err) {
    console.warn("Could not play sound:", err);
  }
};

const playOneMinuteWarningSound = () => {
  playTone(440, 0.18, "triangle", 0.12);
  window.setTimeout(() => playTone(660, 0.2, "triangle", 0.12), 160);
};

const playCountdownDink = () => {
  playTone(980, 0.08, "square", 0.08);
};

const playPlayerJoinSound = () => {
  playTone(520, 0.12, "sine", 0.11);
  window.setTimeout(() => playTone(780, 0.13, "sine", 0.1), 90);
};

const playPlayerLeaveSound = () => {
  playTone(420, 0.14, "triangle", 0.1);
  window.setTimeout(() => playTone(260, 0.16, "triangle", 0.09), 100);
};

const playMinPlayersFoundSound = () => {
  playTone(523, 0.12, "sawtooth", 0.11);
  window.setTimeout(() => playTone(659, 0.12, "sawtooth", 0.11), 110);
  window.setTimeout(() => playTone(784, 0.2, "sawtooth", 0.12), 220);
};
  // lobby state
  const [lobby, setLobby] = useState<Lobby | null>(null);
  const [players, setPlayers] = useState<LobbyPlayer[]>([]);
  const [lobbyLoading, setLobbyLoading] = useState(true);
  const [playerProfilesById, setPlayerProfilesById] = useState<
  Record<string, { displayName: string; rating: number }>
>({});
const [topTenUserIds, setTopTenUserIds] = useState<Set<string>>(new Set());
const [submittedUserIds, setSubmittedUserIds] = useState<Set<string>>(new Set());
const submittedUsersLoadedRef = useRef(false);
  const [lobbyError, setLobbyError] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [matchStarted, setMatchStarted] = useState(false);
  const [autoStartEta, setAutoStartEta] = useState<number | null>(null);
  const [debugStarting, setDebugStarting] = useState(false);
  const [debugError, setDebugError] = useState<string | null>(null);
  const [hostStartingBattle, setHostStartingBattle] = useState(false);
  const [hostEndingVoting, setHostEndingVoting] = useState(false);
  const [hostControlError, setHostControlError] = useState<string | null>(null);
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
  const [beatRightsConfirmed, setBeatRightsConfirmed] = useState(false);

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
  
  const [votingTimeLeft, setVotingTimeLeft] = useState<number>(VOTING_TIME);

  const battleDurationSeconds = lobby?.battle_duration_seconds ?? INITIAL_TIME;
  const battleDurationDisplay = formatDuration(battleDurationSeconds);
  const isCustomLobby = lobby?.mode === "custom" || requestedMode === "custom";
  const isRanked = !isCustomLobby;
  const isHostVoting = lobby?.voting_style === "host";
  const currentUserIsHost = !!currentUserId && currentUserId === lobby?.host_user_id;
  const customVotingOpen = isCustomLobby && lobby?.status === "voting";

  // leaving / penalty
  const [leaving, setLeaving] = useState(false);
  const [leaveError, setLeaveError] = useState<string | null>(null);

  // Reset all per-lobby client state whenever the URL changes to a different lobby.
  // This prevents a finished lobby's timer/phase/upload state from carrying into a new lobby.
  useEffect(() => {
    activeBattleIdRef.current = battleId;
    setLobby(null);
    setPlayers([]);
    setMatchStarted(false);
    setAutoStartEta(null);
    setDebugStarting(false);
    setDebugError(null);
    setHostStartingBattle(false);
    setHostEndingVoting(false);
    setHostControlError(null);
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
    setBeatRightsConfirmed(false);
    setUpdatingStats(false);
    setStatsUpdated(false);
    setSubmissions([]);
    setSubmittedUserIds(new Set());
    setTopTenUserIds(new Set());
    submittedUsersLoadedRef.current = false;
    setLoadingSubmissions(false);
    setVoteSubmitting(false);
    setVotedForUserId(null);
    setVoteError(null);
    setAllVotesIn(false);
    setVotingTimeLeft(VOTING_TIME);
    setLeaving(false);
    setLeaveError(null);
    previousPlayerIdsRef.current = new Set();
    playersLoadedOnceRef.current = false;
    lastLoadedPlayerProfileKeyRef.current = "";
    minPlayersSoundPlayedRef.current = false;
    finalCountdownPlayedForRef.current = new Set();
    warningTimerLastValueRef.current = null;
  }, [battleId]);

  // ───────────────── LOBBY: fetch & realtime ─────────────────
const loadPlayerNames = async (playerRows: LobbyPlayer[]) => {
  const userIds = Array.from(new Set(playerRows.map((p) => p.user_id)));

  if (userIds.length === 0) {
    setPlayerProfilesById({});
    return;
  }

  const { data, error } = await supabase
    .from("profiles")
    .select("id, display_name, rating")
    .in("id", userIds);

  if (error) {
    console.error("Failed to load player profiles:", error);
    return;
  }

  const { data: topTenProfiles, error: topTenError } = await supabase
    .from("profiles")
    .select("id")
    .order("rating", { ascending: false, nullsFirst: false })
    .limit(10);

  if (topTenError) {
    console.error("Failed to load top 10 profiles:", topTenError);
  } else {
    setTopTenUserIds(new Set((topTenProfiles ?? []).map((profile: any) => profile.id)));
  }

  const profileMap: Record<string, { displayName: string; rating: number }> = {};

  for (const profile of data ?? []) {
    profileMap[profile.id] = {
      displayName: profile.display_name || "Unnamed Producer",
      rating: profile.rating ?? 0,
    };
  }

  setPlayerProfilesById(profileMap);
};
  const applyLobbyState = (lobbyRow: Lobby) => {
    setLobby(lobbyRow);

    if (lobbyRow.status === "in_progress" && lobbyRow.battle_started_at) {
      setMatchStarted(true);
      setPhase("countdown");
    } else if (lobbyRow.status === "voting") {
      setMatchStarted(true);
      setPhase("results");
    } else if (lobbyRow.status === "finished") {
      setMatchStarted(true);
      setPhase("results");
      setAllVotesIn(true);
      router.push(`/battles/${battleId}/results`);
    } else {
      setMatchStarted(false);
      setPhase("countdown");
      setTimeLeft(lobbyRow.battle_duration_seconds ?? INITIAL_TIME);
    }
  };

  const refreshLobbyState = async (options?: { showLoading?: boolean }) => {
    if (!battleId) return;

    const showLoading = options?.showLoading ?? false;

    if (showLoading) {
      setLobbyLoading(true);
      setLobbyError(null);
    }

    try {
      const [authResult, lobbyResult, playersResult, submissionsResult] =
        await Promise.all([
          supabase.auth.getUser(),
          supabase.from("battle_lobbies").select("*").eq("id", battleId).single(),
          supabase
            .from("battle_lobby_players")
            .select("*")
            .eq("lobby_id", battleId)
            .is("left_at", null)
            .order("joined_at", { ascending: true }),
          supabase
            .from("battle_submissions")
            .select("user_id")
            .eq("battle_id", battleId),
        ]);

      if (activeBattleIdRef.current !== battleId) return;

      const authUserId = authResult.data.user?.id ?? null;
      setCurrentUserId(authUserId);

      const { data: lobbyData, error: lobbyErr } = lobbyResult;

      if (lobbyErr || !lobbyData) {
        console.error("Failed to refresh lobby:", lobbyErr);
        setLobbyError("Failed to load lobby.");
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

      applyLobbyState(lobbyRow);

      const { data: playersData, error: playersErr } = playersResult;

      if (playersErr) {
        console.error("Failed to refresh lobby players:", playersErr);
      } else if (playersData) {
        const playerRows = playersData as LobbyPlayer[];
        setPlayers(playerRows);

        const playerProfileKey = playerRows.map((player) => player.user_id).join("|");
        if (playerProfileKey !== lastLoadedPlayerProfileKeyRef.current) {
          lastLoadedPlayerProfileKeyRef.current = playerProfileKey;
          await loadPlayerNames(playerRows);
        }
      }

      const { data: submissionRows, error: submissionsErr } = submissionsResult;

      if (submissionsErr) {
        console.error("Failed to refresh submitted users:", submissionsErr);
      } else {
        const ids = new Set((submissionRows ?? []).map((row: any) => row.user_id));
        setSubmittedUserIds(ids);
        submittedUsersLoadedRef.current = true;

        setUploadDone(authUserId ? ids.has(authUserId) : false);

        if (authUserId) {
          const { data: voteRows, error: voteErr } = await supabase
            .from("battle_votes")
            .select("submission_user_id")
            .eq("battle_id", battleId)
            .eq("voter_id", authUserId)
            .limit(1);

          if (voteErr) {
            console.error("Failed to refresh vote state:", voteErr);
          } else {
            setVotedForUserId(voteRows?.[0]?.submission_user_id ?? null);
          }
        } else {
          setVotedForUserId(null);
        }
      }
    } finally {
      if (showLoading) {
        setLobbyLoading(false);
      }
    }
  };

  useEffect(() => {
    refreshLobbyState({ showLoading: true });
  }, [battleId]);


  // If someone opens a shared custom lobby link, add them to that lobby while it is still searching.
  useEffect(() => {
    if (!lobby || lobby.mode !== "custom" || lobby.status !== "searching") return;
    if (!currentUserId) return;
    if (players.some((player) => player.user_id === currentUserId)) return;

    let cancelled = false;

    const joinCustomLobbyFromLink = async () => {
      const { error } = await supabase.rpc("join_custom_battle_lobby", {
        p_lobby_id: battleId,
      });

      if (cancelled) return;

      if (error) {
        console.error("Failed to join custom lobby from link:", error);
        setLobbyError(error.message || "Could not join this custom lobby.");
        return;
      }

      await refreshLobbyState();
    };

    joinCustomLobbyFromLink();

    return () => {
      cancelled = true;
    };
  }, [battleId, lobby?.id, lobby?.mode, lobby?.status, currentUserId, players]);

  // Realtime is still used for fast updates, but every realtime event now triggers
  // a full database refresh so missed fields and stale local state self-correct.
  useEffect(() => {
    if (!battleId) return;

    const handleRealtimeRefresh = () => {
      refreshLobbyState();
    };

    const handleSubmittedUser = (submittedUserId?: string) => {
      if (!submittedUserId) {
        refreshLobbyState();
        return;
      }

      setSubmittedUserIds((prev) => {
        const alreadySubmitted = prev.has(submittedUserId);
        const next = new Set(prev);
        next.add(submittedUserId);

        if (!alreadySubmitted && submittedUsersLoadedRef.current) {
          playSubmitDing();
        }

        return next;
      });

      refreshLobbyState();
    };

    const lobbyChannel = supabase
      .channel(`battle_lobbies:${battleId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "battle_lobbies",
          filter: `id=eq.${battleId}`,
        },
        handleRealtimeRefresh
      )
      .subscribe((status) => {
        if (
          status === "SUBSCRIBED" ||
          status === "CHANNEL_ERROR" ||
          status === "TIMED_OUT"
        ) {
          window.setTimeout(() => refreshLobbyState(), 500);
        }
      });

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
        handleRealtimeRefresh
      )
      .subscribe((status) => {
        if (
          status === "SUBSCRIBED" ||
          status === "CHANNEL_ERROR" ||
          status === "TIMED_OUT"
        ) {
          window.setTimeout(() => refreshLobbyState(), 500);
        }
      });

    const submissionsChannel = supabase
      .channel(`battle_submissions_live:${battleId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "battle_submissions",
          filter: `battle_id=eq.${battleId}`,
        },
        (payload) => {
          handleSubmittedUser((payload.new as { user_id?: string }).user_id);
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "battle_submissions",
          filter: `battle_id=eq.${battleId}`,
        },
        (payload) => {
          handleSubmittedUser((payload.new as { user_id?: string }).user_id);
        }
      )
      .subscribe((status) => {
        if (
          status === "SUBSCRIBED" ||
          status === "CHANNEL_ERROR" ||
          status === "TIMED_OUT"
        ) {
          window.setTimeout(() => refreshLobbyState(), 500);
        }
      });

    const votesChannel = supabase
      .channel(`battle_votes_live:${battleId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "battle_votes",
          filter: `battle_id=eq.${battleId}`,
        },
        handleRealtimeRefresh
      )
      .subscribe((status) => {
        if (
          status === "SUBSCRIBED" ||
          status === "CHANNEL_ERROR" ||
          status === "TIMED_OUT"
        ) {
          window.setTimeout(() => refreshLobbyState(), 500);
        }
      });

    return () => {
      supabase.removeChannel(lobbyChannel);
      supabase.removeChannel(playersChannel);
      supabase.removeChannel(submissionsChannel);
      supabase.removeChannel(votesChannel);
    };
  }, [battleId]);

  // Polling fallback: if Supabase realtime misses an update, the lobby fixes itself
  // within a few seconds instead of forcing players to manually refresh.
  useEffect(() => {
    if (!battleId) return;

    const interval = window.setInterval(() => {
      refreshLobbyState();
    }, 2500);

    return () => window.clearInterval(interval);
  }, [battleId]);

  // Browser tabs can sleep in the background. Refresh immediately when users come back.
  useEffect(() => {
    if (!battleId) return;

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        refreshLobbyState();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
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

  // Then run every 3 seconds while the user is on this lobby page
  const interval = setInterval(advanceLobbies, 3000);

  return () => clearInterval(interval);
}, [battleId]);

// Keep this player marked as active while they are inside the lobby.
// This lets Supabase clean up players who close the tab or disconnect.
useEffect(() => {
  if (!battleId) return;

  let cancelled = false;

  const heartbeat = async () => {
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (cancelled || userError || !user) return;

    const { error } = await supabase
      .from("battle_lobby_players")
      .update({
        last_seen_at: new Date().toISOString(),
      })
      .eq("lobby_id", battleId)
      .eq("user_id", user.id)
      .is("left_at", null);

    if (error) {
      console.error("Failed to update lobby heartbeat:", error);
    }
  };

  heartbeat();

  const interval = window.setInterval(heartbeat, 15000);

  return () => {
    cancelled = true;
    window.clearInterval(interval);
  };
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
      setTimeLeft(battleDurationSeconds);

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

  const handleHostStartCustomBattle = async () => {
    if (!lobby) return;

    setHostControlError(null);

    if (!isCustomLobby) {
      setHostControlError("Only custom lobbies can be started manually.");
      return;
    }

    if (!currentUserIsHost) {
      setHostControlError("Only the host can start this custom battle.");
      return;
    }

    if (playerCount < 2) {
      setHostControlError("At least 2 players are required to start a custom battle.");
      return;
    }

    setHostStartingBattle(true);

    try {
      const { error } = await supabase.rpc("start_custom_battle", {
        p_lobby_id: battleId,
      });

      if (error) {
        console.error("start_custom_battle error:", error);
        throw new Error(error.message || "Failed to start custom battle.");
      }

      await refreshLobbyState();
    } catch (err: any) {
      console.error("Unexpected start_custom_battle error:", err);
      setHostControlError(err.message || "Failed to start custom battle.");
    } finally {
      setHostStartingBattle(false);
    }
  };

  const handleHostEndCustomVoting = async () => {
    if (!lobby) return;

    setHostControlError(null);

    if (!isCustomLobby) {
      setHostControlError("Only custom lobby voting can be ended manually.");
      return;
    }

    if (!currentUserIsHost) {
      setHostControlError("Only the host can end voting.");
      return;
    }

    if (lobby.status !== "voting") {
      setHostControlError("This battle is not currently in voting.");
      return;
    }

    setHostEndingVoting(true);

    try {
      const { error } = await supabase.rpc("end_custom_voting", {
        p_lobby_id: battleId,
      });

      if (error) {
        console.error("end_custom_voting error:", error);
        throw new Error(error.message || "Failed to end voting.");
      }

      setAllVotesIn(true);
      router.push(`/battles/${battleId}/results`);
    } catch (err: any) {
      console.error("Unexpected end_custom_voting error:", err);
      setHostControlError(err.message || "Failed to end voting.");
    } finally {
      setHostEndingVoting(false);
    }
  };

  // ───────────────── SAMPLE FETCH ─────────────────

  // When match has started, load the battle sample.
  // Custom host-uploaded samples are already saved on the lobby.
  // Random samples still use the API, which also saves the selected random sample on the lobby.
  useEffect(() => {
    const startIso = lobby?.battle_started_at ?? debugStartTime;
    if (!matchStarted || !startIso) return;

    const fetchSample = async () => {
      try {
        setSampleLoading(true);
        setSampleError(null);

        if (lobby?.sample_name && lobby?.sample_url) {
          setSampleName(lobby.sample_name);
          setSampleUrl(lobby.sample_url);
          return;
        }

        if (lobby?.sample_source === "host_upload") {
          throw new Error("The host-uploaded sample is missing. Ask the host to recreate the lobby.");
        }

        const res = await fetch(`/api/random-sample?battleId=${battleId}`);
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
  }, [battleId, matchStarted, lobby?.battle_started_at, lobby?.sample_name, lobby?.sample_url, lobby?.sample_source, debugStartTime]);

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
      setTimeLeft(battleDurationSeconds);
    }
  }, [lobby?.status, lobby?.battle_started_at, battleDurationSeconds]);

  // Compute timeLeft from:
  // 1) lobby.battle_started_at (real universal timer), OR
  // 2) debugStartTime (when you hit the debug button)
  useEffect(() => {
    const startIso = lobby?.battle_started_at ?? debugStartTime;

    if (!startIso) {
      setTimeLeft(battleDurationSeconds);
      return;
    }

    if (phase === "results") return;

    // Do not run the timer from an old DB value unless the lobby is actually in progress.
    if (!debugStartTime && lobby?.status !== "in_progress") {
      setTimeLeft(battleDurationSeconds);
      return;
    }

    const startMs = new Date(startIso).getTime();

    const tick = () => {
      const elapsed = Math.floor((Date.now() - startMs) / 1000);
      const remaining = battleDurationSeconds - elapsed;

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
  }, [lobby?.status, lobby?.battle_started_at, debugStartTime, phase, battleDurationSeconds]);

  useEffect(() => {
    if (!matchStarted || phase !== "countdown") {
      warningTimerLastValueRef.current = null;
      return;
    }

    const previousTimeLeft = warningTimerLastValueRef.current;
    warningTimerLastValueRef.current = timeLeft;

    // Arm the warning system on the first live tick without playing a catch-up sound.
    // This prevents users who reload at 0:45 from hearing the 1:00 and 0:50 alerts at once.
    if (previousTimeLeft === null) return;

    // If the timer resets upward for a new battle, clear the per-threshold warning memory.
    if (timeLeft > previousTimeLeft) {
      finalCountdownPlayedForRef.current = new Set();
      return;
    }

    const crossedWarnings = PRODUCTION_WARNING_SECONDS.filter(
      (warningSecond) =>
        previousTimeLeft > warningSecond &&
        timeLeft <= warningSecond &&
        timeLeft > 0 &&
        !finalCountdownPlayedForRef.current.has(warningSecond)
    );

    if (crossedWarnings.length === 0) return;

    // If a tab lags and crosses more than one threshold, play only the most urgent one.
    const warningSecond = crossedWarnings[crossedWarnings.length - 1];
    finalCountdownPlayedForRef.current.add(warningSecond);

    if (warningSecond === 60) {
      playOneMinuteWarningSound();
    } else {
      playCountdownDink();
    }
  }, [timeLeft, matchStarted, phase]);

  // Visible voting timer. The database is still the authority via voting_ends_at.
  useEffect(() => {
    if (phase !== "results" || lobby?.status === "finished") {
      setVotingTimeLeft(lobby?.status === "finished" ? 0 : VOTING_TIME);
      return;
    }

    if (isCustomLobby) {
      setVotingTimeLeft(VOTING_TIME);
      return;
    }

    if (!lobby?.voting_ends_at) {
      setVotingTimeLeft(VOTING_TIME);
      return;
    }

    const endMs = new Date(lobby.voting_ends_at).getTime();

    const tick = () => {
      const remaining = Math.max(Math.ceil((endMs - Date.now()) / 1000), 0);
      setVotingTimeLeft(remaining);
    };

    tick();
    const interval = setInterval(tick, 1000);

    return () => clearInterval(interval);
  }, [phase, lobby?.status, lobby?.voting_ends_at, isCustomLobby]);

  useEffect(() => {
    if (phase !== "results") return;

    const timeout = window.setTimeout(() => {
      votingSectionRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }, 250);

    return () => window.clearTimeout(timeout);
  }, [phase]);

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
  .eq("lobby_id", battleId)
  .is("left_at", null);

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

      if (!isCustomLobby && !error && count != null && !cancelled) {
        let effectiveVoteCount = count;
        let requiredVotes = submissions.length <= 1 ? 0 : submissions.length;

        if (isHostVoting) {
          requiredVotes = submissions.length <= 1 ? 0 : 1;

          const { count: hostVoteCount, error: hostVoteError } = await supabase
            .from("battle_votes")
            .select("id", { count: "exact", head: true })
            .eq("battle_id", battleId)
            .eq("voter_id", lobby?.host_user_id ?? "");

          if (hostVoteError) {
            console.error("Failed to check host vote count:", hostVoteError);
          } else {
            effectiveVoteCount = hostVoteCount ?? 0;
          }
        }

        if (submissions.length === 1 || effectiveVoteCount >= requiredVotes) {
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
  }, [phase, battleId, submissions.length, router, isHostVoting, lobby?.host_user_id, isCustomLobby]);

  const minutes = Math.floor(timeLeft / 60);
  const seconds = String(timeLeft % 60).padStart(2, "0");
  const roundTimerDisplay = `${minutes}:${seconds}`;
  const timerIsUrgent = matchStarted && phase === "countdown" && timeLeft <= 60 && timeLeft > 0;
  const votingMinutes = Math.floor(votingTimeLeft / 60);
  const votingSeconds = String(votingTimeLeft % 60).padStart(2, "0");
  const votingClosed = isCustomLobby
    ? lobby?.status === "finished"
    : votingTimeLeft <= 0 || lobby?.status === "finished";

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setUploadError(null);
    const f = e.target.files?.[0] ?? null;
    setFile(f);
    if (!f) setBeatRightsConfirmed(false);
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

    if (!beatRightsConfirmed) {
      setUploadError(
        "Please confirm that you created this beat or have permission to upload it before submitting."
      );
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
            rights_confirmed: true,
            rights_confirmed_at: new Date().toISOString(),
            rights_agreement_version: BATTLE_UPLOAD_RIGHTS_AGREEMENT_VERSION,
            rights_agreement_text: BATTLE_UPLOAD_RIGHTS_AGREEMENT,
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
      setSubmittedUserIds((prev) => {
        const next = new Set(prev);
        next.add(user.id);
        return next;
      });
      await refreshLobbyState();
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

    if (votingClosed) {
      setVoteError("Voting is closed for this battle.");
      return;
    }

    if (votedForUserId) {
      setVoteError("You already voted in this battle.");
      return;
    }

    if (isHostVoting && !currentUserIsHost) {
      setVoteError("This custom battle uses host voting. Only the host can choose the winner.");
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
      await refreshLobbyState();
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
        const { error: leaveErr } = await supabase
  .from("battle_lobby_players")
  .update({
    left_at: new Date().toISOString(),
  })
  .eq("lobby_id", battleId)
  .eq("user_id", user.id);
  if (leaveErr) {
  console.error("Failed to mark player as left:", leaveErr);
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
const submittedUserIdsFromLoadedSubmissions = new Set(
  submissions.map((s) => s.user_id)
);

const uniqueActivePlayers: LobbyPlayer[] = Array.from(
  new Map(players.map((p) => [p.user_id, p])).values()
);

const playersWithoutSubmissions: LobbyPlayer[] = uniqueActivePlayers.filter(
  (p) => !submittedUserIdsFromLoadedSubmissions.has(p.user_id)
);

const playerCount = uniqueActivePlayers.length;
const minPlayers = lobby?.min_players ?? 0;
const maxPlayers = lobby?.max_players ?? 0;
const playersNeeded = Math.max(minPlayers - playerCount, 0);
const queueReady = !!lobby && lobby.status === "searching" && playerCount >= minPlayers;
const queueFillPercent = minPlayers > 0 ? Math.min((playerCount / minPlayers) * 100, 100) : 0;
const lobbyCapacityPercent = maxPlayers > 0 ? Math.min((playerCount / maxPlayers) * 100, 100) : 0;
useEffect(() => {
  if (!lobby) return;

  const currentIds = new Set(uniqueActivePlayers.map((p) => p.user_id));
  const previousIds = previousPlayerIdsRef.current;

  if (!playersLoadedOnceRef.current) {
    previousPlayerIdsRef.current = currentIds;
    playersLoadedOnceRef.current = true;
    return;
  }

  const joined = Array.from(currentIds).filter((id) => !previousIds.has(id));
  const left = Array.from(previousIds).filter((id) => !currentIds.has(id));

  if (lobby.status === "searching") {
    if (
      playerCount >= minPlayers &&
      minPlayers > 0 &&
      !minPlayersSoundPlayedRef.current
    ) {
      playMinPlayersFoundSound();
      minPlayersSoundPlayedRef.current = true;
    } else if (joined.length > 0 && playerCount > minPlayers) {
      playPlayerJoinSound();
    }

    if (left.length > 0) {
      playPlayerLeaveSound();
    }

    if (playerCount < minPlayers) {
      minPlayersSoundPlayedRef.current = false;
    }
  }

  previousPlayerIdsRef.current = currentIds;
}, [lobby, playerCount, minPlayers, uniqueActivePlayers]);

  // ───────────────── RENDER ─────────────────

  return (
    <div className="card battle-lobby-card">
      <section className="battle-lobby-hero">
        <div className="battle-lobby-hero-copy">
          <div className="battle-lobby-hero-topline">
            <span className="battle-lobby-eyebrow">Live battle room</span>
            <span
              className={`battle-lobby-mode-pill ${
                isRanked
                  ? "battle-lobby-mode-pill-ranked"
                  : "battle-lobby-mode-pill-custom"
              }`}
            >
              {isRanked ? "Ranked Battle" : "Custom Battle"}
            </span>
          </div>

          <h2 className="battle-lobby-title">Battle Lobby</h2>
        </div>

        <div className="battle-lobby-hero-side">
          <div className="battle-lobby-id-card">
            <span className="battle-lobby-id-label">Lobby ID</span>
            <code className="battle-lobby-id-value">{battleId}</code>
          </div>

        </div>
      </section>

      {/* LOBBY INFO */}
      <div className="sample-box battle-lobby-status-box" style={{ marginBottom: 16 }}>
        {lobbyLoading && <p>Loading lobby...</p>}
        {lobbyError && <p style={{ color: "#f97373" }}>{lobbyError}</p>}
        {!lobbyLoading && !lobbyError && lobby && (
          <>
            <div className="battle-lobby-status-heading-row">
              <div>
                <p className="battle-lobby-section-label">Lobby status</p>
                <h3 className="battle-lobby-status-title">
                  {matchStarted
                    ? "Battle in progress"
                    : isCustomLobby && currentUserIsHost && playerCount >= 2
                    ? "Ready to start"
                    : isCustomLobby
                    ? "Waiting for host"
                    : queueReady
                    ? "Queue ready"
                    : "Waiting for players"}
                </h3>
              </div>

              {matchStarted && phase !== "results" ? (
                <div
                  className={`battle-lobby-top-timer ${
                    timerIsUrgent ? "battle-lobby-top-timer-urgent" : ""
                  }`}
                >
                  <span>Round timer</span>
                  <strong>{roundTimerDisplay}</strong>
                </div>
              ) : (
                <div className="battle-lobby-status-chip">
                  {isCustomLobby
                    ? currentUserIsHost
                      ? playerCount >= 2
                        ? "Host controls start"
                        : `${Math.max(2 - playerCount, 0)} needed`
                      : "Waiting for host"
                    : queueReady
                    ? `Auto-start in ${formatQueueEta(autoStartEta)}`
                    : `${playersNeeded} needed`}
                </div>
              )}
            </div>

            <div className="battle-lobby-stat-grid">
              <div className="battle-lobby-stat-card">
                <span className="battle-lobby-stat-label">Players</span>
                <strong className="battle-lobby-stat-value">
                  {playerCount}
                  <span>/{lobby.max_players}</span>
                </strong>
              </div>

              <div
                className={`battle-lobby-stat-card battle-lobby-stat-card-timer ${
                  timerIsUrgent ? "battle-lobby-stat-card-timer-urgent" : ""
                }`}
              >
                <span className="battle-lobby-stat-label">Round timer</span>
                <strong className="battle-lobby-stat-value battle-lobby-stat-value-text">
                  {matchStarted && phase !== "results" ? roundTimerDisplay : battleDurationDisplay}
                </strong>
              </div>

              <div className="battle-lobby-stat-card">
                <span className="battle-lobby-stat-label">Mode</span>
                <strong className="battle-lobby-stat-value battle-lobby-stat-value-text">
                  {isRanked ? "Ranked" : isHostVoting ? "Custom · Host vote" : "Custom"}
                </strong>
              </div>

              <div className="battle-lobby-stat-card">
                <span className="battle-lobby-stat-label">Status</span>
                <strong className="battle-lobby-stat-value battle-lobby-stat-value-text">
                  {matchStarted
                    ? "Live"
                    : isCustomLobby
                    ? currentUserIsHost && playerCount >= 2
                      ? "Ready"
                      : "Waiting"
                    : queueReady
                    ? "Ready"
                    : "Queued"}
                </strong>
              </div>
            </div>

            <div className="battle-lobby-player-list-card">
              <div className="battle-lobby-player-list-head">
                <p className="battle-lobby-section-label">Players in lobby</p>
                <span className="battle-lobby-player-count-note">{playerCount} active</span>
              </div>

              <div className="battle-lobby-player-chip-row">
                {uniqueActivePlayers.map((player, index) => {
                  const profile = playerProfilesById[player.user_id];
                  const displayName = profile?.displayName ?? `Player ${index + 1}`;
                  const rating = profile?.rating ?? 0;
                  const ratingRank = getRankFromRating(rating);
                  const rank = topTenUserIds.has(player.user_id) ? "Top 10" : ratingRank;
                  const rankTheme = getRankTheme(rank);
                  const hasSubmitted = submittedUserIds.has(player.user_id);

                  return (
                    <span
                      key={player.user_id}
                      className={`battle-lobby-player-chip ${
                        hasSubmitted ? "battle-lobby-player-chip-submitted" : ""
                      }`}
                      title={hasSubmitted ? "Beat submitted" : "Waiting for submission"}
                    >
                      <span
                        className="battle-lobby-rank-pill"
                        style={{
                          color: rankTheme.text,
                          borderColor: rankTheme.border,
                          background: rankTheme.background,
                          boxShadow: rankTheme.glow,
                        }}
                      >
                        {rank}
                      </span>
                      <span className="battle-lobby-player-name">{displayName}</span>
                      {hasSubmitted && <span className="battle-lobby-submitted-check">✓</span>}
                    </span>
                  );
                })}
              </div>
            </div>

            {lobby.status === "searching" && !matchStarted && (
              <div className="battle-lobby-matchmaking-card">
                <div className="battle-lobby-matchmaking-head">
                  <div>
                    <p className="battle-lobby-section-label">Matchmaking</p>
                    <h4 className="battle-lobby-matchmaking-title">
                      {isCustomLobby
                        ? currentUserIsHost
                          ? playerCount >= 2
                            ? "Ready when you are"
                            : `Need ${Math.max(2 - playerCount, 0)} more player${
                                Math.max(2 - playerCount, 0) === 1 ? "" : "s"
                              }`
                          : "Waiting for host"
                        : queueReady
                        ? `Starting in ${formatQueueEta(autoStartEta)}`
                        : `Need ${playersNeeded} more player${playersNeeded === 1 ? "" : "s"}`}
                    </h4>
                  </div>

                  <div className="battle-lobby-mini-queue-box">
                    <span className="battle-lobby-mini-queue-label">Queue</span>
                    <strong className="battle-lobby-mini-queue-value">
                      {playerCount}/{lobby.min_players}
                    </strong>
                  </div>
                </div>

                <div className="battle-lobby-progress-block">
                  <div className="battle-lobby-progress-topline">
                    <span>Minimum players</span>
                    <span>{Math.round(queueFillPercent)}%</span>
                  </div>
                  <div className="battle-lobby-progress-track">
                    <div
                      className="battle-lobby-progress-fill battle-lobby-progress-fill-primary"
                      style={{ width: `${queueFillPercent}%` }}
                    />
                  </div>
                </div>

                <div className="battle-lobby-progress-block">
                  <div className="battle-lobby-progress-topline">
                    <span>Lobby capacity</span>
                    <span>
                      {playerCount}/{lobby.max_players}
                    </span>
                  </div>
                  <div className="battle-lobby-progress-track battle-lobby-progress-track-secondary">
                    <div
                      className="battle-lobby-progress-fill battle-lobby-progress-fill-secondary"
                      style={{ width: `${lobbyCapacityPercent}%` }}
                    />
                  </div>
                </div>

                <p className="battle-lobby-matchmaking-footnote">
                  {isCustomLobby
                    ? currentUserIsHost
                      ? playerCount >= 2
                        ? "Minimum players reached. Start the custom battle whenever you are ready."
                        : "Custom battles require at least 2 active players before the host can start."
                      : "This is a custom lobby. The battle will begin when the host starts it."
                    : queueReady
                    ? `Minimum players reached. The battle will start automatically in ${formatQueueEta(autoStartEta)} or immediately if the lobby fills to ${lobby.max_players}.`
                    : `The queue will begin once at least ${lobby.min_players} players have joined. The lobby can hold up to ${lobby.max_players} players.`}
                </p>

                {isCustomLobby && (
                  <div
                    style={{
                      marginTop: 16,
                      padding: "14px",
                      border: "1px solid rgba(255,255,255,0.12)",
                      background: "rgba(0,0,0,0.22)",
                      borderRadius: 14,
                    }}
                  >
                    {currentUserIsHost ? (
                      <>
                        <button
                          type="button"
                          className="btn-primary"
                          onClick={handleHostStartCustomBattle}
                          disabled={hostStartingBattle || playerCount < 2}
                        >
                          {hostStartingBattle
                            ? "Starting Battle..."
                            : playerCount < 2
                            ? "Need 2 Players"
                            : "Start Battle"}
                        </button>

                        <p
                          style={{
                            margin: "10px 0 0",
                            color: "var(--muted)",
                            fontSize: "0.9rem",
                            lineHeight: 1.5,
                          }}
                        >
                          {playerCount < 2
                            ? "Invite at least one more player before starting."
                            : "Starting the battle locks the lobby and begins the production timer."}
                        </p>
                      </>
                    ) : (
                      <p
                        style={{
                          margin: 0,
                          color: "var(--muted)",
                          fontSize: "0.95rem",
                          lineHeight: 1.5,
                        }}
                      >
                        Waiting for the host to start the battle.
                      </p>
                    )}

                    {hostControlError && (
                      <p
                        style={{
                          margin: "10px 0 0",
                          color: "#f97373",
                          fontSize: "0.9rem",
                          lineHeight: 1.5,
                        }}
                      >
                        {hostControlError}
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}

            {matchStarted && (
              <p style={{ fontSize: "0.9rem", color: "#22c55e" }}>
                Battle has started!
              </p>
            )}
          </>
        )}
      </div>

      {/* PRODUCTION / UPLOAD PHASE */}
      {matchStarted && phase !== "results" && (
        <section className="battle-production-panel">
          <div className="battle-production-topbar">
            <div>
              <p className="battle-lobby-section-label">Production phase</p>
              <h3 className="battle-production-title">Make your beat</h3>
            </div>

            <div
              className={`battle-production-timer ${
                timerIsUrgent ? "battle-production-timer-urgent" : ""
              }`}
            >
              <span>Time left</span>
              <strong>{roundTimerDisplay}</strong>
            </div>
          </div>

          <p className="battle-production-description">
            Use the shared sample below, create your clip in FL Studio, and upload before the timer ends.
          </p>

          <div className="battle-production-grid">
            <div className="battle-sample-card">
              <div className="battle-sample-card-head">
                <div>
                  <p className="battle-lobby-section-label">Battle sample</p>
                  <h4>Sample for this battle</h4>
                </div>
                {sampleUrl && <span className="battle-sample-ready-chip">Ready</span>}
              </div>

              {sampleLoading && (
                <p className="battle-production-muted">Loading sample...</p>
              )}

              {sampleError && (
                <p className="battle-production-error">
                  Failed to load sample: {sampleError}
                </p>
              )}

              {!sampleLoading && !sampleError && sampleUrl && (
                <>
                  <p className="battle-sample-file-name">
                    {sampleName}
                  </p>

                  <audio controls className="battle-audio-player">
                    <source src={sampleUrl} />
                    Your browser does not support the audio element.
                  </audio>

                  <p className="battle-production-muted">
                    Download the sample and drop it into FL Studio to start your beat.
                  </p>
                </>
              )}
            </div>

            <div className="battle-upload-card">
              <div className="battle-upload-card-head">
                <div>
                  <p className="battle-lobby-section-label">Submission</p>
                  <h4>Upload your track</h4>
                </div>
                <span className={uploadDone ? "battle-upload-status-chip battle-upload-status-done" : "battle-upload-status-chip"}>
                  {uploadDone ? "Uploaded" : uploadWindowOpen ? "Open" : "Closed"}
                </span>
              </div>

              <p className="battle-production-muted">
                Accepted: mp3, wav, and other audio files. You can replace your upload while the production timer is open.
              </p>

              <div className="battle-file-input-wrap">
                <input
                  type="file"
                  accept="audio/*"
                  onChange={handleFileChange}
                  disabled={!uploadWindowOpen || uploading || uploadDone}
                />
              </div>

              <label className="battle-upload-rights-check">
                <input
                  type="checkbox"
                  checked={beatRightsConfirmed}
                  onChange={(event) => setBeatRightsConfirmed(event.target.checked)}
                  disabled={!uploadWindowOpen || uploading || uploadDone || !file}
                />
                <span>{BATTLE_UPLOAD_RIGHTS_AGREEMENT}</span>
              </label>

              <button
                onClick={handleUpload}
                className="btn-primary battle-upload-button"
                disabled={
                  !uploadWindowOpen ||
                  uploading ||
                  uploadDone ||
                  !file ||
                  !beatRightsConfirmed
                }
              >
                {uploading ? "Uploading..." : uploadDone ? "Uploaded" : "Upload Track"}
              </button>

              {uploadError && (
                <p className="battle-production-error">{uploadError}</p>
              )}

              {!uploadWindowOpen && !uploadDone && (
                <p className="battle-production-error">
                  Upload window has closed for this battle.
                </p>
              )}

              {uploadDone && (
                <p className="battle-production-success">
                  Upload successful. Voting phase will begin shortly.
                </p>
              )}
            </div>
          </div>
        </section>
      )}

      {/* RESULTS PHASE */}
      {matchStarted && phase === "results" && (
        <section
          ref={votingSectionRef}
          className="battle-voting-panel"
          style={{
            scrollMarginTop: 96,
            marginTop: 18,
            padding: "16px",
            border: "1px solid rgba(34, 197, 94, 0.35)",
            background:
              "linear-gradient(180deg, rgba(34,197,94,0.10), rgba(0,0,0,0.18))",
            boxShadow: "0 0 30px rgba(34,197,94,0.10)",
          }}
        >
          <p className="highlight">Results / Voting</p>

          <p
            style={{
              fontSize: "1.1rem",
              fontWeight: 800,
              color: votingClosed
                ? "#f97373"
                : isCustomLobby
                ? "#22c55e"
                : votingTimeLeft <= 30
                ? "#facc15"
                : "#22c55e",
              marginBottom: 8,
            }}
          >
            {votingClosed
              ? "Voting closed"
              : isCustomLobby
              ? currentUserIsHost
                ? "Voting is open — end it whenever you are ready."
                : "Voting is open — waiting for the host to end voting."
              : `Voting time left: ${votingMinutes}:${votingSeconds}`}
          </p>

          <p>
            {isHostVoting
              ? currentUserIsHost
                ? "Listen to each submission and choose the winner. This lobby uses host voting, so your vote decides the battle. Voting ends when you click End Voting."
                : "Listen to the submissions while the host chooses the winner. This lobby uses host voting."
              : isCustomLobby
              ? currentUserIsHost
                ? "Everyone can vote in this custom lobby. Voting has no timer — end it whenever you are ready."
                : "Listen to all submissions and cast your vote. Voting has no timer and ends when the host closes it."
              : "Listen to all submissions for this battle and cast your vote. You can only vote once per battle. Voting closes after 2 minutes and 30 seconds."}
          </p>

          {customVotingOpen && (
            <div
              style={{
                marginTop: 14,
                marginBottom: 14,
                padding: "14px",
                border: "1px solid rgba(140, 255, 107, 0.28)",
                background: "rgba(140, 255, 107, 0.08)",
                borderRadius: 14,
              }}
            >
              {currentUserIsHost ? (
                <>
                  <button
                    type="button"
                    className="btn-primary"
                    onClick={handleHostEndCustomVoting}
                    disabled={hostEndingVoting}
                  >
                    {hostEndingVoting ? "Ending Voting..." : "End Voting"}
                  </button>

                  <p
                    style={{
                      margin: "10px 0 0",
                      color: "var(--muted)",
                      fontSize: "0.9rem",
                      lineHeight: 1.5,
                    }}
                  >
                    This will finalize the custom battle and send everyone to results.
                  </p>
                </>
              ) : (
                <p
                  style={{
                    margin: 0,
                    color: "var(--muted)",
                    fontSize: "0.95rem",
                    lineHeight: 1.5,
                  }}
                >
                  Waiting for the host to end voting.
                </p>
              )}

              {hostControlError && (
                <p
                  style={{
                    margin: "10px 0 0",
                    color: "#f97373",
                    fontSize: "0.9rem",
                    lineHeight: 1.5,
                  }}
                >
                  {hostControlError}
                </p>
              )}
            </div>
          )}

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

<div
  style={{
    marginTop: 16,
    padding: "12px",
    border: "1px solid rgba(255,255,255,0.10)",
    background: "rgba(0,0,0,0.22)",
  }}
>
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
                  const canCurrentUserVote = !sub.isSelf && (!isHostVoting || currentUserIsHost);

                  return (
                    <div
                      key={sub.id}
                      className="sample-box"
                      style={{
                        marginBottom: 10,
                        padding: "12px 14px",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          gap: 12,
                          marginBottom: 8,
                        }}
                      >
                        <h3 style={{ margin: 0 }}>{label}</h3>

                        {canCurrentUserVote && (
                          <button
                            onClick={() => handleVote(sub)}
                            className="btn-secondary"
                            disabled={
                              votingClosed ||
                              voteSubmitting ||
                              (!!votedForUserId && !isVoted)
                            }
                          >
                            {isVoted ? "You voted for this" : votingClosed ? "Voting closed" : "Vote"}
                          </button>
                        )}

                        {sub.isSelf && (
                          <span
                            style={{
                              fontSize: "0.8rem",
                              color: "#9ca3af",
                              whiteSpace: "nowrap",
                            }}
                          >
                            Your track
                          </span>
                        )}

                        {isHostVoting && !currentUserIsHost && !sub.isSelf && (
                          <span
                            style={{
                              fontSize: "0.8rem",
                              color: "#9ca3af",
                              whiteSpace: "nowrap",
                            }}
                          >
                            Host vote only
                          </span>
                        )}
                      </div>

                      <audio
                        controls
                        style={{ width: "100%", marginTop: 4, height: 36 }}
                      >
                        <source src={sub.url} />
                        Your browser does not support the audio element.
                      </audio>
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
        </section>
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
