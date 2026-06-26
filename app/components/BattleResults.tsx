"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabaseClient";
import { BadgeIcon, getBadgeMeta } from "../../lib/badges";

type ResultRow = {
  user_id: string;
  audio_url: string;
  votes: number;
  isSelf: boolean;
  displayName: string;
  selectedBadgeKey: string | null;
};

type BadgeUnlockRow = {
  id: string;
  user_id: string;
  badge_key: string;
  unlocked_at: string;
  displayName: string;
  isSelf: boolean;
};

type BadgeUnlockHistoryRow = {
  id: string;
  user_id: string;
  badge_key: string;
  unlocked_at: string;
  battle_id?: string | null;
};

type BattleResultsProps = {
  battleId: string;
};

type LobbyResult = {
  winner_user_id: string | null;
  winner_vote_count: number | null;
  status: string | null;
  mode: string | null;
  sample_name: string | null;
  sample_url: string | null;
  created_at: string | null;
  finished_at: string | null;
  voting_style: "everyone" | "host" | null;
  host_user_id: string | null;
};

type VoteCountRow = {
  submission_user_id: string;
  votes: number | null;
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

function getBadgeUnlockKey(row: Pick<BadgeUnlockHistoryRow, "user_id" | "badge_key">) {
  return `${row.user_id}:${row.badge_key}`;
}

function getBadgeUnlockTime(value: string | null | undefined): number {
  const parsed = new Date(value ?? "").getTime();
  return Number.isFinite(parsed) ? parsed : Number.MAX_SAFE_INTEGER;
}


export default function BattleResults({ battleId }: BattleResultsProps) {
  const router = useRouter();
  const [rows, setRows] = useState<ResultRow[]>([]);
  const [badgeUnlocks, setBadgeUnlocks] = useState<BadgeUnlockRow[]>([]);
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
        .select("winner_user_id, winner_vote_count, status, mode, sample_name, sample_url, created_at, finished_at, voting_style, host_user_id")
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

      const { data: voteCountRows, error: voteErr } = await supabase
        .from("public_finished_battle_vote_counts")
        .select("submission_user_id, votes")
        .eq("battle_id", battleId);

      if (voteErr) {
        console.error("Error loading vote counts:", voteErr);
        setError("Could not load battle votes.");
        setLoading(false);
        return;
      }

      const { data: unlockRows, error: unlockError } = await supabase
        .from("battle_badge_unlocks")
        .select("id, user_id, badge_key, unlocked_at")
        .eq("battle_id", battleId)
        .order("unlocked_at", { ascending: true });

      if (unlockError) {
        console.error("Error loading badge unlocks:", unlockError);
      }

      const submissionUserIds = (submissions ?? []).map(
        (submission: any) => submission.user_id
      );

      const unlockUserIds = (unlockRows ?? []).map((unlock: any) => unlock.user_id);

      const userIds = Array.from(new Set([...submissionUserIds, ...unlockUserIds]));

      let profileById = new Map<
        string,
        { displayName: string; selectedBadgeKey: string | null }
      >();

      if (userIds.length > 0) {
        const { data: profilesData, error: profilesError } = await supabase
          .from("profiles")
          .select("id, display_name, selected_badge_key")
          .in("id", userIds);

        if (profilesError) {
          console.error("Error loading result profiles:", profilesError);
        }

        profileById = new Map(
          (profilesData ?? []).map((profile: any) => [
            profile.id,
            {
              displayName: profile.display_name || "Unnamed Producer",
              selectedBadgeKey: profile.selected_badge_key ?? null,
            },
          ])
        );
      }

      const currentBattleUnlockRows = (unlockRows ?? []) as BadgeUnlockHistoryRow[];
      let firstUnlockIdByUserBadge = new Map<string, string>();

      if (currentBattleUnlockRows.length > 0) {
        const badgeUnlockUserIds = Array.from(
          new Set(currentBattleUnlockRows.map((unlock) => unlock.user_id).filter(Boolean))
        );
        const badgeUnlockKeys = Array.from(
          new Set(currentBattleUnlockRows.map((unlock) => unlock.badge_key).filter(Boolean))
        );

        const { data: allUnlockRows, error: allUnlocksError } = await supabase
          .from("battle_badge_unlocks")
          .select("id, user_id, badge_key, unlocked_at, battle_id")
          .in("user_id", badgeUnlockUserIds)
          .in("badge_key", badgeUnlockKeys)
          .order("unlocked_at", { ascending: true });

        if (allUnlocksError) {
          console.error("Error loading badge unlock history:", allUnlocksError);
        }

        const unlockHistory = ((allUnlockRows ?? currentBattleUnlockRows) as BadgeUnlockHistoryRow[])
          .filter((unlock) => unlock.id && unlock.user_id && unlock.badge_key)
          .sort((a, b) => {
            const timeDiff = getBadgeUnlockTime(a.unlocked_at) - getBadgeUnlockTime(b.unlocked_at);
            if (timeDiff !== 0) return timeDiff;
            return String(a.id).localeCompare(String(b.id));
          });

        for (const unlock of unlockHistory) {
          const unlockKey = getBadgeUnlockKey(unlock);

          if (!firstUnlockIdByUserBadge.has(unlockKey)) {
            firstUnlockIdByUserBadge.set(unlockKey, unlock.id);
          }
        }
      }

      const visibleUnlockRows = currentBattleUnlockRows.filter((unlock) => {
        const firstUnlockId = firstUnlockIdByUserBadge.get(getBadgeUnlockKey(unlock));

        // If the history query fails, fall back to showing current-battle rows.
        // If it succeeds, only show the first-ever unlock for each player/badge pair.
        return !firstUnlockId || firstUnlockId === unlock.id;
      });

      const visibleUnlockKeys = new Set<string>();
      const formattedUnlocks: BadgeUnlockRow[] = [];

      for (const unlock of visibleUnlockRows) {
        const unlockKey = getBadgeUnlockKey(unlock);

        if (visibleUnlockKeys.has(unlockKey)) continue;
        visibleUnlockKeys.add(unlockKey);

        formattedUnlocks.push({
          id: unlock.id,
          user_id: unlock.user_id,
          badge_key: unlock.badge_key,
          unlocked_at: unlock.unlocked_at,
          displayName:
            profileById.get(unlock.user_id)?.displayName ?? "Unnamed Producer",
          isSelf: currentUserId === unlock.user_id,
        });
      }

      setBadgeUnlocks(formattedUnlocks);

      const voteCounts = new Map<string, number>();
      for (const voteRow of (voteCountRows ?? []) as VoteCountRow[]) {
        voteCounts.set(voteRow.submission_user_id, Number(voteRow.votes ?? 0));
      }

      const resultRows: ResultRow[] = (submissions as any[]).map(
        (submission, index) => {
          const { data: urlData } = supabase.storage
            .from("battle-audio")
            .getPublicUrl(submission.audio_path);

          const profile = profileById.get(submission.user_id);

          return {
            user_id: submission.user_id,
            audio_url: urlData.publicUrl,
            votes: voteCounts.get(submission.user_id) ?? 0,
            isSelf: currentUserId === submission.user_id,
            displayName: profile?.displayName ?? `Producer ${index + 1}`,
            selectedBadgeKey: profile?.selectedBadgeKey ?? null,
          };
        }
      );

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
  const isHostVote = lobby?.voting_style === "host";
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
                : isHostVote
                  ? `${winnerName} was selected by the host as the winner.`
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
            <span>{isHostVote ? "Voting style" : "Total votes"}</span>
            <strong>{isHostVote ? "Host" : totalVotes}</strong>
          </div>
          <div className="battle-results-summary-card">
            <span>Submissions</span>
            <strong>{rows.length}</strong>
          </div>
        </div>
      </section>

      {error && <div className="battle-results-error">{error}</div>}

      {badgeUnlocks.length > 0 && (
        <section
          style={{
            padding: "22px 28px",
            borderBottom: "1px solid var(--line)",
            background:
              "radial-gradient(circle at 0% 0%, rgba(140,255,107,0.08), transparent 34%), rgba(255,255,255,0.012)",
          }}
        >
          <div className="battle-results-section-header">
            <div>
              <span className="battle-results-eyebrow">Badge unlocks</span>
              <h3>New achievements earned</h3>
            </div>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(230px, 1fr))",
              gap: 12,
              marginTop: 14,
            }}
          >
            {badgeUnlocks.map((unlock) => {
              const badge = getBadgeMeta(unlock.badge_key);

              return (
                <article
                  key={unlock.id}
                  style={{
                    display: "flex",
                    gap: 12,
                    alignItems: "center",
                    padding: 14,
                    border: unlock.isSelf
                      ? "1px solid rgba(140,255,107,0.34)"
                      : "1px solid rgba(255,255,255,0.1)",
                    background: unlock.isSelf
                      ? "linear-gradient(90deg, rgba(140,255,107,0.09), rgba(255,255,255,0.025))"
                      : "rgba(255,255,255,0.025)",
                    borderRadius: 16,
                  }}
                >
                  <BadgeIcon badgeKey={unlock.badge_key} size={34} />

                  <div style={{ minWidth: 0 }}>
                    <p
                      style={{
                        margin: "0 0 4px",
                        color: "rgba(255,255,255,0.44)",
                        fontSize: "0.64rem",
                        fontWeight: 950,
                        textTransform: "uppercase",
                        letterSpacing: "0.13em",
                      }}
                    >
                      {unlock.isSelf ? "You unlocked" : `${unlock.displayName} unlocked`}
                    </p>

                    <strong
                      style={{
                        display: "block",
                        color: "var(--text)",
                        fontSize: "0.98rem",
                        lineHeight: 1.15,
                      }}
                    >
                      {badge.label}
                    </strong>

                    <span
                      style={{
                        display: "block",
                        marginTop: 4,
                        color: "rgba(255,255,255,0.56)",
                        fontSize: "0.78rem",
                        fontWeight: 700,
                        lineHeight: 1.35,
                      }}
                    >
                      {badge.description}
                    </span>
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      )}

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
              <h3>Top producers</h3>
            </div>

            <div className="battle-podium-grid">
              {podiumVisualOrder.map((row) => {
                const actualPlace =
                  rows.findIndex((r) => r.user_id === row.user_id) + 1;
                const votePercent =
                  totalVotes > 0 ? Math.round((row.votes / totalVotes) * 100) : 0;
                const name = row.isSelf ? "You" : row.displayName;
                const isWinner = row.user_id === winner?.user_id;
                const badge = getBadgeMeta(row.selectedBadgeKey);

                return (
                  <article
                    key={row.user_id}
                    className={`${getPodiumClass(actualPlace)} ${
                      isWinner ? "podium-card-winner" : ""
                    }`}
                  >
                    <div className="podium-place-badge">{getOrdinal(actualPlace)}</div>
                    <div className="podium-name-row">
                      <BadgeIcon badgeKey={row.selectedBadgeKey} size={34} />
                      <h4>{name}</h4>
                      {isWinner && <span className="podium-winner-pill">Winner</span>}
                    </div>
                    <p>
                      {isHostVote
                        ? row.user_id === winner?.user_id
                          ? "Host selection"
                          : "Not selected"
                        : `${row.votes} vote${row.votes === 1 ? "" : "s"} · ${votePercent}% of total`}
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
                const votePercent =
                  totalVotes > 0 ? Math.round((row.votes / totalVotes) * 100) : 0;
                const isWinner = row.user_id === winner?.user_id;
                const badge = getBadgeMeta(row.selectedBadgeKey);

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
                          <h4
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: 10,
                              flexWrap: "wrap",
                            }}
                          >
                            {isWinner ? "🏆" : ""}
                            <BadgeIcon badgeKey={row.selectedBadgeKey} size={34} />
                            {name}
                          </h4>
                          <p>
                            {isHostVote
                              ? row.user_id === winner?.user_id
                                ? "Host selection"
                                : "Not selected"
                              : `${row.votes} vote${row.votes === 1 ? "" : "s"} · ${votePercent}%`}
                          </p>
                        </div>
                      </div>

                      <div className="battle-result-vote-pill">
                        {isHostVote
                          ? row.user_id === winner?.user_id
                            ? "Host pick"
                            : "No"
                          : `${row.votes} vote${row.votes === 1 ? "" : "s"}`}
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