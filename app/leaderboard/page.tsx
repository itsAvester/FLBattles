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

export default function LeaderboardPage() {
  const [rows, setRows] = useState<LeaderProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [searchTerm, setSearchTerm] = useState("");
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    const loadTop = async () => {
      setLoading(true);
      setErrorMsg(null);

      const { data, error } = await supabase
        .from("profiles")
        .select("id, display_name, rating, total_battles, win_rate")
        .order("rating", { ascending: false })
        .limit(100);

      if (error) {
        setErrorMsg(error.message);
        setRows([]);
      } else {
        setRows(data ?? []);
      }

      setLoading(false);
    };

    loadTop();
  }, []);

  const formatRating = (r: number | null) =>
    r === null ? "Unranked" : Math.round(r);

  const formatWinRate = (w: number | null) =>
    w === null ? "—" : `${w.toFixed(1)}%`;

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();

    const term = searchTerm.trim();

    if (!term) {
      setSearching(false);
      setLoading(true);
      setErrorMsg(null);

      const { data, error } = await supabase
        .from("profiles")
        .select("id, display_name, rating, total_battles, win_rate")
        .order("rating", { ascending: false })
        .limit(100);

      if (error) {
        setErrorMsg(error.message);
        setRows([]);
      } else {
        setRows(data ?? []);
      }

      setLoading(false);
      return;
    }

    setSearching(true);
    setLoading(true);
    setErrorMsg(null);

    const { data, error } = await supabase
      .from("profiles")
      .select("id, display_name, rating, total_battles, win_rate")
      .ilike("display_name", `%${term}%`)
      .order("rating", { ascending: false })
      .limit(100);

    if (error) {
      setErrorMsg(error.message);
      setRows([]);
    } else {
      setRows(data ?? []);
    }

    setLoading(false);
  };

  return (
    <section className="page-inner">
      <h1>Leaderboard</h1>

      <p className="page-description">
        Top 100 ranked producers by rating. Search by name to find specific players.
      </p>

      <form
        onSubmit={handleSearch}
        style={{
          display: "flex",
          gap: 8,
          alignItems: "center",
          marginBottom: 16,
        }}
      >
        <input
          type="text"
          placeholder="Search players by name..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{
            flex: 1,
            padding: "8px 10px",
            borderRadius: 999,
            border: "1px solid rgba(148,163,184,0.7)",
            background: "rgba(15,23,42,0.9)",
            color: "#e5e7eb",
          }}
        />

        <button type="submit" className="btn-secondary">
          {searching ? "Searching..." : "Search"}
        </button>
      </form>

      <div className="card" style={{ padding: 0, overflow: "hidden" }}>
        {loading && (
          <p style={{ padding: "16px" }}>
            {searching ? "Searching players..." : "Loading leaderboard..."}
          </p>
        )}

        {errorMsg && !loading && (
          <p style={{ padding: "16px", color: "#f97373" }}>{errorMsg}</p>
        )}

        {!loading && !errorMsg && rows.length === 0 && (
          <p style={{ padding: "16px" }}>No ranked players yet.</p>
        )}

        {!loading && !errorMsg && rows.length > 0 && (
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              fontSize: "0.95rem",
            }}
          >
            <thead
              style={{
                background: "rgba(15,23,42,0.95)",
                borderBottom: "1px solid rgba(148,163,184,0.3)",
              }}
            >
              <tr>
                <th style={{ textAlign: "left", padding: "10px 16px" }}>#</th>

                <th style={{ textAlign: "left", padding: "10px 16px" }}>
                  Player
                </th>

                <th style={{ textAlign: "right", padding: "10px 16px" }}>
                  Rating
                </th>

                <th style={{ textAlign: "right", padding: "10px 16px" }}>
                  Win Rate
                </th>

                <th style={{ textAlign: "right", padding: "10px 16px" }}>
                  Battles
                </th>
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
                  p.display_name || `Producer ${p.id.slice(0, 6).toUpperCase()}`;

                return (
                  <tr key={p.id}>
                    <td style={{ padding: "8px 16px", fontWeight: 600 }}>
                      {leaderboardRank}
                    </td>

                    <td style={{ padding: "8px 16px" }}>
                      <Link
                        href={`/players/${p.id}`}
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 10,
                          textDecoration: "none",
                          color: "#e5e7eb",
                          fontWeight: 800,
                        }}
                      >
                        <span
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            justifyContent: "center",
                            minWidth: 68,
                            padding: "6px 10px",
                            border: `1px solid ${rankTheme.border}`,
                            background: rankTheme.background,
                            color: rankTheme.text,
                            boxShadow: rankTheme.glow,
                            fontSize: "0.72rem",
                            fontWeight: 950,
                            textTransform: "uppercase",
                            letterSpacing: "0.08em",
                            lineHeight: 1,
                            whiteSpace: "nowrap",
                          }}
                        >
                          {displayRank}
                        </span>

                        <span>{name}</span>
                      </Link>
                    </td>

                    <td
                      style={{
                        padding: "8px 16px",
                        textAlign: "right",
                        fontVariantNumeric: "tabular-nums",
                      }}
                    >
                      {formatRating(p.rating)}
                    </td>

                    <td style={{ padding: "8px 16px", textAlign: "right" }}>
                      {formatWinRate(p.win_rate)}
                    </td>

                    <td style={{ padding: "8px 16px", textAlign: "right" }}>
                      {p.total_battles ?? 0}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </section>
  );
}