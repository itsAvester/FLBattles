"use client";

import {
  useEffect,
  useMemo,
  useState,
  type CSSProperties,
  type FormEvent,
} from "react";
import Link from "next/link";
import { supabase } from "../../lib/supabaseClient";
import { BadgeIcon } from "../../lib/badges";

type LeaderRow = {
  id: string;
  display_name: string | null;
  rating: number | null;
  total_battles: number | null;
  win_rate: number | null;
  wins?: number | null;
  losses?: number | null;
  selected_badge_key: string | null;
  rank_change_7d?: number | null;
  is_new_this_season?: boolean | null;
  win_streak?: number | null;
  activity_rank?: number | null;
  season_badge_key?: string | null;
  season_badge_label?: string | null;
};

type BoardKind = "season" | "allTime";

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
    case "Champion":
    case "Season Champion":
    case "Top 10":
      return {
        text: "#1b120d",
        border: "rgba(255, 116, 67, 0.5)",
        background:
          "linear-gradient(90deg, rgba(255,77,28,0.94), rgba(246,198,91,0.9))",
      };
    case "Ruby":
      return {
        text: "#fecdd3",
        border: "rgba(244, 63, 94, 0.36)",
        background: "rgba(244, 63, 94, 0.11)",
      };
    case "Emerald":
      return {
        text: "#a7f3d0",
        border: "rgba(16, 185, 129, 0.32)",
        background: "rgba(16, 185, 129, 0.1)",
      };
    case "Diamond":
      return {
        text: "#ddd6fe",
        border: "rgba(139, 92, 246, 0.32)",
        background: "rgba(139, 92, 246, 0.1)",
      };
    case "Platinum":
      return {
        text: "#bae6fd",
        border: "rgba(14, 165, 233, 0.32)",
        background: "rgba(14, 165, 233, 0.1)",
      };
    case "Gold":
      return {
        text: "#fde68a",
        border: "rgba(246, 198, 91, 0.34)",
        background: "rgba(246, 198, 91, 0.1)",
      };
    case "Silver":
      return {
        text: "#d1d5db",
        border: "rgba(209, 213, 219, 0.24)",
        background: "rgba(209, 213, 219, 0.08)",
      };
    case "Bronze":
      return {
        text: "#d6a46a",
        border: "rgba(214, 164, 106, 0.26)",
        background: "rgba(214, 164, 106, 0.09)",
      };
    default:
      return {
        text: "#a1a1aa",
        border: "rgba(161, 161, 170, 0.2)",
        background: "rgba(161, 161, 170, 0.07)",
      };
  }
}

function getDisplayName(player: LeaderRow): string {
  return player.display_name || `Producer ${player.id.slice(0, 6).toUpperCase()}`;
}

