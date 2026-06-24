"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "../../lib/supabaseClient";
import { computeRankTier, RankTier } from "../../lib/rankUtils";
import {
  BADGE_LIST,
  BadgeIcon,
  getBadgeByKey,
  type BadgeMeta,
} from "../../lib/badges";

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

type ProfileModule =
  | "overview"
  | "badges"
  | "stats"
  | "samples"
  | "edit"
  | "security";

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
  const [activeModule, setActiveModule] = useState<ProfileModule>("overview");

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

      setBadgeMessage(`${badge.name} is now your display badge.`);
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
      <section className="page-inner profile-hub-page">
        <div className="card profile-hub-loading">
          <div className="eyebrow">
            <span className="eyebrow-dot" />
            Profile terminal
          </div>

          <h1>Loading profile</h1>

          <div className="queue-status">
            <span className="spinner" />
            <span>Fetching account stats and rank data.</span>
          </div>
        </div>
      </section>
    );
  }

  if (!profile) {
    return (
      <section className="page-inner profile-hub-page">
        <div className="card profile-hub-loading">
          <div className="eyebrow">
            <span className="eyebrow-dot" />
            Profile terminal
          </div>

          <h1>No profile found</h1>

          <p>
            Try logging out and back in. If this keeps happening, your profile
            row may need to be recreated in Supabase.
          </p>
        </div>
      </section>
    );
  }

  const quickStats = [
    {
      label: "Rating",
      value: formatRating(profile.rating),
    },
    {
      label: "Rank",
      value: formatRankPosition(globalRank),
    },
    {
      label: "Win Rate",
      value: formatWinRate(profile.win_rate),
    },
    {
      label: "Battles",
      value: profile.total_battles ?? 0,
    },
  ];

  const overviewCards = [
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
      subtext: `${profile.total_battles ?? 0} battles played`,
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

  const modules: {
    key: ProfileModule;
    label: string;
    eyebrow: string;
    title: string;
    description: string;
  }[] = [
    {
      key: "overview",
      label: "Overview",
      eyebrow: "Account snapshot",
      title: "Overview",
      description:
        "Your producer identity, rank, badge, and quick account actions.",
    },
    {
      key: "badges",
      label: "Badges",
      eyebrow: "Display identity",
      title: "Badges",
      description:
        "Choose the badge that appears beside your name on the ladder.",
    },
    {
      key: "stats",
      label: "Battle Stats",
      eyebrow: "Competitive profile",
      title: "Battle Stats",
      description:
        "Track your current ladder position and ranked battle record.",
    },
    {
      key: "samples",
      label: "Samples",
      eyebrow: "Your contributions",
      title: "Samples",
      description:
        "Review the samples you have submitted for future battles.",
    },
    {
      key: "edit",
      label: "Edit Profile",
      eyebrow: "Producer links",
      title: "Edit Profile",
      description:
        "Update your public display name and music profile links.",
    },
    {
      key: "security",
      label: "Security",
      eyebrow: "Account access",
      title: "Security",
      description: "Manage password access for your FL Battles account.",
    },
  ];

  const activeModuleMeta =
    modules.find((module) => module.key === activeModule) ?? modules[0];

  return (
    <section className="page-inner profile-hub-page">
      <div className="profile-hub-header">
        <div className="profile-hub-title-block">
          <div className="eyebrow">
            <span className="eyebrow-dot" />
            Player profile · account hub
          </div>

          <div className="profile-hub-name-row">
            <BadgeIcon
              badgeKey={profile.selected_badge_key}
              size={46}
              selected
            />

            <div>
              <h1>{producerName}</h1>
              <p>
                {rankTier} · {formatRankPosition(globalRank)} Global ·{" "}
                {formatRating(profile.rating)} Rating
              </p>
            </div>
          </div>
        </div>

        <div className="profile-hub-actions">
          <Link href="/leaderboard" className="btn-secondary">
            View Ladder
          </Link>

          <Link href="/battles" className="btn-primary">
            Battle Now
          </Link>
        </div>
      </div>

      {errorMsg && <p className="profile-hub-error">{errorMsg}</p>}

      <div className="profile-hub-layout">
        <aside className="card profile-hub-sidebar">
          <div className="profile-hub-sidebar-inner">
            <div className="profile-hub-mini-profile">
              <BadgeIcon
                badgeKey={profile.selected_badge_key}
                size={54}
                selected
              />

              <div>
                <strong>{producerName}</strong>
                <span>{rankTier}</span>
              </div>
            </div>

            <div className="profile-hub-mini-stats">
              {quickStats.map((stat) => (
                <div key={stat.label}>
                  <span>{stat.label}</span>
                  <strong>{stat.value}</strong>
                </div>
              ))}
            </div>

            <nav className="profile-hub-nav" aria-label="Profile modules">
              {modules.map((module) => (
                <button
                  key={module.key}
                  type="button"
                  className={
                    activeModule === module.key
                      ? "profile-hub-nav-item profile-hub-nav-item-active"
                      : "profile-hub-nav-item"
                  }
                  onClick={() => setActiveModule(module.key)}
                >
                  <span>{module.label}</span>
                  <em>
                    {module.key === "badges"
                      ? `${unlockedCount}/${BADGE_LIST.length}`
                      : module.key === "samples"
                        ? `${sampleCounts.total}`
                        : module.key === "stats"
                          ? formatRankPosition(globalRank)
                          : "Open"}
                  </em>
                </button>
              ))}
            </nav>
          </div>
        </aside>

        <main className="card profile-hub-main">
          <div className="profile-hub-main-header">
            <div>
              <p className="panel-label">{activeModuleMeta.eyebrow}</p>
              <h2>{activeModuleMeta.title}</h2>
              <p>{activeModuleMeta.description}</p>
            </div>

            <span className="profile-hub-status-pill">
              {activeModule === "badges"
                ? `${unlockedCount}/${BADGE_LIST.length} unlocked`
                : activeModule === "samples"
                  ? "Samples"
                  : activeModule === "security"
                    ? "Password"
                    : "Live"}
            </span>
          </div>

          <div className="profile-hub-module">
            {activeModule === "overview" && (
              <div className="profile-hub-overview">
                <div className="profile-hub-overview-grid">
                  {overviewCards.map((stat) => (
                    <div className="profile-hub-stat-card" key={stat.label}>
                      <span>{stat.label}</span>
                      <strong>{stat.value}</strong>
                      <small>{stat.subtext}</small>
                    </div>
                  ))}
                </div>

                <div className="profile-hub-overview-split">
                  <div className="profile-hub-feature-card">
                    <p className="panel-label">Current display badge</p>

                    <div className="profile-hub-current-badge">
                      <BadgeIcon
                        badgeKey={profile.selected_badge_key}
                        size={56}
                        selected
                      />

                      <div>
                        <strong>
                          {selectedBadge?.name ?? "Default Producer"}
                        </strong>
                        <span>
                          {selectedBadge?.description ??
                            "Your default producer badge is active."}
                        </span>
                      </div>
                    </div>

                    <button
                      type="button"
                      className="btn-secondary profile-hub-inline-button"
                      onClick={() => setActiveModule("badges")}
                    >
                      Change Badge
                    </button>
                  </div>

                  <div className="profile-hub-feature-card">
                    <p className="panel-label">Quick actions</p>

                    <div className="profile-hub-action-stack">
                      <Link href="/battles" className="btn-primary">
                        Battle Now
                      </Link>

                      <Link href="/samples/submit" className="btn-secondary">
                        Submit Sample
                      </Link>

                      <button
                        type="button"
                        className="btn-secondary"
                        onClick={() => setActiveModule("edit")}
                      >
                        Edit Profile
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeModule === "badges" && (
              <div className="profile-hub-badges">
                <div className="profile-hub-badge-summary">
                  <div>
                    <p className="panel-label">Selected badge</p>

                    <div className="profile-hub-current-badge">
                      <BadgeIcon
                        badgeKey={profile.selected_badge_key}
                        size={58}
                        selected
                      />

                      <div>
                        <strong>
                          {selectedBadge?.name ?? "Default Producer"}
                        </strong>
                        <span>
                          Pick one unlocked badge to appear beside your name on
                          the leaderboard.
                        </span>
                      </div>
                    </div>
                  </div>

                  {badgeMessage && (
                    <p className="profile-hub-success-message">
                      {badgeMessage}
                    </p>
                  )}
                </div>

                <div className="profile-hub-badge-grid">
                  {BADGE_LIST.map((badge) => {
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
                        className={
                          isSelected
                            ? "profile-hub-badge-card profile-hub-badge-card-selected"
                            : isUnlocked
                              ? "profile-hub-badge-card"
                              : "profile-hub-badge-card profile-hub-badge-card-locked"
                        }
                      >
                        <BadgeIcon
                          badgeKey={badge.key}
                          size={44}
                          locked={!isUnlocked}
                          selected={isSelected}
                        />

                        <span>
                          <strong>
                            {badge.name}
                            {isSelected && <em>Selected</em>}
                          </strong>

                          <small>
                            {isSavingThis
                              ? "Saving..."
                              : isUnlocked
                                ? badge.description
                                : badge.unlockText}
                          </small>
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {activeModule === "stats" && (
              <div className="profile-hub-stats">
                <div className="profile-hub-feature-card profile-hub-rank-card">
                  <p className="panel-label">Current ladder position</p>
                  <strong>{formatRankPosition(globalRank)}</strong>
                  <span>
                    {rankTier} · {formatRating(profile.rating)} rating
                  </span>
                </div>

                <div className="profile-data-list profile-hub-data-list">
                  {competitiveRows.map(([label, value]) => (
                    <div className="profile-data-row" key={label}>
                      <span>{label}</span>
                      <strong>{value}</strong>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeModule === "samples" && (
              <div className="profile-hub-samples">
                <div className="profile-sample-stat-grid profile-hub-sample-grid">
                  {sampleStats.map(([label, value]) => (
                    <div className="profile-sample-stat" key={label}>
                      <strong>{value}</strong>
                      <span>{label}</span>
                    </div>
                  ))}
                </div>

                <div className="profile-total-submitted-row profile-hub-total-row">
                  <div>
                    <span>Total submitted</span>
                    <strong>{sampleCounts.total}</strong>
                  </div>

                  <Link href="/samples/submit" className="btn-secondary">
                    Submit New
                  </Link>
                </div>
              </div>
            )}

            {activeModule === "edit" && (
              <div className="profile-hub-edit">
                {userEmail && (
                  <div className="profile-email-pill profile-hub-email-pill">
                    <span>Email</span>
                    <strong>{userEmail}</strong>
                  </div>
                )}

                <form onSubmit={handleSaveProfile} className="profile-form">
                  <div className="profile-form-grid profile-hub-form-grid">
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

                  <div className="profile-form-footer profile-hub-form-footer">
                    <button
                      type="submit"
                      className="btn-primary"
                      disabled={saving}
                    >
                      {saving ? "Saving..." : "Save Profile"}
                    </button>

                    <p>
                      Links are normalized automatically, so you can paste them
                      with or without <code>https://</code>.
                    </p>
                  </div>
                </form>
              </div>
            )}

            {activeModule === "security" && (
              <div className="profile-hub-security">
                <div className="profile-hub-feature-card">
                  <p className="panel-label">Password access</p>
                  <h3>Secure your account</h3>
                  <p>
                    Update your password to keep your FL Battles account
                    protected.
                  </p>

                  <Link href="/change-password" className="btn-secondary">
                    Change Password
                  </Link>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>
    </section>
  );
}
