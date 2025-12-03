"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabaseClient";
import { computeRankTier, RankTier } from "../../lib/rankUtils";

type ProfileRow = {
  id: string;
  display_name: string | null;
  total_battles: number | null;
  win_rate: number | null;
  rating: number | null;
  spotify_url: string | null;
  soundcloud_url: string | null;
  youtube_url: string | null;
};

export default function ProfilePage() {
  const router = useRouter();

  const [profile, setProfile] = useState<ProfileRow | null>(null);
  const [displayName, setDisplayName] = useState("");
  const [spotifyUrl, setSpotifyUrl] = useState("");
  const [soundcloudUrl, setSoundcloudUrl] = useState("");
  const [youtubeUrl, setYoutubeUrl] = useState("");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [globalRank, setGlobalRank] = useState<number | null>(null);
  const [rankTier, setRankTier] = useState<RankTier>("Unranked");
  const [userEmail, setUserEmail] = useState<string | null>(null);

  // Simple helper to normalize URLs (adds https:// if missing)
  const normalizeUrl = (value: string) => {
    const trimmed = value.trim();
    if (!trimmed) return "";
    if (/^https?:\/\//i.test(trimmed)) return trimmed;
    return "https://" + trimmed;
  };

  useEffect(() => {
    const loadProfile = async () => {
      setLoading(true);
      setErrorMsg(null);

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        router.push("/login");
        return;
      }
      setUserEmail(user.email ?? null);

      // 1) Get this user's profile
      const { data, error } = await supabase
        .from("profiles")
        .select(
          "id, display_name, total_battles, win_rate, rating, spotify_url, soundcloud_url, youtube_url"
        )
        .eq("id", user.id)
        .single();

      if (error || !data) {
        setErrorMsg(error?.message || "Failed to load profile.");
        setLoading(false);
        return;
      }

      const profileRow = data as ProfileRow;
      setProfile(profileRow);
      setDisplayName(profileRow.display_name ?? "");
      setSpotifyUrl(profileRow.spotify_url ?? "");
      setSoundcloudUrl(profileRow.soundcloud_url ?? "");
      setYoutubeUrl(profileRow.youtube_url ?? "");

      // 2) Compute global rank based on rating
      let rank: number | null = null;
      if (profileRow.rating != null) {
        const { count, error: countError } = await supabase
          .from("profiles")
          .select("id", { count: "exact", head: true })
          .gt("rating", profileRow.rating);

        if (!countError && typeof count === "number") {
          rank = count + 1;
        }
      }

      setGlobalRank(rank);
      setRankTier(computeRankTier(profileRow.rating, rank));

      setLoading(false);
    };

    loadProfile();
  }, [router]);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;

    setSaving(true);
    setErrorMsg(null);

    try {
      const updatePayload = {
        display_name: displayName || null,
        spotify_url: spotifyUrl ? normalizeUrl(spotifyUrl) : null,
        soundcloud_url: soundcloudUrl ? normalizeUrl(soundcloudUrl) : null,
        youtube_url: youtubeUrl ? normalizeUrl(youtubeUrl) : null,
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase
        .from("profiles")
        .update(updatePayload)
        .eq("id", profile.id);

      if (error) {
        setErrorMsg(error.message || "Failed to save profile.");
        return;
      }

      setProfile((prev) =>
        prev
          ? {
              ...prev,
              ...updatePayload,
            }
          : prev
      );

      // Update local state with normalized URLs (so inputs show https:// version)
      setSpotifyUrl(updatePayload.spotify_url ?? "");
      setSoundcloudUrl(updatePayload.soundcloud_url ?? "");
      setYoutubeUrl(updatePayload.youtube_url ?? "");
    } finally {
      setSaving(false);
    }
  };

  const formatWinRate = (w: number | null) =>
    w == null ? "N/A" : `${w.toFixed(1)}%`;

  const formatRating = (r: number | null) =>
    r == null ? "Unranked (0)" : `${Math.round(r)}`;

  const formatRankPosition = (pos: number | null) =>
    pos == null ? "N/A" : `#${pos}`;

  if (loading) {
    return (
      <section className="page-inner">
        <h1>Your Profile</h1>
        <p className="page-description">Loading your profile...</p>
      </section>
    );
  }

  if (!profile) {
    return (
      <section className="page-inner">
        <h1>Your Profile</h1>
        <p>No profile found (unexpected). Try logging out and back in.</p>
      </section>
    );
  }

  return (
    <section className="page-inner">
      <h1>Your Profile</h1>
      <p className="page-description">
        Manage your account, links, and view your battle stats and rank.
      </p>

      {errorMsg && (
        <p style={{ color: "#f97373", marginBottom: 16 }}>{errorMsg}</p>
      )}

      {/* Account + Rank + Links */}
      <div
        className="card"
        style={{
          marginBottom: 24,
          display: "flex",
          flexDirection: "column",
          gap: 12,
        }}
      >
        <h2>Account Info</h2>

        {userEmail && (
          <p>
            <span style={{ color: "#9ca3af" }}>Email:</span>{" "}
            <strong>{userEmail}</strong>
          </p>
        )}

        <form
          onSubmit={handleSaveProfile}
          style={{ display: "flex", flexDirection: "column", gap: 12 }}
        >
          <label>
            <span>Display Name</span>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              style={{
                width: "100%",
                marginTop: 4,
                padding: "8px 10px",
                borderRadius: 8,
                border: "1px solid rgba(148,163,184,0.7)",
                background: "rgba(15,23,42,0.9)",
                color: "#e5e7eb",
              }}
              maxLength={32}
            />
          </label>

          <div
            style={{
              marginTop: 8,
              paddingTop: 8,
              borderTop: "1px solid rgba(148,163,184,0.25)",
            }}
          >
            <h3 style={{ marginBottom: 8 }}>Links</h3>

            <label style={{ display: "block", marginBottom: 8 }}>
              <span>Spotify URL</span>
              <input
                type="url"
                placeholder="https://open.spotify.com/artist/..."
                value={spotifyUrl}
                onChange={(e) => setSpotifyUrl(e.target.value)}
                style={{
                  width: "100%",
                  marginTop: 4,
                  padding: "8px 10px",
                  borderRadius: 8,
                  border: "1px solid rgba(148,163,184,0.7)",
                  background: "rgba(15,23,42,0.9)",
                  color: "#e5e7eb",
                }}
              />
            </label>

            <label style={{ display: "block", marginBottom: 8 }}>
              <span>SoundCloud URL</span>
              <input
                type="url"
                placeholder="https://soundcloud.com/yourname"
                value={soundcloudUrl}
                onChange={(e) => setSoundcloudUrl(e.target.value)}
                style={{
                  width: "100%",
                  marginTop: 4,
                  padding: "8px 10px",
                  borderRadius: 8,
                  border: "1px solid rgba(148,163,184,0.7)",
                  background: "rgba(15,23,42,0.9)",
                  color: "#e5e7eb",
                }}
              />
            </label>

            <label style={{ display: "block", marginBottom: 8 }}>
              <span>YouTube URL</span>
              <input
                type="url"
                placeholder="https://www.youtube.com/@yourchannel"
                value={youtubeUrl}
                onChange={(e) => setYoutubeUrl(e.target.value)}
                style={{
                  width: "100%",
                  marginTop: 4,
                  padding: "8px 10px",
                  borderRadius: 8,
                  border: "1px solid rgba(148,163,184,0.7)",
                  background: "rgba(15,23,42,0.9)",
                  color: "#e5e7eb",
                }}
              />
            </label>
          </div>

          <button
            type="submit"
            className="btn-primary"
            disabled={saving}
            style={{ alignSelf: "flex-start", marginTop: 4 }}
          >
            {saving ? "Saving..." : "Save Profile"}
          </button>
        </form>

        {/* Rank summary */}
        <div
          style={{
            marginTop: 8,
            paddingTop: 8,
            borderTop: "1px solid rgba(148,163,184,0.25)",
          }}
        >
          <h3 style={{ marginBottom: 4 }}>Rank</h3>
          <p>
            <span style={{ color: "#9ca3af" }}>Tier:</span>{" "}
            <strong>{rankTier}</strong>
          </p>
          <p>
            <span style={{ color: "#9ca3af" }}>Rating:</span>{" "}
            <strong>{formatRating(profile.rating)}</strong>
          </p>
          <p>
            <span style={{ color: "#9ca3af" }}>Global Position:</span>{" "}
            <strong>{formatRankPosition(globalRank)}</strong>
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="card">
        <h2>Stats</h2>
        <ul
          style={{
            listStyle: "none",
            paddingLeft: 0,
            marginTop: 8,
            display: "grid",
            gap: 6,
          }}
        >
          <li>
            <span style={{ color: "#9ca3af" }}>Battles Played:</span>{" "}
            <strong>{profile.total_battles ?? 0}</strong>
          </li>
          <li>
            <span style={{ color: "#9ca3af" }}>Win Rate:</span>{" "}
            <strong>{formatWinRate(profile.win_rate)}</strong>
          </li>
        </ul>
      </div>
    </section>
  );
}
