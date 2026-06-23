"use client";

import { useEffect, useMemo, useState, type CSSProperties, type FormEvent } from "react";
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
      setErrorMsg(seasonResult.error?.message || allTimeResult.error?.message || "Unable to load leaderboard.");
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

  const currentSeasonRank = !searching
    ? seasonRows.findIndex((player) => player.id === currentUserId)
    : -1;

  const currentSeasonUser =
    currentSeasonRank >= 0
      ? {
          player: seasonRows[currentSeasonRank],
          rank: currentSeasonRank + 1,
        }
      : null;

  const nextSeasonTarget =
    currentSeasonUser && currentSeasonUser.rank > 1
      ? seasonRows[currentSeasonUser.rank - 2]
      : null;

  const pointsToNext =
    currentSeasonUser && nextSeasonTarget
      ? Math.max(0, Math.round((nextSeasonTarget.rating ?? 0) - (currentSeasonUser.player.rating ?? 0)))
      : 0;

  return (
    <section className="page-inner leaderboard-page">
      <div className="leaderboard-shell">
        <header className="leaderboard-hero">
          <div>
            <div className="eyebrow leaderboard-eyebrow">
              <span className="eyebrow-dot" />
              Ranked seasons
            </div>

            <h1>Leaderboard</h1>

            <p className="page-description leaderboard-hero-copy">
              Compete in the current monthly season, climb the board, and keep
              your long-term legacy alive in the all-time Hall of Fame.
            </p>
          </div>

          <div className="leaderboard-hero-stats" aria-label="Leaderboard summary">
            <StatTile label="Current season" value={season.label} />
            <StatTile label="Season resets in" value={`${season.daysRemaining}d`} />
            <StatTile label="All-time pool" value={loading ? "—" : allTimeRows.length} />
          </div>
        </header>

        <section className="season-banner">
          <div>
            <span className="season-banner-kicker">Current Season</span>
            <strong>{season.label} Season</strong>
            <p>
              Monthly rankings reset at the start of each month. All-time stats
              stay permanent underneath.
            </p>
          </div>

          <Link href="/battles" className="btn-primary season-banner-button">
            Enter Ranked Battle
          </Link>
        </section>

        {currentSeasonUser && (
          <section className="your-season-card">
            <div className="your-season-card-main">
              <BadgeIcon badgeKey={currentSeasonUser.player.selected_badge_key} size={34} />

              <div>
                <span>Your season rank</span>
                <strong>
                  #{currentSeasonUser.rank} {getDisplayName(currentSeasonUser.player)}
                </strong>
                <p>
                  {formatRating(currentSeasonUser.player.rating)} season points ·{" "}
                  {formatWinRate(currentSeasonUser.player.win_rate)} WR
                </p>
              </div>
            </div>

            <div className="your-season-card-side">
              {currentSeasonUser.rank === 1
                ? "You are leading the current season."
                : `${pointsToNext} points away from #${currentSeasonUser.rank - 1}`}
            </div>
          </section>
        )}

        <form onSubmit={handleSearch} className="leaderboard-search">
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

        {errorMsg && !loading && (
          <div className="leaderboard-message leaderboard-message-error">
            {errorMsg}
          </div>
        )}

        <LeaderboardBoard
          kind="season"
          title="Current Season"
          eyebrow={`${season.label} Season`}
          description="This is the board players can realistically attack right now. Wins this month build season points without erasing all-time legacy."
          rows={seasonRows}
          loading={loading}
          searching={searching}
          currentUserId={currentUserId}
          emptyMessage={
            searching
              ? "No current-season players matched that search."
              : "No ranked battles have been counted for this season yet."
          }
        />

        <section className="leaderboard-cta-strip">
          <Link href="/battles" className="btn-primary">
            Enter Ranked Battle
          </Link>
        </section>

        <LeaderboardBoard
          kind="allTime"
          title="All-Time Hall of Fame"
          eyebrow="Permanent leaderboard"
          description="The long-term board for producers with the strongest ranked record across every season."
          rows={allTimeRows}
          loading={loading}
          searching={searching}
          currentUserId={currentUserId}
          emptyMessage={
            searching
              ? "No all-time players matched that search."
              : "No all-time ranked players found."
          }
        />
      </div>
    </section>
  );
}

function LeaderboardBoard({
  kind,
  title,
  eyebrow,
  description,
  rows,
  loading,
  searching,
  currentUserId,
  emptyMessage,
}: {
  kind: BoardKind;
  title: string;
  eyebrow: string;
  description: string;
  rows: LeaderRow[];
  loading: boolean;
  searching: boolean;
  currentUserId: string | null;
  emptyMessage: string;
}) {
  const rankedRows = useMemo(() => rows, [rows]);
  const podiumRows = !searching ? rankedRows.slice(0, 3) : [];
  const tableRows = !searching ? rankedRows.slice(3) : rankedRows;

  return (
    <section className={`leaderboard-board leaderboard-board-${kind}`}>
      <div className="leaderboard-section-head">
        <div>
          <span>{eyebrow}</span>
          <h2>{title}</h2>
          <p>{description}</p>
        </div>

        <div className="leaderboard-section-count">
          <span>{kind === "season" ? "Season pool" : "Showing top"}</span>
          <strong>{loading ? "—" : rows.length}</strong>
        </div>
      </div>

      {!loading && podiumRows.length > 0 && (
        <div className="leaderboard-podium-grid">
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
      className={`leaderboard-podium-card ${isChampion ? "leaderboard-podium-card-champion" : ""}`}
    >
      <div className="leaderboard-podium-bg-number">{rank}</div>

      <div className="leaderboard-podium-topline">
        <span className="leaderboard-rank-bubble">#{rank}</span>
        <BadgeIcon badgeKey={player.selected_badge_key} size={34} />
      </div>

      <div className="leaderboard-podium-body">
        <RankPill label={statusLabel} />

        <h3>{getDisplayName(player)}</h3>

        <div className="leaderboard-mini-stat-grid">
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
}: {
  kind: BoardKind;
  rows: LeaderRow[];
  loading: boolean;
  currentUserId: string | null;
  emptyMessage: string;
  startRank: number;
}) {
  return (
    <div className="leaderboard-table-card">
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
                <th style={thRightStyle}>{kind === "season" ? "Points" : "Rating"}</th>
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
                        <BadgeIcon badgeKey={player.selected_badge_key} size={28} />
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
    <div className="leaderboard-stat-tile">
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
      className={compact ? "leaderboard-rank-pill leaderboard-rank-pill-compact" : "leaderboard-rank-pill"}
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
  padding: "14px 18px",
  color: "rgba(255,255,255,0.52)",
  fontSize: "0.68rem",
  fontWeight: 950,
  textTransform: "uppercase",
  letterSpacing: "0.13em",
};

const thRightStyle: CSSProperties = {
  ...thLeftStyle,
  textAlign: "right",
};

const tdLeftMutedStyle: CSSProperties = {
  padding: "14px 18px",
  color: "rgba(255,255,255,0.56)",
  fontWeight: 950,
  fontVariantNumeric: "tabular-nums",
};

const tdNameStyle: CSSProperties = {
  padding: "14px 18px",
  color: "var(--text)",
  fontWeight: 850,
  minWidth: 280,
};

const tdRightStyle: CSSProperties = {
  padding: "14px 18px",
  textAlign: "right",
  color: "rgba(255,255,255,0.84)",
  fontWeight: 760,
  fontVariantNumeric: "tabular-nums",
};
