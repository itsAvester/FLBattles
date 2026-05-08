"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "../../lib/supabaseClient";
import { computeRankTier, RankTier } from "../../lib/rankUtils";

type LeaderProfile = {
  id: string;
  display_name: string | null;
  rating: number | null;
  total_battles: number | null;
  win_rate: number | null;
};

export default function LeaderboardPage() {
  const [rows, setRows] = useState<LeaderProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [searchTerm, setSearchTerm] = useState("");
  const [searching, setSearching] = useState(false);

  // --------------------------
  // LOAD PUBLIC LEADERBOARD
  // --------------------------
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

  // --------------------------
  // PUBLIC SEARCH
  // --------------------------
  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();

    const term = searchTerm.trim();

    // If search is blank, reload top 100
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
                <th style={{ textAlign: "left", padding: "10px 16px" }}>
                  Tier
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
                const rank = idx + 1;
                const tier: RankTier = computeRankTier(p.rating, rank);
                const name =
                  p.display_name || `Producer ${p.id.slice(0, 6).toUpperCase()}`;

                return (
                  <tr key={p.id}>
                    <td style={{ padding: "8px 16px", fontWeight: 600 }}>
                      {rank}
                    </td>

                    <td style={{ padding: "8px 16px" }}>
                      <Link
                        href={`/players/${p.id}`}
                        style={{
                          textDecoration: "none",
                          color: "#e5e7eb",
                        }}
                      >
                        {name}
                      </Link>
                    </td>

                    <td style={{ padding: "8px 16px" }}>{tier}</td>

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