"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { supabase } from "../../../lib/supabaseClient";
import { computeRankTier } from "../../../lib/rankUtils";

type PlayerProfile = {
  id: string;
  display_name: string | null;
  total_battles: number | null;
  win_rate: number | null;
  rating: number | null;
  spotify_url: string | null;
  soundcloud_url: string | null;
  youtube_url: string | null;
};

export default function PlayerPage() {
  const params = useParams<{ id: string }>();
  const playerId = params.id;

  const [profile, setProfile] = useState<PlayerProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      if (!playerId) return;

      setLoading(true);
      setErrorMsg(null);

      const { data, error } = await supabase
        .from("profiles")
        .select(
          "id, display_name, total_battles, win_rate, rating, spotify_url, soundcloud_url, youtube_url"
        )
        .eq("id", playerId as string)
        .single();

      if (error || !data) {
        setErrorMsg(error?.message || "Player not found.");
        setProfile(null);
        setLoading(false);
        return;
      }

      setProfile(data as PlayerProfile);
      setLoading(false);
    };

    load();
  }, [playerId]);

  const formatWinRate = (w: number | null) =>
    w == null ? "N/A" : `${w.toFixed(1)}%`;

  const formatRating = (r: number | null) =>
    r == null ? "Unranked (0)" : `${Math.round(r)}`;

  if (loading) {
    return (
      <section className="page-inner">
        <h1>Player Profile</h1>
        <p className="page-description">Loading player...</p>
      </section>
    );
  }

  if (!profile) {
    return (
      <section className="page-inner">
        <h1>Player Profile</h1>
        <p>{errorMsg ?? "Player not found."}</p>
        <p style={{ marginTop: 8 }}>
          <Link href="/leaderboard" className="btn-secondary">
            Back to Leaderboard
          </Link>
        </p>
      </section>
    );
  }

  const tier = computeRankTier(profile.rating);
  const name =
    profile.display_name || `Producer ${profile.id.slice(0, 6).toUpperCase()}`;

  const hasAnyLink =
    !!profile.spotify_url ||
    !!profile.soundcloud_url ||
    !!profile.youtube_url;

  return (
    <section className="page-inner">
      <h1>{name}</h1>
      <p className="page-description">
        Public profile and links for this producer.
      </p>

      <div
        className="card"
        style={{
          marginBottom: 24,
          display: "flex",
          flexDirection: "column",
          gap: 8,
        }}
      >
        <h2>Rank</h2>

        <p>
          <span style={{ color: "#9ca3af" }}>Tier:</span>{" "}
          <strong>{tier}</strong>
        </p>

        <p>
          <span style={{ color: "#9ca3af" }}>Rating:</span>{" "}
          <strong>{formatRating(profile.rating)}</strong>
        </p>

        <p>
          <span style={{ color: "#9ca3af" }}>Battles Played:</span>{" "}
          <strong>{profile.total_battles ?? 0}</strong>
        </p>

        <p>
          <span style={{ color: "#9ca3af" }}>Win Rate:</span>{" "}
          <strong>{formatWinRate(profile.win_rate)}</strong>
        </p>
      </div>

      <div className="card" style={{ marginBottom: 24 }}>
        <h2>Links</h2>

        {!hasAnyLink && (
          <p style={{ color: "#9ca3af" }}>
            This player has not added any external links yet.
          </p>
        )}

        {hasAnyLink && (
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: 8,
              marginTop: 8,
            }}
          >
            {profile.spotify_url && (
              <a
                href={profile.spotify_url}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-secondary"
              >
                Spotify
              </a>
            )}

            {profile.soundcloud_url && (
              <a
                href={profile.soundcloud_url}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-secondary"
              >
                SoundCloud
              </a>
            )}

            {profile.youtube_url && (
              <a
                href={profile.youtube_url}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-secondary"
              >
                YouTube
              </a>
            )}
          </div>
        )}
      </div>

      <Link href="/leaderboard" className="btn-secondary">
        Back to Leaderboard
      </Link>
    </section>
  );
}