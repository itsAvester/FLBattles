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

function formatRating(r: number | null) {
  return r === null ? "Unranked" : Math.round(r);
}

function formatWinRate(w: number | null) {
  return w === null ? "—" : `${Number(w).toFixed(1)}%`;
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
      .select("id, display_name, rating, total_battles, wins, losses, win_rate, selected_badge_key")
      .order("rating", { ascending: false })
      .order("wins", { ascending: false })
      .order("total_battles", { ascending: false })
      .limit(100);

    let allTimeQuery = supabase
      .from("profiles")
      .select("id, display_name, rating, total_battles, wins, losses, win_rate, selected_badge_key")
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

  const handleSearch = async (e: FormEvent) => {
    e.preventDefault();

    const term = searchTerm.trim();
    setSearching(!!term);
    await loadLeaderboards(term);
  };

  const clearSearch = async () => {
    setSearchTerm("");
    setSearching(false);
    await loadLeaderboards();
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
            "Monthly rankings reset at the start of each month. All-time stats stay permanent.",
          primaryMetricLabel: "Season points",
          poolLabel: "Season pool",
          poolValue: loading ? "—" : seasonRows.length,
          resetLabel: "Resets in",
          resetValue: `${season.daysRemaining}d`,
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
        };

  return (
    <section className="page-inner leaderboard-page leaderboard-page-compact">
      <div className="leaderboard-shell leaderboard-shell-compact">
        <header className="leaderboard-hero leaderboard-hero-compact">
          <div>
            <div className="eyebrow leaderboard-eyebrow leaderboard-eyebrow-compact">
              <span className="eyebrow-dot" />
              Ranked producers
            </div>

            <h1>Leaderboard</h1>

            <p className="page-description leaderboard-hero-copy leaderboard-hero-copy-compact">
              Current monthly rankings and all-time legacy for FL Battles producers.
            </p>
          </div>
        </header>

        <section className="leaderboard-control-panel">
          <div className="leaderboard-control-topline">
            <div className="leaderboard-board-tabs" role="tablist" aria-label="Leaderboard type">
              <button
                type="button"
                role="tab"
                aria-selected={activeBoard === "season"}
                className={activeBoard === "season" ? "is-active" : undefined}
                onClick={() => setActiveBoard("season")}
              >
                Current Season
              </button>

              <button
                type="button"
                role="tab"
                aria-selected={activeBoard === "allTime"}
                className={activeBoard === "allTime" ? "is-active" : undefined}
                onClick={() => setActiveBoard("allTime")}
              >
                All-Time
              </button>
            </div>

            <Link href="/battles" className="btn-primary leaderboard-enter-battle-button">
              Enter Ranked Battle
            </Link>
          </div>

          <div className="leaderboard-active-summary">
            <div className="leaderboard-active-copy">
              <span>{activeBoardCopy.eyebrow}</span>
              <h2>{activeBoardCopy.title}</h2>
              <p>{activeBoardCopy.description}</p>
            </div>

            <div className="leaderboard-active-stats">
              <StatTile label={activeBoardCopy.poolLabel} value={activeBoardCopy.poolValue} />
              <StatTile label={activeBoardCopy.resetLabel} value={activeBoardCopy.resetValue} />
              <StatTile
                label="Your rank"
                value={activeCurrentUserRank ? `#${activeCurrentUserRank}` : "—"}
              />
            </div>
          </div>

          <form onSubmit={handleSearch} className="leaderboard-search leaderboard-search-compact">
            <input
              type="text"
              placeholder="Search players by name."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
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
        </section>

        {errorMsg && !loading && (
          <div className="leaderboard-message leaderboard-message-error">
            {errorMsg}
          </div>
        )}

        <LeaderboardBoard
          kind={activeBoard}
          rows={activeRows}
          loading={loading}
          searching={searching}
          currentUserId={currentUserId}
          primaryMetricLabel={activeBoardCopy.primaryMetricLabel}
          emptyMessage={
            searching
              ? `No ${activeBoard === "season" ? "current-season" : "all-time"} players matched that search.`
              : activeBoard === "season"
                ? "No ranked battles have been counted for this season yet."
                : "No all-time ranked players found."
          }
        />
      </div>
    </section>
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
    <section className={`leaderboard-board leaderboard-board-active leaderboard-board-${kind}`}>
      {!loading && podiumRows.length > 0 && (
        <div className="leaderboard-podium-grid leaderboard-podium-grid-compact">
          {podiumRows.map((player, idx) => (
            <PodiumCard
              key={`${kind}-${player.id}`}
              player={player}
              rank={idx + 1}
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
      className={`leaderboard-podium-card leaderboard-podium-card-compact ${
        isChampion ? "leaderboard-podium-card-champion" : ""
      }`}
    >
      <div className="leaderboard-podium-bg-number">{rank}</div>

      <div className="leaderboard-podium-topline">
        <span className="leaderboard-rank-bubble">#{rank}</span>
        <BadgeIcon badgeKey={player.selected_badge_key} size={30} />
      </div>

      <div className="leaderboard-podium-body">
        <RankPill label={statusLabel} />

        <h3>{getDisplayName(player)}</h3>

        <div className="leaderboard-mini-stat-grid leaderboard-mini-stat-grid-compact">
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
    <div className="leaderboard-table-card leaderboard-table-card-compact">
      {loading && (
        <p className="leaderboard-message">
          Loading {kind === "season" ? "current season" : "all-time"} leaderboard...
        </p>
      )}

      {!loading && rows.length === 0 && (
        <p className="leaderboard-message">{emptyMessage}</p>
      )}

      {!loading && rows.length > 0 && (
        <div className="leaderboard-table-wrap">
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
              {rows.map((player, idx) => {
                const rank = startRank + idx;
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
                      <Link href={`/players/${player.id}`} className="leaderboard-player-cell">
                        <RankPill label={rankLabel} compact />
                        <BadgeIcon badgeKey={player.selected_badge_key} size={26} />
                        <span>
                          {name}
                          {isCurrentUser && <em>You</em>}
                        </span>
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

function StatTile({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="leaderboard-stat-tile leaderboard-stat-tile-compact">
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
    <div className="leaderboard-mini-stat">
      <div>{label}</div>
      <strong>{value}</strong>
    </div>
  );
}

const thLeftStyle: CSSProperties = {
  textAlign: "left",
  padding: "11px 16px",
  color: "rgba(255,255,255,0.52)",
  fontSize: "0.66rem",
  fontWeight: 950,
  textTransform: "uppercase",
  letterSpacing: "0.13em",
};

const thRightStyle: CSSProperties = {
  ...thLeftStyle,
  textAlign: "right",
};

const tdLeftMutedStyle: CSSProperties = {
  padding: "11px 16px",
  color: "rgba(255,255,255,0.56)",
  fontWeight: 950,
  fontVariantNumeric: "tabular-nums",
};

const tdNameStyle: CSSProperties = {
  padding: "11px 16px",
  color: "var(--text)",
  fontWeight: 850,
  minWidth: 280,
};

const tdRightStyle: CSSProperties = {
  padding: "11px 16px",
  textAlign: "right",
  color: "rgba(255,255,255,0.84)",
  fontWeight: 760,
  fontVariantNumeric: "tabular-nums",
};
