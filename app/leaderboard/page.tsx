"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabase } from "../../lib/supabaseClient";

type LeaderProfile = {
  id: string;
  display_name: string | null;
  rating: number | null;
  total_battles: number | null;
  win_rate: number | null;
  selected_badge_key: string | null;
};

type BadgeMeta = {
  icon: string;
  label: string;
  tone:
    | "champion"
    | "fire"
    | "goat"
    | "veteran"
    | "perfect"
    | "rising"
    | "regular"
    | "default";
};

const BADGE_CATALOG: Record<string, BadgeMeta> = {
  champion: {
    icon: "👑",
    label: "Champion",
    tone: "champion",
  },
  top_10: {
    icon: "🐐",
    label: "Top 10",
    tone: "goat",
  },
  perfect_record: {
    icon: "🧊",
    label: "Perfect Record",
    tone: "perfect",
  },
  hot_streak: {
    icon: "🔥",
    label: "Hot Streak",
    tone: "fire",
  },
  veteran: {
    icon: "🎧",
    label: "Veteran",
    tone: "veteran",
  },
  ranked_regular: {
    icon: "💿",
    label: "Ranked Regular",
    tone: "regular",
  },
  rising_producer: {
    icon: "⚡",
    label: "Rising Producer",
    tone: "rising",
  },
  first_win: {
    icon: "🥇",
    label: "First Win",
    tone: "champion",
  },
};

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

function getDisplayName(player: LeaderProfile): string {
  return player.display_name || `Producer ${player.id.slice(0, 6).toUpperCase()}`;
}

function getStoredBadge(player: LeaderProfile): BadgeMeta {
  if (player.selected_badge_key && BADGE_CATALOG[player.selected_badge_key]) {
    return BADGE_CATALOG[player.selected_badge_key];
  }

  return {
    icon: "🎛️",
    label: "Producer",
    tone: "default",
  };
}

function getBadgeStyle(tone: BadgeMeta["tone"]): React.CSSProperties {
  const base: React.CSSProperties = {
    width: 34,
    height: 34,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,
    border: "1px solid rgba(255,255,255,0.12)",
    background: "rgba(255,255,255,0.05)",
    boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.025)",
    fontSize: "1rem",
    flexShrink: 0,
  };

  switch (tone) {
    case "champion":
      return {
        ...base,
        border: "1px solid rgba(246,198,91,0.46)",
        background:
          "radial-gradient(circle at 30% 20%, rgba(246,198,91,0.28), rgba(255,77,28,0.1))",
      };
    case "fire":
      return {
        ...base,
        border: "1px solid rgba(255,77,28,0.42)",
        background: "rgba(255,77,28,0.11)",
      };
    case "goat":
      return {
        ...base,
        border: "1px solid rgba(255,116,67,0.36)",
        background: "rgba(255,77,28,0.09)",
      };
    case "perfect":
      return {
        ...base,
        border: "1px solid rgba(186,230,253,0.36)",
        background: "rgba(14,165,233,0.09)",
      };
    case "veteran":
      return {
        ...base,
        border: "1px solid rgba(209,213,219,0.26)",
        background: "rgba(209,213,219,0.07)",
      };
    case "regular":
      return {
        ...base,
        border: "1px solid rgba(246,198,91,0.3)",
        background: "rgba(246,198,91,0.075)",
      };
    case "rising":
      return {
        ...base,
        border: "1px solid rgba(140,255,107,0.3)",
        background: "rgba(140,255,107,0.07)",
      };
    default:
      return base;
  }
}

