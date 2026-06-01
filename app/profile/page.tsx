"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
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

type SampleCounts = {
  pending: number;
  approved: number;
  rejected: number;
  total: number;
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
  const [sampleCounts, setSampleCounts] = useState<SampleCounts>({
    pending: 0,
    approved: 0,
    rejected: 0,
    total: 0,
  });

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

      const { data: sampleRows, error: sampleError } = await supabase
        .from("sample_submissions")
        .select("status")
        .eq("user_id", user.id);

      if (!sampleError && sampleRows) {
        const pending = sampleRows.filter(
          (row) => row.status === "pending"
        ).length;
        const approved = sampleRows.filter(
          (row) => row.status === "approved"
        ).length;
        const rejected = sampleRows.filter(
          (row) => row.status === "rejected"
        ).length;

        setSampleCounts({
          pending,
          approved,
          rejected,
          total: sampleRows.length,
        });
      } else if (sampleError) {
        console.error("Failed to load sample submissions:", sampleError);
      }

      setGlobalRank(rank);
      setRankTier(computeRankTier(profileRow.rating, rank));
      setLoading(false);
    };

    loadProfile();
  }, [router]);

  const handleSaveProfile = async (e: FormEvent<HTMLFormElement>) => {
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
    r == null ? "Unranked" : `${Math.round(r)}`;

  const formatRankPosition = (pos: number | null) =>
    pos == null ? "N/A" : `#${pos}`;

  const producerName =
    displayName.trim() ||
    profile?.display_name ||
    userEmail?.split("@")[0] ||
    "Producer";

  if (loading) {
    return (
      <section className="page-inner profile-page-shell">
        <div className="eyebrow">
          <span className="eyebrow-dot" />
          Profile terminal
        </div>

        <h1 className="profile-page-title">Loading Profile</h1>

        <div className="queue-status">
          <span className="spinner" />
          <span>Fetching account stats and rank data.</span>
        </div>
      </section>
    );
  }

  if (!profile) {
    return (
      <section className="page-inner profile-page-shell">
        <div className="eyebrow">
          <span className="eyebrow-dot" />
          Profile terminal
        </div>

        <h1 className="profile-page-title">No Profile Found</h1>

        <p className="profile-page-description">
          Try logging out and back in. If this keeps happening, your profile row
          may need to be recreated in Supabase.
        </p>
      </section>
    );
  }

  const topStats = [
    {
      label: "Rating",
      value: formatRating(profile.rating),
      subtext: rankTier,
    },
    {
      label: "Global Rank",
      value: formatRankPosition(globalRank),
      subtext: "Ranked ladder",
    },
    {
      label: "Win Rate",
      value: formatWinRate(profile.win_rate),
      subtext: `${profile.total_battles ?? 0} battles`,
    },
    {
      label: "Samples",
      value: sampleCounts.total,
      subtext: `${sampleCounts.approved} approved`,
    },
  ];

  const competitiveRows = [
    ["Tier", rankTier],
    ["Rating", formatRating(profile.rating)],
    ["Global Position", formatRankPosition(globalRank)],
    ["Battles Played", profile.total_battles ?? 0],
    ["Win Rate", formatWinRate(profile.win_rate)],
  ];

  const sampleStats = [
    ["Pending", sampleCounts.pending],
    ["Approved", sampleCounts.approved],
    ["Rejected", sampleCounts.rejected],
  ];

  return (
    <section className="page-inner profile-page-shell">
      <div className="profile-hero-compact">
        <div>
          <div className="eyebrow">
            <span className="eyebrow-dot" />
            Player profile · account hub
          </div>

          <h1 className="profile-page-title">Profile</h1>

          <p className="profile-page-description">
            {producerName} · {rankTier} · {formatRankPosition(globalRank)}{" "}
            Global · {formatRating(profile.rating)} Rating
          </p>
        </div>

        <div className="profile-hero-actions">
          <Link href="/leaderboard" className="btn-secondary">
            View Ladder
          </Link>

          <Link href="/battles" className="btn-primary">
            Battle Now
          </Link>
        </div>
      </div>

      {errorMsg && <p className="profile-error-message">{errorMsg}</p>}

      <div className="profile-top-stat-grid">
        {topStats.map((stat) => (
          <div className="profile-top-stat-card" key={stat.label}>
            <span>{stat.label}</span>
            <strong>{stat.value}</strong>
            <small>{stat.subtext}</small>
          </div>
        ))}
      </div>

      <div className="profile-main-grid">
        <div className="card profile-card profile-competitive-card">
          <div className="profile-card-header">
            <p className="panel-label">Competitive profile</p>
            <span className="sample-badge">Live</span>
          </div>

          <h2>Rank & battle stats</h2>

          <p className="profile-card-copy">
            Track your current ladder position, rating, battle history, and win
            rate from ranked sample-flip battles.
          </p>

          <div className="profile-data-list">
            {competitiveRows.map(([label, value]) => (
              <div className="profile-data-row" key={label}>
                <span>{label}</span>
                <strong>{value}</strong>
              </div>
            ))}
          </div>
        </div>

        <div className="card profile-card profile-samples-card">
          <div className="profile-card-header">
            <p className="panel-label">Your contributions</p>
            <span className="sample-badge">Samples</span>
          </div>

          <h2>Submitted samples</h2>

          <p className="profile-card-copy">
            Track the samples you have submitted for future FL Battles.
          </p>

          <div className="profile-sample-stat-grid">
            {sampleStats.map(([label, value]) => (
              <div className="profile-sample-stat" key={label}>
                <strong>{value}</strong>
                <span>{label}</span>
              </div>
            ))}
          </div>

          <div className="profile-total-submitted-row">
            <div>
              <span>Total submitted</span>
              <strong>{sampleCounts.total}</strong>
            </div>

            <Link href="/samples/submit" className="btn-secondary">
              Submit New
            </Link>
          </div>
        </div>
      </div>

      <div className="card profile-card profile-edit-card">
        <div className="profile-card-header">
          <p className="panel-label">Account info</p>
          <span className="sample-badge">Editable</span>
        </div>

        <div className="profile-edit-head">
          <div>
            <h2>Edit profile</h2>

            <p className="profile-card-copy">
              Update your producer name and music links shown around your FL
              Battles account.
            </p>
          </div>

          {userEmail && (
            <div className="profile-email-pill">
              <span>Email</span>
              <strong>{userEmail}</strong>
            </div>
          )}
        </div>

        <form onSubmit={handleSaveProfile} className="profile-form">
          <div className="profile-form-grid">
            <label className="profile-field">
              <span>Display Name</span>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                maxLength={32}
                placeholder="Your producer name"
              />
            </label>

            <label className="profile-field">
              <span>Spotify URL</span>
              <input
                type="url"
                placeholder="https://open.spotify.com/artist/..."
                value={spotifyUrl}
                onChange={(e) => setSpotifyUrl(e.target.value)}
              />
            </label>

            <label className="profile-field">
              <span>SoundCloud URL</span>
              <input
                type="url"
                placeholder="https://soundcloud.com/yourname"
                value={soundcloudUrl}
                onChange={(e) => setSoundcloudUrl(e.target.value)}
              />
            </label>

            <label className="profile-field">
              <span>YouTube URL</span>
              <input
                type="url"
                placeholder="https://www.youtube.com/@yourchannel"
                value={youtubeUrl}
                onChange={(e) => setYoutubeUrl(e.target.value)}
              />
            </label>
          </div>

          <div className="profile-form-footer">
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving ? "Saving..." : "Save Profile"}
            </button>

            <p>
              Links are normalized automatically, so you can paste them with or
              without <code>https://</code>.
            </p>
          </div>
        </form>
      </div>

      <div className="card profile-card profile-security-card">
        <div>
          <div className="profile-card-header">
            <p className="panel-label">Account security</p>
            <span className="profile-danger-badge">Password</span>
          </div>

          <h2>Secure access</h2>

          <p className="profile-card-copy">
            Update your password to keep your FL Battles account secure.
          </p>
        </div>

        <Link href="/change-password" className="btn-secondary">
          Change Password
        </Link>
      </div>
    </section>
  );
}