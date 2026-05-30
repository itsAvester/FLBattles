"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "../../lib/supabaseClient";

type LeaderProfile = {
  id: string;
  display_name: string | null;
  rating: number | null;
  total_battles: number | null;
  win_rate: number | null;
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
        border: "rgba(255, 116, 67, 0.45)",
        background:
          "linear-gradient(90deg, rgba(255,77,28,0.92), rgba(246,198,91,0.88))",
      };
    case "Ruby":
      return {
        text: "#fecdd3",
        border: "rgba(244, 63, 94, 0.35)",
        background: "rgba(244, 63, 94, 0.10)",
      };
    case "Emerald":
      return {
        text: "#a7f3d0",
        border: "rgba(16, 185, 129, 0.30)",
        background: "rgba(16, 185, 129, 0.09)",
      };
    case "Diamond":
      return {
        text: "#ddd6fe",
        border: "rgba(139, 92, 246, 0.30)",
        background: "rgba(139, 92, 246, 0.09)",
      };
    case "Platinum":
      return {
        text: "#bae6fd",
        border: "rgba(14, 165, 233, 0.30)",
        background: "rgba(14, 165, 233, 0.09)",
      };
    case "Gold":
      return {
        text: "#fde68a",
        border: "rgba(246, 198, 91, 0.32)",
        background: "rgba(246, 198, 91, 0.09)",
      };
    case "Silver":
      return {
        text: "#d1d5db",
        border: "rgba(209, 213, 219, 0.22)",
        background: "rgba(209, 213, 219, 0.07)",
      };
    case "Bronze":
      return {
        text: "#d6a46a",
        border: "rgba(214, 164, 106, 0.24)",
        background: "rgba(214, 164, 106, 0.08)",
      };
    default:
      return {
        text: "#a1a1aa",
        border: "rgba(161, 161, 170, 0.18)",
        background: "rgba(161, 161, 170, 0.06)",
      };
  }
}

export default function LeaderboardPage() {
  const [rows, setRows] = useState<LeaderProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [searchTerm, setSearchTerm] = useState("");
  const [searching, setSearching] = useState(false);

  const loadProfiles = async (term?: string) => {
    const cleanTerm = term?.trim() ?? "";

    setLoading(true);
    setErrorMsg(null);

    let query = supabase
      .from("profiles")
      .select("id, display_name, rating, total_battles, win_rate")
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

  return (
    <section className="page-inner" style={{ paddingTop: 56, paddingBottom: 96 }}>
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
            display: "block",
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
                fontSize: "clamp(2.4rem, 5vw, 4.75rem)",
                lineHeight: 0.92,
                letterSpacing: "-0.065em",
                fontWeight: 850,
                color: "var(--text)",
              }}
            >
              Leaderboard
            </h1>

            <p
              className="page-description"
              style={{
                maxWidth: 650,
                marginTop: 16,
                color: "rgba(255,255,255,0.58)",
                fontSize: "0.98rem",
                lineHeight: 1.7,
              }}
            >
              Browse the top ranked FL Battles producers. Search by name, compare
              rating, and open profiles to view player details.
            </p>
          </div>
        </header>

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
          }}
        >
          <input
            type="text"
            placeholder="Search players by name..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              width: "100%",
              padding: "13px 14px",
              border: "1px solid rgba(255,255,255,0.08)",
              background: "rgba(5, 5, 5, 0.55)",
              color: "var(--text)",
              outline: "none",
              fontSize: "0.95rem",
              fontWeight: 650,
            }}
          />

          <button
            type="submit"
            className="btn-secondary"
            style={{
              minHeight: 45,
              paddingInline: 22,
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
                  minWidth: 860,
                  fontSize: "0.94rem",
                }}
              >
                <thead>
                  <tr
                    style={{
                      background: "rgba(8, 12, 18, 0.72)",
                      borderBottom: "1px solid rgba(255,255,255,0.08)",
                    }}
                  >
                    <th style={thLeftStyle}>#</th>
                    <th style={thLeftStyle}>Player</th>
                    <th style={thRightStyle}>Rating</th>
                    <th style={thRightStyle}>Win Rate</th>
                    <th style={thRightStyle}>Battles</th>
                  </tr>
                </thead>

                <tbody>
                  {rows.map((p, idx) => {
                    const leaderboardRank = idx + 1;
                    const ratingRank = getRankFromRating(p.rating);
                    const displayRank =
                      !searching && leaderboardRank <= 10 ? "Top 10" : ratingRank;

                    const rankTheme = getRankTheme(displayRank);

                    const name =
                      p.display_name ||
                      `Producer ${p.id.slice(0, 6).toUpperCase()}`;

                    const isTopThree = !searching && leaderboardRank <= 3;

                    return (
                      <tr
                        key={p.id}
                        style={{
                          borderBottom: "1px solid rgba(255,255,255,0.045)",
                          background: isTopThree
                            ? "linear-gradient(90deg, rgba(255,77,28,0.055), rgba(255,255,255,0.012))"
                            : "transparent",
                        }}
                      >
                        <td
                          style={{
                            padding: "13px 18px",
                            color: isTopThree
                              ? "rgba(255,255,255,0.92)"
                              : "rgba(255,255,255,0.58)",
                            fontWeight: 850,
                            width: 72,
                          }}
                        >
                          {leaderboardRank}
                        </td>

                        <td style={{ padding: "13px 18px" }}>
                          <Link
                            href={`/players/${p.id}`}
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: 12,
                              textDecoration: "none",
                              color: "var(--text)",
                              fontWeight: 820,
                              letterSpacing: "-0.015em",
                            }}
                          >
                            <span
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                justifyContent: "center",
                                minWidth: 64,
                                padding: "6px 9px",
                                border: `1px solid ${rankTheme.border}`,
                                background: rankTheme.background,
                                color: rankTheme.text,
                                fontSize: "0.68rem",
                                fontWeight: 950,
                                textTransform: "uppercase",
                                letterSpacing: "0.075em",
                                lineHeight: 1,
                                whiteSpace: "nowrap",
                              }}
                            >
                              {displayRank}
                            </span>

                            <span>{name}</span>
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

const thLeftStyle: React.CSSProperties = {
  textAlign: "left",
  padding: "13px 18px",
  color: "rgba(255,255,255,0.58)",
  fontSize: "0.7rem",
  fontWeight: 950,
  textTransform: "uppercase",
  letterSpacing: "0.12em",
};

const thRightStyle: React.CSSProperties = {
  ...thLeftStyle,
  textAlign: "right",
};

const tdRightStyle: React.CSSProperties = {
  padding: "13px 18px",
  textAlign: "right",
  color: "rgba(255,255,255,0.84)",
  fontWeight: 720,
  fontVariantNumeric: "tabular-nums",
};