export default function LeaderboardPage() {
  const [rows, setRows] = useState<LeaderProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  const [searchTerm, setSearchTerm] = useState("");
  const [searching, setSearching] = useState(false);

  const loadProfiles = async (term?: string) => {
    const cleanTerm = term?.trim() ?? "";

    setLoading(true);
    setErrorMsg(null);

    let query = supabase
      .from("profiles")
      .select("id, display_name, rating, total_battles, win_rate, selected_badge_key")
      .order("rating", { ascending: false })
      .limit(100);

    if (cleanTerm) {
      query = query.ilike("display_name", `%${cleanTerm}%`);
    }

    const { data, error } = await query;

    if (error) {
      setErrorMsg(error.message);
      setRows([]);
    } else {
      setRows(data ?? []);
    }

    setLoading(false);
  };

  useEffect(() => {
    loadProfiles();

    const loadUser = async () => {
      const { data } = await supabase.auth.getUser();
      setCurrentUserId(data.user?.id ?? null);
    };

    loadUser();
  }, []);

  const formatRating = (r: number | null) =>
    r === null ? "Unranked" : Math.round(r);

  const formatWinRate = (w: number | null) =>
    w === null ? "—" : `${w.toFixed(1)}%`;

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();

    const term = searchTerm.trim();
    setSearching(!!term);
    await loadProfiles(term);
  };

  const rankedRows = useMemo(() => rows, [rows]);
  const podiumRows = !searching ? rankedRows.slice(0, 3) : [];
  const tableRows = !searching ? rankedRows.slice(3) : rankedRows;

  const currentUserIndex = !searching
    ? rows.findIndex((player) => player.id === currentUserId)
    : -1;

  const currentUser =
    currentUserIndex >= 0
      ? {
          player: rows[currentUserIndex],
          rank: currentUserIndex + 1,
        }
      : null;

  const nextTarget =
    currentUser && currentUser.rank > 1
      ? rows[currentUser.rank - 2]
      : null;

  const pointsToNext =
    currentUser && nextTarget
      ? Math.max(0, Math.round((nextTarget.rating ?? 0) - (currentUser.player.rating ?? 0)))
      : 0;

  return (
    <section className="page-inner" style={{ paddingTop: 42, paddingBottom: 96 }}>
      <div
        style={{
          display: "grid",
          gap: 22,
          maxWidth: 1280,
          margin: "0 auto",
        }}
      >
        <header
          style={{
            display: "grid",
            gridTemplateColumns: "minmax(0, 1fr) auto",
            gap: 24,
            alignItems: "end",
          }}
        >
          <div>
            <div className="eyebrow" style={{ marginBottom: 14 }}>
              <span className="eyebrow-dot" />
              Ranked producers
            </div>

            <h1
              style={{
                margin: 0,
                fontSize: "clamp(2.55rem, 5vw, 5.2rem)",
                lineHeight: 0.88,
                letterSpacing: "-0.075em",
                fontWeight: 900,
                color: "var(--text)",
              }}
            >
              Leaderboard
            </h1>

            <p
              className="page-description"
              style={{
                maxWidth: 690,
                marginTop: 16,
                color: "rgba(255,255,255,0.6)",
                fontSize: "1rem",
                lineHeight: 1.65,
              }}
            >
              Climb the ranked board, earn status icons, and prove your beats
              belong near the top.
            </p>
          </div>

          <div
            style={{
              display: "grid",
              gap: 8,
              justifyItems: "end",
              minWidth: 190,
            }}
          >
            <span
              style={{
                color: "rgba(255,255,255,0.38)",
                fontSize: "0.68rem",
                fontWeight: 950,
                textTransform: "uppercase",
                letterSpacing: "0.14em",
              }}
            >
              Ranked pool
            </span>
            <strong
              style={{
                color: "var(--text)",
                fontSize: "clamp(1.5rem, 3vw, 2.2rem)",
                lineHeight: 1,
                letterSpacing: "-0.05em",
              }}
            >
              {loading ? "—" : rows.length}
            </strong>
          </div>
        </header>

        {currentUser && (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "minmax(0, 1fr) auto",
              gap: 16,
              alignItems: "center",
              padding: 16,
              border: "1px solid rgba(140,255,107,0.22)",
              background:
                "linear-gradient(90deg, rgba(140,255,107,0.075), rgba(255,255,255,0.025), rgba(255,77,28,0.055))",
              boxShadow: "0 22px 70px rgba(0,0,0,0.22)",
              borderRadius: 18,
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 14,
                minWidth: 0,
              }}
            >
              {(() => {
                const badge = getStoredBadge(currentUser.player);

                return (
                  <span style={getBadgeStyle(badge.tone)} title={badge.label}>
                    {badge.icon}
                  </span>
                );
              })()}

              <div style={{ minWidth: 0 }}>
                <div
                  style={{
                    color: "rgba(255,255,255,0.42)",
                    fontSize: "0.68rem",
                    fontWeight: 950,
                    textTransform: "uppercase",
                    letterSpacing: "0.14em",
                    marginBottom: 5,
                  }}
                >
                  Your rank
                </div>

                <div
                  style={{
                    display: "flex",
                    alignItems: "baseline",
                    gap: 10,
                    flexWrap: "wrap",
                  }}
                >
                  <strong
                    style={{
                      color: "var(--text)",
                      fontSize: "1.15rem",
                      letterSpacing: "-0.03em",
                    }}
                  >
                    #{currentUser.rank} {getDisplayName(currentUser.player)}
                  </strong>

                  <span
                    style={{
                      color: "rgba(255,255,255,0.56)",
                      fontSize: "0.88rem",
                      fontWeight: 750,
                    }}
                  >
                    {formatRating(currentUser.player.rating)} rating ·{" "}
                    {formatWinRate(currentUser.player.win_rate)} WR
                  </span>
                </div>
              </div>
            </div>

            <div
              style={{
                color: "rgba(255,255,255,0.62)",
                fontSize: "0.84rem",
                fontWeight: 800,
                textAlign: "right",
                lineHeight: 1.4,
              }}
            >
              {currentUser.rank === 1
                ? "You are holding the #1 spot."
                : `${pointsToNext} rating away from #${currentUser.rank - 1}`}
            </div>
          </div>
        )}

        {!loading && !errorMsg && podiumRows.length > 0 && (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
              gap: 14,
            }}
          >
            {podiumRows.map((player, idx) => {
              const rank = idx + 1;
              const badge = getStoredBadge(player);
              const isChampion = rank === 1;

              return (
                <Link
                  key={player.id}
                  href={`/players/${player.id}`}
                  style={{
                    position: "relative",
                    overflow: "hidden",
                    minHeight: isChampion ? 206 : 178,
                    display: "grid",
                    alignContent: "space-between",
                    padding: isChampion ? 22 : 18,
                    borderRadius: 22,
                    border: isChampion
                      ? "1px solid rgba(246,198,91,0.34)"
                      : "1px solid rgba(255,255,255,0.1)",
                    background: isChampion
                      ? "radial-gradient(circle at 20% 0%, rgba(246,198,91,0.18), transparent 36%), radial-gradient(circle at 90% 0%, rgba(255,77,28,0.18), transparent 38%), rgba(255,255,255,0.045)"
                      : "linear-gradient(180deg, rgba(255,255,255,0.045), rgba(255,255,255,0.018))",
                    boxShadow: isChampion
                      ? "0 28px 90px rgba(0,0,0,0.34), 0 0 50px rgba(255,77,28,0.08)"
                      : "0 22px 70px rgba(0,0,0,0.25)",
                    textDecoration: "none",
                    color: "var(--text)",
                  }}
                >
                  <div
                    style={{
                      position: "absolute",
                      right: -12,
                      top: -20,
                      color: "rgba(255,255,255,0.045)",
                      fontSize: isChampion ? "7rem" : "5.6rem",
                      fontWeight: 950,
                      letterSpacing: "-0.09em",
                      lineHeight: 1,
                    }}
                  >
                    {rank}
                  </div>

                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "flex-start",
                      gap: 14,
                      position: "relative",
                      zIndex: 1,
                    }}
                  >
                    <span
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        minHeight: 28,
                        padding: "0 10px",
                        borderRadius: 999,
                        border: isChampion
                          ? "1px solid rgba(246,198,91,0.48)"
                          : "1px solid rgba(255,255,255,0.14)",
                        background: isChampion
                          ? "rgba(246,198,91,0.1)"
                          : "rgba(255,255,255,0.04)",
                        color: isChampion ? "#fde68a" : "rgba(255,255,255,0.72)",
                        fontSize: "0.66rem",
                        fontWeight: 950,
                        textTransform: "uppercase",
                        letterSpacing: "0.12em",
                      }}
                    >
                      #{rank}
                    </span>

                    <span style={getBadgeStyle(badge.tone)} title={badge.label}>
                      {badge.icon}
                    </span>
                  </div>

                  <div style={{ position: "relative", zIndex: 1 }}>
                    <div
                      style={{
                        color: "rgba(255,255,255,0.42)",
                        fontSize: "0.68rem",
                        fontWeight: 950,
                        textTransform: "uppercase",
                        letterSpacing: "0.14em",
                        marginBottom: 8,
                      }}
                    >
                      {badge.label}
                    </div>

                    <h2
                      style={{
                        margin: 0,
                        color: "var(--text)",
                        fontSize: isChampion ? "1.45rem" : "1.15rem",
                        lineHeight: 1.08,
                        letterSpacing: "-0.045em",
                        fontWeight: 920,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {getDisplayName(player)}
                    </h2>

                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(3, 1fr)",
                        gap: 10,
                        marginTop: 18,
                      }}
                    >
                      <MiniStat label="Rating" value={formatRating(player.rating)} />
                      <MiniStat label="WR" value={formatWinRate(player.win_rate)} />
                      <MiniStat label="Battles" value={player.total_battles ?? 0} />
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}

        <form
          onSubmit={handleSearch}
          style={{
            display: "grid",
            gridTemplateColumns: "1fr auto",
            gap: 10,
            alignItems: "center",
            padding: 10,
            border: "1px solid rgba(255,255,255,0.08)",
            background: "rgba(255,255,255,0.035)",
            boxShadow: "0 18px 70px rgba(0,0,0,0.22)",
            borderRadius: 18,
          }}
        >
          <input
            type="text"
            placeholder="Search players by name..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              width: "100%",
              minHeight: 46,
              padding: "13px 14px",
              border: "1px solid rgba(255,255,255,0.08)",
              background: "rgba(5, 5, 5, 0.55)",
              color: "var(--text)",
              outline: "none",
              fontSize: "0.95rem",
              fontWeight: 650,
              borderRadius: 12,
            }}
          />

          <button
            type="submit"
            className="btn-secondary"
            style={{
              minHeight: 46,
              paddingInline: 22,
              borderRadius: 12,
            }}
          >
            {loading && searching ? "Searching..." : "Search"}
          </button>
        </form>

        <div
          style={{
            border: "1px solid rgba(255,255,255,0.08)",
            background:
              "linear-gradient(180deg, rgba(255,255,255,0.045), rgba(255,255,255,0.018))",
            overflow: "hidden",
            boxShadow: "0 28px 90px rgba(0,0,0,0.28)",
            borderRadius: 22,
          }}
        >
          {loading && (
            <p
              style={{
                margin: 0,
                padding: "22px",
                color: "rgba(255,255,255,0.58)",
                fontWeight: 750,
              }}
            >
              {searching ? "Searching players..." : "Loading leaderboard..."}
            </p>
          )}

          {errorMsg && !loading && (
            <p
              style={{
                margin: 0,
                padding: "22px",
                color: "#fca5a5",
                fontWeight: 750,
              }}
            >
              {errorMsg}
            </p>
          )}

          {!loading && !errorMsg && rows.length === 0 && (
            <p
              style={{
                margin: 0,
                padding: "22px",
                color: "rgba(255,255,255,0.58)",
                fontWeight: 750,
              }}
            >
              No ranked players found.
            </p>
          )}

          {!loading && !errorMsg && rows.length > 0 && (
            <div style={{ overflowX: "auto" }}>
              <table
                style={{
                  width: "100%",
                  borderCollapse: "collapse",
                  minWidth: 900,
                  fontSize: "0.94rem",
                }}
              >
                <thead>
                  <tr
                    style={{
                      background: "rgba(8, 12, 18, 0.76)",
                      borderBottom: "1px solid rgba(255,255,255,0.08)",
                    }}
                  >
                    <th style={thLeftStyle}>#</th>
                    <th style={thLeftStyle}>Producer</th>
                    <th style={thRightStyle}>Rating</th>
                    <th style={thRightStyle}>Win Rate</th>
                    <th style={thRightStyle}>Battles</th>
                  </tr>
                </thead>

                <tbody>
                  {tableRows.map((p, idx) => {
                    const leaderboardRank = searching ? idx + 1 : idx + 4;
                    const ratingRank = getRankFromRating(p.rating);
                    const displayRank =
                      !searching && leaderboardRank <= 10 ? "Top 10" : ratingRank;

                    const rankTheme = getRankTheme(displayRank);
                    const badge = getStoredBadge(p);
                    const name = getDisplayName(p);
                    const isCurrentUser = p.id === currentUserId;

                    return (
                      <tr
                        key={p.id}
                        style={{
                          borderBottom: "1px solid rgba(255,255,255,0.045)",
                          background: isCurrentUser
                            ? "linear-gradient(90deg, rgba(140,255,107,0.08), rgba(255,255,255,0.015))"
                            : leaderboardRank <= 10 && !searching
                              ? "linear-gradient(90deg, rgba(255,77,28,0.04), rgba(255,255,255,0.012))"
                              : "transparent",
                        }}
                      >
                        <td
                          style={{
                            padding: "14px 18px",
                            color: isCurrentUser
                              ? "rgba(140,255,107,0.9)"
                              : "rgba(255,255,255,0.62)",
                            fontWeight: 900,
                            width: 72,
                          }}
                        >
                          {leaderboardRank}
                        </td>

                        <td style={{ padding: "14px 18px" }}>
                          <Link
                            href={`/players/${p.id}`}
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: 12,
                              textDecoration: "none",
                              color: "var(--text)",
                              fontWeight: 840,
                              letterSpacing: "-0.018em",
                              maxWidth: "100%",
                            }}
                          >
                            <span
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                justifyContent: "center",
                                minWidth: 70,
                                padding: "7px 10px",
                                border: `1px solid ${rankTheme.border}`,
                                background: rankTheme.background,
                                color: rankTheme.text,
                                fontSize: "0.66rem",
                                fontWeight: 950,
                                textTransform: "uppercase",
                                letterSpacing: "0.075em",
                                lineHeight: 1,
                                whiteSpace: "nowrap",
                                borderRadius: 10,
                              }}
                            >
                              {displayRank}
                            </span>

                            <span style={getBadgeStyle(badge.tone)} title={badge.label}>
                              {badge.icon}
                            </span>

                            <span
                              style={{
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                whiteSpace: "nowrap",
                              }}
                            >
                              {name}
                              {isCurrentUser && (
                                <span
                                  style={{
                                    marginLeft: 8,
                                    color: "rgba(140,255,107,0.75)",
                                    fontSize: "0.72rem",
                                    fontWeight: 950,
                                    textTransform: "uppercase",
                                    letterSpacing: "0.1em",
                                  }}
                                >
                                  You
                                </span>
                              )}
                            </span>
                          </Link>
                        </td>

                        <td style={tdRightStyle}>{formatRating(p.rating)}</td>
                        <td style={tdRightStyle}>{formatWinRate(p.win_rate)}</td>
                        <td style={tdRightStyle}>{p.total_battles ?? 0}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </section>
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
    <div
      style={{
        padding: "10px 9px",
        border: "1px solid rgba(255,255,255,0.08)",
        background: "rgba(0,0,0,0.22)",
        borderRadius: 12,
        minWidth: 0,
      }}
    >
      <div
        style={{
          color: "rgba(255,255,255,0.38)",
          fontSize: "0.58rem",
          fontWeight: 950,
          textTransform: "uppercase",
          letterSpacing: "0.12em",
          marginBottom: 6,
        }}
      >
        {label}
      </div>

      <strong
        style={{
          display: "block",
          color: "rgba(255,255,255,0.88)",
          fontSize: "0.94rem",
          lineHeight: 1,
          fontVariantNumeric: "tabular-nums",
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}
      >
        {value}
      </strong>
    </div>
  );
}

const thLeftStyle: React.CSSProperties = {
  textAlign: "left",
  padding: "14px 18px",
  color: "rgba(255,255,255,0.52)",
  fontSize: "0.68rem",
  fontWeight: 950,
  textTransform: "uppercase",
  letterSpacing: "0.13em",
};

const thRightStyle: React.CSSProperties = {
  ...thLeftStyle,
  textAlign: "right",
};

const tdRightStyle: React.CSSProperties = {
  padding: "14px 18px",
  textAlign: "right",
  color: "rgba(255,255,255,0.84)",
  fontWeight: 760,
  fontVariantNumeric: "tabular-nums",
};