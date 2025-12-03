"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { supabase } from "../../lib/supabaseClient";

const INITIAL_TIME = 10 * 60; // 10 minutes in seconds

type Phase = "countdown" | "upload" | "results";

type BattleLobbyProps = {
  battleId: string;
  onLeave?: () => void; // <- make optional
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

export default function BattleLobby({ battleId, onLeave }: BattleLobbyProps) {
  const searchParams = useSearchParams();
  const router = useRouter();

  // DEBUG: see what battleId is when the component renders
  console.log("BattleLobby mounted with battleId:", battleId);

  // "mode" comes from /battles/[id]?mode=ranked or ?mode=custom
  const mode = searchParams.get("mode") ?? "ranked";
  const isRanked = mode !== "custom";

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

  // NEW: track when all votes are in
  const [allVotesIn, setAllVotesIn] = useState(false);

  // Fetch a random sample when lobby mounts
  useEffect(() => {
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
  }, []);

  // Timer countdown
  useEffect(() => {
    // stop timer once we hit results
    if (phase === "results") return;

    if (timeLeft <= 0) {
      // production time over, move to upload-only phase
      if (phase !== "upload") setPhase("upload");
      return;
    }

    const interval = setInterval(() => {
      setTimeLeft((t) => t - 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [phase, timeLeft]);

  // When we hit results, update user stats once (mock "played a battle")
  // Only for RANKED battles
  useEffect(() => {
    if (!isRanked) return; // 🚫 no rating updates in custom lobbies
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

        // Load existing profile
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

  // Load submissions: only one (latest) per user
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

      // Grab submissions ordered by newest first
      const { data, error } = await supabase
        .from("battle_submissions")
        .select("id, user_id, audio_path, created_at")
        .eq("battle_id", battleId)
        .order("created_at", { ascending: false });

      if (error || !data) {
        setLoadingSubmissions(false);
        return;
      }

      // Deduplicate by user_id – keep newest row per user
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

  // NEW: when in results, poll for votes; when all in => go to results page
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
        // Rule: we're "done" when number of votes >= number of submissions
        if (count >= submissions.length) {
          setAllVotesIn(true);
          router.push(`/battles/${battleId}/results`);
        }
      }
    };

    // check immediately then every 5s
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

    // ✅ critical: make sure battleId exists before hitting DB
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

    const uploadWindowOpen = phase !== "results" && timeLeft > 0;

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

      // Path in storage bucket
      const safeName = file.name.replace(/\s+/g, "_");
      const path = `${user.id}/${battleId}/${Date.now()}_${safeName}`;

      // 1) Upload to storage
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

      // 2) Record submission in DB
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
      // Move to results; the submissions effect will load all tracks
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
        // 23505 is Postgres unique violation (already voted)
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

  // DEBUG: simulate someone voting for your track
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
        voter_id: user.id, // for testing, we reuse your user as the voter
        submission_user_id: selfSub.user_id,
      });

      if (error) {
        setVoteError(error.message || "Failed to insert debug vote.");
        return;
      }

      // no change to votedForUserId, since this is "someone else" voting for you
    } finally {
      setVoteSubmitting(false);
    }
  };

  const uploadWindowOpen = phase !== "results" && timeLeft > 0;

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

      {/* TIMER */}
      {phase !== "results" && (
        <p className="highlight">
          Time left to produce: {minutes}:{seconds}
        </p>
      )}

      {/* COUNTDOWN & UPLOAD PHASES */}
      {(phase === "countdown" || phase === "upload") && (
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
      {phase === "results" && (
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
                        {/* Only show vote button for OTHER users' tracks */}
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

            {/* Debug button: simulate a vote for your own track */}
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

      <button
        onClick={() => {
          if (onLeave) onLeave();
          else router.push("/battles"); // default behavior: back to battles list
        }}
        className="btn-secondary leave-btn"
      >
        Leave Battle
      </button>
    </div>
  );
}
