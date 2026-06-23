"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
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
  selected_badge_key: string | null;
};

type UserBadgeRow = {
  badge_key: string;
  unlocked_at: string | null;
};

type SampleCounts = {
  pending: number;
  approved: number;
  rejected: number;
  total: number;
};

type BadgeMeta = {
  key: string;
  icon: string;
  name: string;
  description: string;
  unlockText: string;
  tone:
    | "champion"
    | "goat"
    | "perfect"
    | "fire"
    | "veteran"
    | "regular"
    | "rising"
    | "default";
};

const BADGE_CATALOG: BadgeMeta[] = [
  {
    key: "champion",
    icon: "👑",
    name: "Champion",
    description: "The current king of the ranked ladder.",
    unlockText: "Reach #1 on the leaderboard.",
    tone: "champion",
  },
  {
    key: "top_10",
    icon: "🐐",
    name: "Top 10",
    description: "A visible mark for elite ranked producers.",
    unlockText: "Reach the top 10 on the leaderboard.",
    tone: "goat",
  },
  {
    key: "perfect_record",
    icon: "🧊",
    name: "Perfect Record",
    description: "Clean wins, no blemishes.",
    unlockText: "Hold a 100% win rate with 3+ battles.",
    tone: "perfect",
  },
  {
    key: "hot_streak",
    icon: "🔥",
    name: "Hot Streak",
    description: "For producers who are currently on a run.",
    unlockText: "Coming soon: win 3 battles in a row.",
    tone: "fire",
  },
  {
    key: "veteran",
    icon: "🎧",
    name: "Veteran",
    description: "Battle-tested and active.",
    unlockText: "Play 10 ranked battles.",
    tone: "veteran",
  },
  {
    key: "ranked_regular",
    icon: "💿",
    name: "Ranked Regular",
    description: "You are officially in the rotation.",
    unlockText: "Play 5 ranked battles.",
    tone: "regular",
  },
  {
    key: "rising_producer",
    icon: "⚡",
    name: "Rising Producer",
    description: "Momentum is building.",
    unlockText: "Reach 50 rating.",
    tone: "rising",
  },
  {
    key: "first_win",
    icon: "🥇",
    name: "First Win",
    description: "Your first ranked win on FL Battles.",
    unlockText: "Win your first battle.",
    tone: "champion",
  },
];

function getBadgeByKey(key: string | null | undefined): BadgeMeta | null {
  if (!key) return null;
  return BADGE_CATALOG.find((badge) => badge.key === key) ?? null;
}

function getBadgeStyle(
  tone: BadgeMeta["tone"],
  options?: { locked?: boolean; selected?: boolean }
): React.CSSProperties {
  const locked = options?.locked ?? false;
  const selected = options?.selected ?? false;

  const base: React.CSSProperties = {
    width: 44,
    height: 44,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 14,
    border: "1px solid rgba(255,255,255,0.12)",
    background: "rgba(255,255,255,0.05)",
    boxShadow: selected
      ? "0 0 0 3px rgba(140,255,107,0.12), inset 0 0 0 1px rgba(255,255,255,0.035)"
      : "inset 0 0 0 1px rgba(255,255,255,0.025)",
    fontSize: "1.2rem",
    flexShrink: 0,
    filter: locked ? "grayscale(1)" : "none",
    opacity: locked ? 0.38 : 1,
  };

  if (locked) return base;

  switch (tone) {
    case "champion":
      return {
        ...base,
        border: "1px solid rgba(246,198,91,0.48)",
        background:
          "radial-gradient(circle at 30% 20%, rgba(246,198,91,0.28), rgba(255,77,28,0.11))",
      };
    case "goat":
      return {
        ...base,
        border: "1px solid rgba(255,116,67,0.38)",
        background: "rgba(255,77,28,0.1)",
      };
    case "perfect":
      return {
        ...base,
        border: "1px solid rgba(186,230,253,0.38)",
        background: "rgba(14,165,233,0.1)",
      };
    case "fire":
      return {
        ...base,
        border: "1px solid rgba(255,77,28,0.44)",
        background: "rgba(255,77,28,0.12)",
      };
    case "veteran":
      return {
        ...base,
        border: "1px solid rgba(209,213,219,0.28)",
        background: "rgba(209,213,219,0.08)",
      };
    case "regular":
      return {
        ...base,
        border: "1px solid rgba(246,198,91,0.32)",
        background: "rgba(246,198,91,0.08)",
      };
    case "rising":
      return {
        ...base,
        border: "1px solid rgba(140,255,107,0.32)",
        background: "rgba(140,255,107,0.08)",
      };
    default:
      return base;
  }
}

