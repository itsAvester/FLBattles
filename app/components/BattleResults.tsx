"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabaseClient";

type ResultRow = {
  user_id: string;
  audio_url: string;
  votes: number;
  isSelf: boolean;
  displayName: string;
};

type BattleResultsProps = {
  battleId: string;
};

type LobbyResult = {
  winner_user_id: string | null;
  status: string | null;
  mode: string | null;
  created_at: string | null;
  finished_at: string | null;
};

function getOrdinal(place: number): string {
  if (place === 1) return "1st";
  if (place === 2) return "2nd";
  if (place === 3) return "3rd";
  return `${place}th`;
}

function getPodiumClass(place: number): string {
  if (place === 1) return "podium-card podium-card-first";
  if (place === 2) return "podium-card podium-card-second";
  if (place === 3) return "podium-card podium-card-third";
  return "podium-card";
}

export default function BattleResults({ battleId }: BattleResultsProps) {
  const router = useRouter();
  const [rows, setRows] = useState<ResultRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [winnerUserId, setWinnerUserId] = useState<string | null>(null);
  const [lobby, setLobby] = useState<LobbyResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);

      const {
        data: { user },
      } = await supabase.auth.getUser();
      const currentUserId = user?.id ?? null;

      const { data: lobbyData, error: lobbyErr } = await supabase
        .from("battle_lobbies")
        .select("winner_user_id, status, mode, created_at, finished_at")
        .eq("id", battleId)
        .single();

      if (lobbyErr) {
        console.error("Error loading lobby result:", lobbyErr);
      }

      if (lobbyData) {
        const lobbyRow = lobbyData as LobbyResult;
        setLobby(lobbyRow);
        setWinnerUserId(lobbyRow.winner_user_id);
      }

      const { data: submissions, error: subErr } = await supabase
        .from("battle_submissions")
        .select("id, user_id, audio_path, created_at")
        .eq("battle_id", battleId)
        .order("created_at", { ascending: true });

      if (subErr || !submissions) {
        console.error("Error loading submissions:", subErr);
        setError("Could not load battle submissions.");
        setLoading(false);
        return;
      }

      const { data: votes, error: voteErr } = await supabase
        .from("battle_votes")
        .select("submission_user_id")
        .eq("battle_id", battleId);

      if (voteErr || !votes) {
        console.error("Error loading votes:", voteErr);
        setError("Could not load battle votes.");
        setLoading(false);
        return;
      }

      const userIds = Array.from(
        new Set((submissions ?? []).map((submission: any) => submission.user_id))
      );

      let profileNameById = new Map<string, string>();

      if (userIds.length > 0) {
        const { data: profilesData, error: profilesError } = await supabase
          .from("profiles")
          .select("id, display_name")
          .in("id", userIds);

        if (profilesError) {
          console.error("Error loading result profiles:", profilesError);
        }

        profileNameById = new Map(
          (profilesData ?? []).map((profile: any) => [
            profile.id,
            profile.display_name || "Unnamed Producer",
          ])
        );
      }

      const voteCounts = new Map<string, number>();
      for (const vote of votes as any[]) {
        const key = vote.submission_user_id;
        voteCounts.set(key, (voteCounts.get(key) ?? 0) + 1);
      }

      const resultRows: ResultRow[] = (submissions as any[]).map((submission, index) => {
        const { data: urlData } = supabase.storage
          .from("battle-audio")
          .getPublicUrl(submission.audio_path);

        return {
          user_id: submission.user_id,
          audio_url: urlData.publicUrl,
          votes: voteCounts.get(submission.user_id) ?? 0,
          isSelf: currentUserId === submission.user_id,
          displayName:
            profileNameById.get(submission.user_id) ?? `Producer ${index + 1}`,
        };
      });

      resultRows.sort((a, b) => {
        if (b.votes !== a.votes) return b.votes - a.votes;
        if (a.user_id === lobbyData?.winner_user_id) return -1;
        if (b.user_id === lobbyData?.winner_user_id) return 1;
        return a.displayName.localeCompare(b.displayName);
      });

      setRows(resultRows);
      setLoading(false);
    };

    load();
  }, [battleId]);

  const totalVotes = useMemo(
    () => rows.reduce((sum, row) => sum + row.votes, 0),
    [rows]
  );

  const winner = useMemo(() => {
    if (winnerUserId) {
      return rows.find((row) => row.user_id === winnerUserId) ?? rows[0] ?? null;
    }

    return rows[0] ?? null;
  }, [rows, winnerUserId]);

  const podiumRows = useMemo(() => rows.slice(0, 3), [rows]);

  const podiumVisualOrder = useMemo(() => {
    const first = podiumRows[0];
    const second = podiumRows[1];
    const third = podiumRows[2];
    return [second, first, third].filter(Boolean) as ResultRow[];
  }, [podiumRows]);

  const winnerName = winner?.isSelf ? "You" : winner?.displayName ?? "No winner yet";
  const isRanked = lobby?.mode !== "custom";
  const hasTieForFirst = rows.length > 1 && rows[0]?.votes === rows[1]?.votes;

  if (loading) {
    return (
      <div className="card battle-results-shell">
        <div className="battle-results-loading">
          <div className="spinner" />
          <p>Loading battle results...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="card battle-results-shell">
      <section className="battle-results-hero">
        <div>
          <div className="battle-results-eyebrow-row">
            <span className="battle-results-eyebrow">Final results</span>
            <span
              className={`battle-results-mode-pill ${
                isRanked ? "battle-results-mode-ranked" : "battle-results-mode-custom"
              }`}
            >
              {isRanked ? "Ranked Battle" : "Custom Battle"}
            </span>
          </div>

          <h2>Battle Results</h2>
          <p>
            {rows.length > 0
              ? hasTieForFirst
                ? "Top submissions were tied on votes. Final placement follows the saved battle result."
                : `${winnerName} took the battle with ${winner?.votes ?? 0} vote${
                    winner?.votes === 1 ? "" : "s"
                  }.`
              : "No submissions were recorded for this battle."}
          </p>
        </div>

        <div className="battle-results-summary-grid">
          <div className="battle-results-summary-card">
            <span>Winner</span>
            <strong>{winnerName}</strong>
          </div>
          <div className="battle-results-summary-card">
            <span>Total votes</span>
            <strong>{totalVotes}</strong>
          </div>
          <div className="battle-results-summary-card">
            <span>Submissions</span>
            <strong>{rows.length}</strong>
          </div>
        </div>
      </section>

      {error && <div className="battle-results-error">{error}</div>}

      {rows.length === 0 ? (
        <div className="battle-results-empty">
          <h3>No submissions for this battle</h3>
          <p>This battle ended without any uploaded beats.</p>
          <button
            type="button"
            className="btn-secondary"
            onClick={() => router.push("/battles")}
          >
            Back to Battles
          </button>
        </div>
      ) : (
        <>
          <section className="battle-podium-section">
            <div className="battle-results-section-header">
              <span className="battle-results-eyebrow">Podium</span>
              <h3>Top producers</h3>
            </div>

            <div className="battle-podium-grid">
              {podiumVisualOrder.map((row) => {
                const actualPlace = rows.findIndex((r) => r.user_id === row.user_id) + 1;
                const votePercent = totalVotes > 0 ? Math.round((row.votes / totalVotes) * 100) : 0;
                const name = row.isSelf ? "You" : row.displayName;
                const isWinner = row.user_id === winner?.user_id;

                return (
                  <article
                    key={row.user_id}
                    className={`${getPodiumClass(actualPlace)} ${
                      isWinner ? "podium-card-winner" : ""
                    }`}
                  >
                    <div className="podium-place-badge">{getOrdinal(actualPlace)}</div>
                    <div className="podium-name-row">
                      <h4>{name}</h4>
                      {isWinner && <span className="podium-winner-pill">Winner</span>}
                    </div>
                    <p>
                      {row.votes} vote{row.votes === 1 ? "" : "s"} · {votePercent}% of total
                    </p>
                    <div className="podium-meter-track">
                      <div
                        className="podium-meter-fill"
                        style={{ width: `${votePercent}%` }}
                      />
                    </div>
                  </article>
                );
              })}
            </div>
          </section>

          <section className="battle-results-track-section">
            <div className="battle-results-section-header battle-results-track-header">
              <div>
                <span className="battle-results-eyebrow">All submissions</span>
                <h3>Playback and vote breakdown</h3>
              </div>

              <button
                type="button"
                className="btn-secondary"
                onClick={() => router.push("/battles")}
              >
                New Battle
              </button>
            </div>

            <div className="battle-results-track-list">
              {rows.map((row, index) => {
                const place = index + 1;
                const name = row.isSelf ? "You" : row.displayName;
                const votePercent = totalVotes > 0 ? Math.round((row.votes / totalVotes) * 100) : 0;
                const isWinner = row.user_id === winner?.user_id;

                return (
                  <article
                    key={row.user_id}
                    className={`battle-result-track-card ${
                      isWinner ? "battle-result-track-card-winner" : ""
                    }`}
                  >
                    <div className="battle-result-track-topline">
                      <div className="battle-result-rank-block">
                        <span className="battle-result-rank-number">#{place}</span>
                        <div>
                          <h4>
                            {isWinner ? "🏆 " : ""}
                            {name}
                          </h4>
                          <p>
                            {row.votes} vote{row.votes === 1 ? "" : "s"} · {votePercent}%
                          </p>
                        </div>
                      </div>

                      <div className="battle-result-vote-pill">
                        {row.votes} vote{row.votes === 1 ? "" : "s"}
                      </div>
                    </div>

                    <div className="battle-result-card-meter">
                      <div style={{ width: `${votePercent}%` }} />
                    </div>

                    <audio controls className="battle-result-audio-player">
                      <source src={row.audio_url} />
                      Your browser does not support the audio element.
                    </audio>
                  </article>
                );
              })}
            </div>
          </section>
        </>
      )}
    </div>
  );
}