function getSeasonInfo() {
  const now = new Date();
  const nextSeason = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  const daysRemaining = Math.max(
    1,
    Math.ceil((nextSeason.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
  );

  return {
    label: now.toLocaleDateString(undefined, {
      month: "long",
      year: "numeric",
    }),
    daysRemaining,
  };
}

function formatRating(rating: number | null) {
  return rating === null ? "Unranked" : Math.round(rating);
}

function formatWinRate(winRate: number | null) {
  return winRate === null ? "—" : `${Number(winRate).toFixed(1)}%`;
}

type SeasonSignal = {
  label: string;
  tone: "new" | "up" | "down" | "streak" | "badge";
};

function getSeasonSignals(player: LeaderRow): SeasonSignal[] {
  const signals: SeasonSignal[] = [];
  const rankChange = Number(player.rank_change_7d ?? 0);
  const streak = Number(player.win_streak ?? 0);

  if (player.is_new_this_season) {
    signals.push({ label: "New", tone: "new" });
  } else if (rankChange > 0) {
    signals.push({ label: `↑ ${rankChange}`, tone: "up" });
  } else if (rankChange < 0) {
    signals.push({ label: `↓ ${Math.abs(rankChange)}`, tone: "down" });
  }

  if (streak >= 2) {
    signals.push({ label: `${streak} win streak`, tone: "streak" });
  }

  if (player.season_badge_label) {
    signals.push({ label: player.season_badge_label, tone: "badge" });
  }

  return signals.slice(0, 3);
}

export default function LeaderboardPage() {
  const [activeBoard, setActiveBoard] = useState<BoardKind>("season");
  const [seasonRows, setSeasonRows] = useState<LeaderRow[]>([]);
  const [allTimeRows, setAllTimeRows] = useState<LeaderRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [searching, setSearching] = useState(false);

  const season = useMemo(() => getSeasonInfo(), []);

  const loadLeaderboards = async (term?: string) => {
    const cleanTerm = term?.trim() ?? "";

    setLoading(true);
    setErrorMsg(null);

    let seasonQuery = supabase
      .from("current_season_leaderboard")
      .select(
        "id, display_name, rating, total_battles, wins, losses, win_rate, selected_badge_key, rank_change_7d, is_new_this_season, win_streak, activity_rank, season_badge_key, season_badge_label"
      )
      .order("rating", { ascending: false })
      .order("wins", { ascending: false })
      .order("total_battles", { ascending: false })
      .limit(100);

    let allTimeQuery = supabase
      .from("profiles")
      .select(
        "id, display_name, rating, total_battles, wins, losses, win_rate, selected_badge_key"
      )
      .gt("total_battles", 0)
      .order("rating", { ascending: false })
      .order("total_battles", { ascending: false })
      .limit(100);

    if (cleanTerm) {
      seasonQuery = seasonQuery.ilike("display_name", `%${cleanTerm}%`);
      allTimeQuery = allTimeQuery.ilike("display_name", `%${cleanTerm}%`);
    }

    const [seasonResult, allTimeResult] = await Promise.all([
      seasonQuery,
      allTimeQuery,
    ]);

    if (seasonResult.error || allTimeResult.error) {
      setErrorMsg(
        seasonResult.error?.message ||
          allTimeResult.error?.message ||
          "Unable to load leaderboard."
      );
      setSeasonRows([]);
      setAllTimeRows([]);
    } else {
      setSeasonRows((seasonResult.data ?? []) as LeaderRow[]);
      setAllTimeRows((allTimeResult.data ?? []) as LeaderRow[]);
    }

    setLoading(false);
  };

  useEffect(() => {
    loadLeaderboards();

    const loadUser = async () => {
      const { data } = await supabase.auth.getUser();
      setCurrentUserId(data.user?.id ?? null);
    };

    loadUser();
  }, []);

  const handleSearch = async (event: FormEvent) => {
    event.preventDefault();

    const term = searchTerm.trim();
    setSearching(!!term);
    await loadLeaderboards(term);
  };

  const clearSearch = async () => {
    setSearchTerm("");
    setSearching(false);
    await loadLeaderboards();
  };

  const switchBoard = (board: BoardKind) => {
    setActiveBoard(board);
  };

  const activeRows = activeBoard === "season" ? seasonRows : allTimeRows;
  const activeCurrentUserIndex = !searching
    ? activeRows.findIndex((player) => player.id === currentUserId)
    : -1;
  const activeCurrentUserRank =
    activeCurrentUserIndex >= 0 ? activeCurrentUserIndex + 1 : null;

  const activeBoardCopy =
    activeBoard === "season"
      ? {
          eyebrow: `${season.label} Season`,
          title: "Current Season",
          description:
            "Monthly rankings reset at the start of each month. Compete now while the board is still moving.",
          primaryMetricLabel: "Points",
          poolLabel: "Season pool",
          poolValue: loading ? "—" : seasonRows.length,
          resetLabel: "Resets in",
          resetValue: `${season.daysRemaining}d`,
          thirdLabel: "Your rank",
          thirdValue: activeCurrentUserRank ? `#${activeCurrentUserRank}` : "—",
        }
      : {
          eyebrow: "Permanent leaderboard",
          title: "All-Time Hall of Fame",
          description:
            "The long-term board for producers with the strongest ranked record across every season.",
          primaryMetricLabel: "Rating",
          poolLabel: "All-time pool",
          poolValue: loading ? "—" : allTimeRows.length,
          resetLabel: "Format",
          resetValue: "Legacy",
          thirdLabel: "Your rank",
          thirdValue: activeCurrentUserRank ? `#${activeCurrentUserRank}` : "—",
        };

  return (
    <main className="leaderboard-app-page">
      <section className="page-inner leaderboard-app-shell">
        <header className="leaderboard-app-header">
          <div className="leaderboard-app-title-block">
            <div className="eyebrow leaderboard-app-eyebrow">
              <span className="eyebrow-dot" />
              Ranked producers
            </div>

            <h1>Leaderboard</h1>

            <p>
              Track the current monthly season, compare all-time legends, and jump
              straight back into ranked battles.
            </p>
          </div>

          <Link href="/battles" className="btn-primary leaderboard-app-cta">
            Enter Ranked Battle
          </Link>
        </header>

        {errorMsg && !loading && (
          <div className="leaderboard-message leaderboard-message-error">
            {errorMsg}
          </div>
        )}

        <nav className="leaderboard-app-tabs" aria-label="Leaderboard views">
          <button
            type="button"
            className={
              activeBoard === "season"
                ? "leaderboard-app-tab leaderboard-app-tab-active"
                : "leaderboard-app-tab"
            }
            onClick={() => switchBoard("season")}
            aria-pressed={activeBoard === "season"}
          >
            <span className="leaderboard-app-tab-index">01</span>

            <span className="leaderboard-app-tab-copy">
              <strong>Current season</strong>
              <em>Monthly points · resets in {season.daysRemaining}d</em>
            </span>
          </button>

          <button
            type="button"
            className={
              activeBoard === "allTime"
                ? "leaderboard-app-tab leaderboard-app-tab-active"
                : "leaderboard-app-tab"
            }
            onClick={() => switchBoard("allTime")}
            aria-pressed={activeBoard === "allTime"}
          >
            <span className="leaderboard-app-tab-index">02</span>

            <span className="leaderboard-app-tab-copy">
              <strong>All-time board</strong>
              <em>Permanent rating · legacy ranks</em>
            </span>
          </button>
        </nav>

        <section className="leaderboard-app-panel">
          <div className="leaderboard-app-panel-inner">
            <div className="leaderboard-app-panel-main">
              <span className="leaderboard-app-pill">{activeBoardCopy.eyebrow}</span>

              <h2>{activeBoardCopy.title}</h2>

              <p>{activeBoardCopy.description}</p>

              <form onSubmit={handleSearch} className="leaderboard-app-search">
                <input
                  type="text"
                  placeholder="Search players by name."
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                />

                <button type="submit" className="btn-secondary">
                  {loading && searching ? "Searching..." : "Search"}
                </button>

                {searching && (
                  <button type="button" className="btn-secondary" onClick={clearSearch}>
                    Clear
                  </button>
                )}
              </form>
            </div>

            <div className="leaderboard-app-meta-stack">
              <div className="leaderboard-app-meta-grid">
                <StatTile label={activeBoardCopy.poolLabel} value={activeBoardCopy.poolValue} />
                <StatTile label={activeBoardCopy.resetLabel} value={activeBoardCopy.resetValue} />
                <StatTile label={activeBoardCopy.thirdLabel} value={activeBoardCopy.thirdValue} />
              </div>

              <div className="leaderboard-app-chip-row">
                {activeBoard === "season" ? (
                  <>
                    <span>New players</span>
                    <span>Rank movement</span>
                    <span>Win streaks</span>
                  </>
                ) : (
                  <>
                    <span>Permanent stats</span>
                    <span>Legacy rating</span>
                    <span>Career battles</span>
                  </>
                )}
              </div>
            </div>
          </div>
        </section>

        <LeaderboardBoard
          kind={activeBoard}
          rows={activeRows}
          loading={loading}
          searching={searching}
          currentUserId={currentUserId}
          primaryMetricLabel={activeBoardCopy.primaryMetricLabel}
          emptyMessage={
            searching
              ? `No ${
                  activeBoard === "season" ? "current-season" : "all-time"
                } players matched that search.`
              : activeBoard === "season"
                ? "No ranked battles have been counted for this season yet."
                : "No all-time ranked players found."
          }
        />
      </section>
    </main>
  );
}

function LeaderboardBoard({
  kind,
  rows,
  loading,
  searching,
  currentUserId,
  primaryMetricLabel,
  emptyMessage,
}: {
  kind: BoardKind;
  rows: LeaderRow[];
  loading: boolean;
  searching: boolean;
  currentUserId: string | null;
  primaryMetricLabel: string;
  emptyMessage: string;
}) {
  const rankedRows = useMemo(() => rows, [rows]);
  const podiumRows = !searching ? rankedRows.slice(0, 3) : [];
  const tableRows = !searching ? rankedRows.slice(3) : rankedRows;

  return (
    <section className={`leaderboard-app-board leaderboard-app-board-${kind}`}>
      {!loading && podiumRows.length > 0 && (
        <div className="leaderboard-app-podium-grid">
          {podiumRows.map((player, index) => (
            <PodiumCard
              key={`${kind}-${player.id}`}
              player={player}
              rank={index + 1}
              kind={kind}
            />
          ))}
        </div>
      )}

      <LeaderboardTable
        kind={kind}
        rows={tableRows}
        loading={loading}
        currentUserId={currentUserId}
        emptyMessage={emptyMessage}
        startRank={!searching ? 4 : 1}
        primaryMetricLabel={primaryMetricLabel}
      />
    </section>
  );
}

function PodiumCard({
  player,
  rank,
  kind,
}: {
  player: LeaderRow;
  rank: number;
  kind: BoardKind;
}) {
  const isChampion = rank === 1;
  const statusLabel =
    rank === 1
      ? kind === "season"
        ? "Season Champion"
        : "Champion"
      : rank <= 10
        ? "Top 10"
        : getRankFromRating(player.rating);

  return (
    <Link
      href={`/players/${player.id}`}
      className={`leaderboard-app-podium-card ${
        isChampion ? "leaderboard-app-podium-card-champion" : ""
      }`}
    >
      <div className="leaderboard-app-podium-bg-number">{rank}</div>

      <div className="leaderboard-app-podium-topline">
        <span className="leaderboard-app-rank-bubble">#{rank}</span>
        <BadgeIcon badgeKey={player.selected_badge_key} size={30} />
      </div>

      <div className="leaderboard-app-podium-body">
        <RankPill label={statusLabel} />

        <h3>{getDisplayName(player)}</h3>

        <SeasonSignalRow kind={kind} player={player} />

        <div className="leaderboard-app-mini-stat-grid">
          <MiniStat label={kind === "season" ? "Points" : "Rating"} value={formatRating(player.rating)} />
          <MiniStat label="WR" value={formatWinRate(player.win_rate)} />
          <MiniStat label="Battles" value={player.total_battles ?? 0} />
        </div>
      </div>
    </Link>
  );
}

function LeaderboardTable({
  kind,
  rows,
  loading,
  currentUserId,
  emptyMessage,
  startRank,
  primaryMetricLabel,
}: {
  kind: BoardKind;
  rows: LeaderRow[];
  loading: boolean;
  currentUserId: string | null;
  emptyMessage: string;
  startRank: number;
  primaryMetricLabel: string;
}) {
  return (
    <div className="leaderboard-app-table-card">
      {loading && (
        <p className="leaderboard-message">
          Loading {kind === "season" ? "current season" : "all-time"} leaderboard...
        </p>
      )}

      {!loading && rows.length === 0 && (
        <p className="leaderboard-message">{emptyMessage}</p>
      )}

      {!loading && rows.length > 0 && (
        <div className="leaderboard-table-wrap leaderboard-app-table-wrap">
          <table>
            <thead>
              <tr>
                <th style={thLeftStyle}>#</th>
                <th style={thLeftStyle}>Producer</th>
                <th style={thRightStyle}>{primaryMetricLabel}</th>
                <th style={thRightStyle}>Win Rate</th>
                <th style={thRightStyle}>Battles</th>
              </tr>
            </thead>

            <tbody>
              {rows.map((player, index) => {
                const rank = startRank + index;
                const name = getDisplayName(player);
                const isCurrentUser = player.id === currentUserId;
                const rankLabel =
                  rank === 1
                    ? kind === "season"
                      ? "Season Champion"
                      : "Champion"
                    : rank <= 10
                      ? "Top 10"
                      : getRankFromRating(player.rating);

                return (
                  <tr
                    key={`${kind}-table-${player.id}`}
                    className={isCurrentUser ? "leaderboard-current-user-row" : undefined}
                  >
                    <td style={tdLeftMutedStyle}>{rank}</td>

                    <td style={tdNameStyle}>
                      <Link href={`/players/${player.id}`} className="leaderboard-player-cell leaderboard-app-player-cell">
                        <RankPill label={rankLabel} compact />
                        <BadgeIcon badgeKey={player.selected_badge_key} size={26} />

                        <div className="leaderboard-player-main">
                          <span className="leaderboard-player-name-line">
                            {name}
                            {isCurrentUser && <em>You</em>}
                          </span>
                          <SeasonSignalRow kind={kind} player={player} compact />
                        </div>
                      </Link>
                    </td>

                    <td style={tdRightStyle}>{formatRating(player.rating)}</td>
                    <td style={tdRightStyle}>{formatWinRate(player.win_rate)}</td>
                    <td style={tdRightStyle}>{player.total_battles ?? 0}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function SeasonSignalRow({
  kind,
  player,
  compact = false,
}: {
  kind: BoardKind;
  player: LeaderRow;
  compact?: boolean;
}) {
  if (kind !== "season") return null;

  const signals = getSeasonSignals(player);

  if (signals.length === 0) return null;

  return (
    <div
      className={
        compact
          ? "leaderboard-season-signals leaderboard-season-signals-compact"
          : "leaderboard-season-signals"
      }
    >
      {signals.map((signal) => (
        <span
          key={`${signal.tone}-${signal.label}`}
          className={`leaderboard-season-signal leaderboard-season-signal-${signal.tone}`}
        >
          {signal.label}
        </span>
      ))}
    </div>
  );
}

function StatTile({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="leaderboard-app-stat-tile">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function RankPill({
  label,
  compact = false,
}: {
  label: string;
  compact?: boolean;
}) {
  const theme = getRankTheme(label);

  return (
    <span
      className={
        compact
          ? "leaderboard-rank-pill leaderboard-rank-pill-compact"
          : "leaderboard-rank-pill"
      }
      style={{
        color: theme.text,
        borderColor: theme.border,
        background: theme.background,
      }}
    >
      {label}
    </span>
  );
}

function MiniStat({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <div className="leaderboard-app-mini-stat">
      <div>{label}</div>
      <strong>{value}</strong>
    </div>
  );
}

const thLeftStyle: CSSProperties = {
  textAlign: "left",
  padding: "10px 15px",
  color: "rgba(255,255,255,0.52)",
  fontSize: "0.64rem",
  fontWeight: 950,
  textTransform: "uppercase",
  letterSpacing: "0.13em",
};

const thRightStyle: CSSProperties = {
  ...thLeftStyle,
  textAlign: "right",
};

const tdLeftMutedStyle: CSSProperties = {
  padding: "10px 15px",
  color: "rgba(255,255,255,0.56)",
  fontWeight: 950,
  fontVariantNumeric: "tabular-nums",
};

const tdNameStyle: CSSProperties = {
  padding: "10px 15px",
  color: "var(--text)",
  fontWeight: 850,
  minWidth: 280,
};

const tdRightStyle: CSSProperties = {
  padding: "10px 15px",
  textAlign: "right",
  color: "rgba(255,255,255,0.84)",
  fontWeight: 760,
  fontVariantNumeric: "tabular-nums",
};