export default function ProfilePage() {
  const router = useRouter();

  const [profile, setProfile] = useState<ProfileRow | null>(null);
  const [displayName, setDisplayName] = useState("");
  const [spotifyUrl, setSpotifyUrl] = useState("");
  const [soundcloudUrl, setSoundcloudUrl] = useState("");
  const [youtubeUrl, setYoutubeUrl] = useState("");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [badgeSaving, setBadgeSaving] = useState<string | null>(null);
  const [badgeMessage, setBadgeMessage] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [globalRank, setGlobalRank] = useState<number | null>(null);
  const [rankTier, setRankTier] = useState<RankTier>("Unranked");
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [unlockedBadges, setUnlockedBadges] = useState<UserBadgeRow[]>([]);
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
          "id, display_name, total_battles, win_rate, rating, spotify_url, soundcloud_url, youtube_url, selected_badge_key"
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

      const { data: badgeRows, error: badgeError } = await supabase
        .from("user_badges")
        .select("badge_key, unlocked_at")
        .eq("user_id", user.id)
        .order("unlocked_at", { ascending: true });

      if (!badgeError && badgeRows) {
        setUnlockedBadges(badgeRows as UserBadgeRow[]);
      } else if (badgeError) {
        console.error("Failed to load user badges:", badgeError);
      }

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

  const unlockedBadgeKeys = useMemo(
    () => new Set(unlockedBadges.map((badge) => badge.badge_key)),
    [unlockedBadges]
  );

  const selectedBadge = getBadgeByKey(profile?.selected_badge_key);
  const unlockedCount = unlockedBadges.length;

  const handleSelectBadge = async (badge: BadgeMeta) => {
    if (!profile) return;

    const isUnlocked = unlockedBadgeKeys.has(badge.key);
    const isSelected = profile.selected_badge_key === badge.key;

    if (!isUnlocked || isSelected) return;

    setBadgeSaving(badge.key);
    setBadgeMessage(null);
    setErrorMsg(null);

    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          selected_badge_key: badge.key,
          updated_at: new Date().toISOString(),
        })
        .eq("id", profile.id);

      if (error) {
        setErrorMsg(error.message || "Failed to select badge.");
        return;
      }

      setProfile((prev) =>
        prev
          ? {
              ...prev,
              selected_badge_key: badge.key,
            }
          : prev
      );

      setBadgeMessage(`${badge.icon} ${badge.name} is now your display badge.`);
    } finally {
      setBadgeSaving(null);
    }
  };

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

      <div
        className="card profile-card"
        style={{
          overflow: "hidden",
          marginTop: 18,
        }}
      >
        <div className="profile-card-header">
          <p className="panel-label">Badge collection</p>
          <span className="sample-badge">
            {unlockedCount}/{BADGE_CATALOG.length} unlocked
          </span>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "minmax(0, 0.9fr) minmax(0, 1.1fr)",
            gap: 18,
            alignItems: "start",
            position: "relative",
            zIndex: 1,
          }}
        >
          <div>
            <h2>Choose your display icon</h2>

            <p className="profile-card-copy">
              Pick one unlocked badge to appear beside your name on the
              leaderboard. Locked badges stay visible so you know what to chase
              next.
            </p>

            <div
              style={{
                marginTop: 18,
                padding: 16,
                border: "1px solid rgba(255,255,255,0.1)",
                background:
                  "linear-gradient(90deg, rgba(255,77,28,0.08), rgba(255,255,255,0.025))",
                borderRadius: 16,
                display: "flex",
                gap: 14,
                alignItems: "center",
              }}
            >
              <span
                style={getBadgeStyle(selectedBadge?.tone ?? "default", {
                  selected: true,
                })}
              >
                {selectedBadge?.icon ?? "🎛️"}
              </span>

              <div>
                <p
                  style={{
                    margin: "0 0 5px",
                    color: "rgba(255,255,255,0.42)",
                    fontSize: "0.68rem",
                    fontWeight: 950,
                    textTransform: "uppercase",
                    letterSpacing: "0.14em",
                  }}
                >
                  Current display badge
                </p>

                <strong
                  style={{
                    color: "var(--text)",
                    fontSize: "1rem",
                  }}
                >
                  {selectedBadge?.name ?? "Default Producer"}
                </strong>
              </div>
            </div>

            {badgeMessage && (
              <p
                style={{
                  margin: "14px 0 0",
                  color: "rgba(140,255,107,0.88)",
                  fontWeight: 800,
                  lineHeight: 1.5,
                }}
              >
                {badgeMessage}
              </p>
            )}
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
              gap: 10,
            }}
          >
            {BADGE_CATALOG.map((badge) => {
              const isUnlocked = unlockedBadgeKeys.has(badge.key);
              const isSelected = profile.selected_badge_key === badge.key;
              const isSavingThis = badgeSaving === badge.key;

              return (
                <button
                  key={badge.key}
                  type="button"
                  onClick={() => handleSelectBadge(badge)}
                  disabled={!isUnlocked || isSelected || !!badgeSaving}
                  title={
                    isUnlocked
                      ? `Select ${badge.name}`
                      : `Locked: ${badge.unlockText}`
                  }
                  style={{
                    minHeight: 0,
                    display: "grid",
                    gridTemplateColumns: "44px 1fr",
                    gap: 12,
                    alignItems: "center",
                    padding: 12,
                    textAlign: "left",
                    borderRadius: 16,
                    border: isSelected
                      ? "1px solid rgba(140,255,107,0.42)"
                      : isUnlocked
                        ? "1px solid rgba(255,255,255,0.12)"
                        : "1px solid rgba(255,255,255,0.07)",
                    background: isSelected
                      ? "linear-gradient(90deg, rgba(140,255,107,0.1), rgba(255,255,255,0.035))"
                      : isUnlocked
                        ? "rgba(255,255,255,0.035)"
                        : "rgba(255,255,255,0.018)",
                    color: "var(--text)",
                    cursor:
                      !isUnlocked || isSelected || !!badgeSaving
                        ? "default"
                        : "pointer",
                    opacity: 1,
                    transform: "none",
                  }}
                >
                  <span
                    style={getBadgeStyle(badge.tone, {
                      locked: !isUnlocked,
                      selected: isSelected,
                    })}
                  >
                    {isUnlocked ? badge.icon : "🔒"}
                  </span>

                  <span style={{ minWidth: 0 }}>
                    <span
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        flexWrap: "wrap",
                        marginBottom: 5,
                      }}
                    >
                      <strong
                        style={{
                          color: isUnlocked
                            ? "var(--text)"
                            : "rgba(255,255,255,0.42)",
                          fontSize: "0.9rem",
                          lineHeight: 1.15,
                          letterSpacing: "-0.02em",
                        }}
                      >
                        {badge.name}
                      </strong>

                      {isSelected && (
                        <span
                          style={{
                            color: "rgba(140,255,107,0.88)",
                            fontSize: "0.58rem",
                            fontWeight: 950,
                            textTransform: "uppercase",
                            letterSpacing: "0.12em",
                          }}
                        >
                          Selected
                        </span>
                      )}
                    </span>

                    <span
                      style={{
                        display: "block",
                        color: isUnlocked
                          ? "rgba(255,255,255,0.56)"
                          : "rgba(255,255,255,0.34)",
                        fontSize: "0.74rem",
                        fontWeight: 700,
                        lineHeight: 1.35,
                        textTransform: "none",
                        letterSpacing: 0,
                      }}
                    >
                      {isSavingThis
                        ? "Saving..."
                        : isUnlocked
                          ? badge.description
                          : badge.unlockText}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        </div>
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