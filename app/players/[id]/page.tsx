"use client";

import { useEffect, useRef, useState, type ChangeEvent } from "react";
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

  selected_badge?: string | null;
  selected_badge_key?: string | null;
  active_badge?: string | null;
  active_badge_key?: string | null;
  equipped_badge?: string | null;
  equipped_badge_key?: string | null;
  badge_key?: string | null;

  [key: string]: unknown;
};

type ApprovedSample = {
  id: string;
  file_path: string;
  created_at: string;
  audioUrl: string;
};

const BADGE_IMAGE_MAP: Record<string, { src: string; label: string }> = {
  champion: {
    src: "/badges/champion.png",
    label: "Champion",
  },
  top_10: {
    src: "/badges/top_10.png",
    label: "Top 10",
  },
  perfect_record: {
    src: "/badges/perfect_record.png",
    label: "Perfect Record",
  },
  hot_streak: {
    src: "/badges/hot_streak.png",
    label: "Hot Streak",
  },
  veteran: {
    src: "/badges/veteran.png",
    label: "Veteran",
  },
  ranked_regular: {
    src: "/badges/ranked_regular.png",
    label: "Ranked Regular",
  },
  rising_producer: {
    src: "/badges/rising_producer.png",
    label: "Rising Producer",
  },
  first_win: {
    src: "/badges/first_win.png",
    label: "First Win",
  },
};

function formatWinRate(value: number | null) {
  if (value == null) return "N/A";

  const normalized = value <= 1 ? value * 100 : value;
  return `${normalized.toFixed(1)}%`;
}

function formatRating(value: number | null) {
  if (value == null) return "Unranked";
  return `${Math.round(value)}`;
}

function formatGlobalRank(value: number | null) {
  if (value == null) return "N/A";
  return `#${value}`;
}

function formatDate(dateString: string) {
  const date = new Date(dateString);

  if (Number.isNaN(date.getTime())) {
    return "Unknown date";
  }

  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatDuration(seconds: number | undefined) {
  if (!seconds || !Number.isFinite(seconds)) return "0:00";

  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.floor(seconds % 60);

  return `${minutes}:${String(remainingSeconds).padStart(2, "0")}`;
}

function getInitials(name: string) {
  const cleanName = name.trim();

  if (!cleanName) return "FL";

  const parts = cleanName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2);

  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }

  return parts.map((part) => part[0]).join("").toUpperCase();
}

function getSafeExternalUrl(url: string | null) {
  if (!url) return null;

  const trimmed = url.trim();

  if (!trimmed) return null;

  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }

  return `https://${trimmed}`;
}

function resolveSelectedBadgeKey(profile: PlayerProfile | null) {
  if (!profile) return null;

  const candidateKeys = [
    "selected_badge",
    "selected_badge_key",
    "active_badge",
    "active_badge_key",
    "equipped_badge",
    "equipped_badge_key",
    "badge_key",
  ] as const;

  for (const key of candidateKeys) {
    const value = profile[key];
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }

  return null;
}

export default function PlayerPage() {
  const params = useParams<{ id: string }>();
  const playerId = params.id;

  const audioRefs = useRef<Record<string, HTMLAudioElement | null>>({});
  const seekLockRef = useRef<Record<string, boolean>>({});

  const [profile, setProfile] = useState<PlayerProfile | null>(null);
  const [approvedSamples, setApprovedSamples] = useState<ApprovedSample[]>([]);
  const [globalRank, setGlobalRank] = useState<number | null>(null);

  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [activeSampleId, setActiveSampleId] = useState<string | null>(null);
  const [audioDurations, setAudioDurations] = useState<Record<string, number>>({});
  const [audioTimes, setAudioTimes] = useState<Record<string, number>>({});
  const [audioErrors, setAudioErrors] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const load = async () => {
      if (!playerId) return;

      setLoading(true);
      setErrorMsg(null);
      setProfile(null);
      setApprovedSamples([]);
      setGlobalRank(null);
      setActiveSampleId(null);
      setAudioDurations({});
      setAudioTimes({});
      setAudioErrors({});

      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", playerId as string)
        .single();

      if (error || !data) {
        setErrorMsg(error?.message || "Player not found.");
        setProfile(null);
        setLoading(false);
        return;
      }

      const profileRow = data as PlayerProfile;
      setProfile(profileRow);

      if (profileRow.rating != null) {
        const { count, error: rankError } = await supabase
          .from("profiles")
          .select("id", { count: "exact", head: true })
          .gt("rating", profileRow.rating);

        if (!rankError && typeof count === "number") {
          setGlobalRank(count + 1);
        }
      }

      const { data: samplesData, error: samplesError } = await supabase
        .from("sample_submissions")
        .select("id, file_path, created_at, status")
        .eq("user_id", playerId as string)
        .eq("status", "approved")
        .order("created_at", { ascending: false });

      if (samplesError) {
        console.error("Approved samples error:", samplesError);
      }

      if (!samplesError && samplesData) {
        const samplesWithUrls = samplesData.map((sample: any) => {
          const { data: publicUrlData } = supabase.storage
            .from("sample-submissions")
            .getPublicUrl(sample.file_path);

          return {
            id: sample.id,
            file_path: sample.file_path,
            created_at: sample.created_at,
            audioUrl: publicUrlData.publicUrl,
          };
        });

        setApprovedSamples(samplesWithUrls);
      }

      setLoading(false);
    };

    load();
  }, [playerId]);

  const pauseAllOtherSamples = (sampleId: string) => {
    Object.entries(audioRefs.current).forEach(([id, audio]) => {
      if (id !== sampleId && audio && !audio.paused) {
        audio.pause();
      }
    });
  };

  const handleToggleSample = async (sampleId: string) => {
    const audio = audioRefs.current[sampleId];

    if (!audio || audioErrors[sampleId]) return;

    if (audio.paused) {
      pauseAllOtherSamples(sampleId);

      try {
        await audio.play();
        setActiveSampleId(sampleId);
      } catch (error) {
        console.error("Audio play failed:", error);
      }

      return;
    }

    audio.pause();
    setActiveSampleId(null);
  };

  const handleSeekChange = (sampleId: string, event: ChangeEvent<HTMLInputElement>) => {
    const audio = audioRefs.current[sampleId];
    const nextTime = Number(event.target.value);

    setAudioTimes((current) => ({
      ...current,
      [sampleId]: nextTime,
    }));

    if (audio && Number.isFinite(nextTime)) {
      audio.currentTime = nextTime;
    }
  };

  if (loading) {
    return (
      <section className="page-inner fl-player-shell fl-player-state-shell">
        <div className="eyebrow">
          <span className="eyebrow-dot" />
          Producer profile
        </div>

        <div className="card fl-player-state-card">
          <div className="fl-player-state-content">
            <span className="spinner" />
            <div>
              <h1>Loading Player</h1>
              <p>Fetching this producer&apos;s profile, stats, and approved samples.</p>
            </div>
          </div>
        </div>
      </section>
    );
  }

  if (!profile) {
    return (
      <section className="page-inner fl-player-shell fl-player-state-shell">
        <div className="eyebrow">
          <span className="eyebrow-dot" />
          Producer profile
        </div>

        <div className="card fl-player-state-card">
          <div className="fl-player-state-content">
            <div className="fl-player-avatar fl-player-avatar-error">?</div>

            <div>
              <h1>Player Not Found</h1>
              <p>{errorMsg ?? "This player profile could not be loaded."}</p>

              <Link href="/leaderboard" className="btn-secondary fl-player-state-button">
                Back to Leaderboard
              </Link>
            </div>
          </div>
        </div>
      </section>
    );
  }

  const name =
    profile.display_name || `Producer ${profile.id.slice(0, 6).toUpperCase()}`;

  const tier = computeRankTier(profile.rating, globalRank);
  const ratingLabel = formatRating(profile.rating);
  const globalRankLabel = formatGlobalRank(globalRank);
  const battlesLabel = `${profile.total_battles ?? 0}`;
  const winRateLabel = formatWinRate(profile.win_rate);
  const initials = getInitials(name);

  const selectedBadgeKey = resolveSelectedBadgeKey(profile);
  const selectedBadgeMeta =
    selectedBadgeKey && BADGE_IMAGE_MAP[selectedBadgeKey]
      ? BADGE_IMAGE_MAP[selectedBadgeKey]
      : null;

  const musicLinks = [
    {
      label: "YouTube",
      href: getSafeExternalUrl(profile.youtube_url),
    },
    {
      label: "SoundCloud",
      href: getSafeExternalUrl(profile.soundcloud_url),
    },
    {
      label: "Spotify",
      href: getSafeExternalUrl(profile.spotify_url),
    },
  ].filter((link): link is { label: string; href: string } => Boolean(link.href));

  const heroMetrics = [
    {
      label: "Tier",
      value: tier,
    },
    {
      label: "Global Rank",
      value: globalRankLabel,
    },
    {
      label: "Rating",
      value: ratingLabel,
    },
    {
      label: "Win Rate",
      value: winRateLabel,
    },
  ];

  const recordStats = [
    {
      label: "Tier",
      value: tier,
    },
    {
      label: "Rating",
      value: ratingLabel,
    },
    {
      label: "Global Rank",
      value: globalRankLabel,
    },
    {
      label: "Battles",
      value: battlesLabel,
    },
    {
      label: "Win Rate",
      value: winRateLabel,
      wide: true,
    },
  ];

  return (
    <section className="page-inner fl-player-shell">
      <div className="fl-player-page">
        <article className="card fl-player-hero-card">
          <div className="fl-player-hero-left">
            <div className="fl-player-badge-stack">
              <div
                className="fl-player-badge-display"
                title={selectedBadgeMeta?.label ?? "Producer badge"}
              >
                {selectedBadgeMeta ? (
                  <img
                    src={selectedBadgeMeta.src}
                    alt={selectedBadgeMeta.label}
                    className="fl-player-badge-image"
                  />
                ) : (
                  <span className="fl-player-badge-fallback">{initials}</span>
                )}
              </div>

              <span className="fl-player-badge-caption">
                {selectedBadgeMeta?.label ?? "Producer"}
              </span>
            </div>

            <div className="fl-player-identity">
              <div className="fl-player-kicker">
                <span className="eyebrow-dot" />
                Public producer profile
              </div>

              <h1>{name}</h1>

              <p>
                Ranked battle record, approved community samples, and public music
                links for this producer.
              </p>
            </div>
          </div>

          <div className="fl-player-hero-right">
            <div className="fl-player-hero-metrics">
              {heroMetrics.map((metric) => (
                <div key={metric.label} className="fl-player-metric-chip">
                  <span>{metric.label}</span>
                  <strong>{metric.value}</strong>
                </div>
              ))}
            </div>

            <div className="fl-player-actions">
              <Link href="/leaderboard" className="btn-secondary">
                Back
              </Link>

              {musicLinks.map((link) => (
                <a
                  key={link.label}
                  href={link.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-secondary"
                >
                  {link.label}
                </a>
              ))}
            </div>
          </div>
        </article>

        <div className="fl-player-dashboard">
          <article className="card fl-player-panel fl-player-samples-panel">
            <div className="fl-player-panel-header">
              <div>
                <p className="panel-label">Approved samples</p>
                <h2>Sample Vault</h2>
              </div>

              <span className="sample-badge">
                {approvedSamples.length} Approved
              </span>
            </div>

            <p className="fl-player-panel-description">
              Samples submitted by this producer that have been approved for future
              battles.
            </p>

            {approvedSamples.length === 0 ? (
              <div className="fl-player-empty-box">
                <strong>No approved samples yet.</strong>
                <span>
                  When this producer has approved community samples, they will show
                  here.
                </span>
              </div>
            ) : (
              <div className="fl-player-sample-list">
                {approvedSamples.map((sample, index) => {
                  const duration = audioDurations[sample.id] ?? 0;
                  const currentTime = audioTimes[sample.id] ?? 0;
                  const progress =
                    duration > 0 ? Math.min(100, (currentTime / duration) * 100) : 0;
                  const isActive = activeSampleId === sample.id;
                  const hasError = audioErrors[sample.id];

                  return (
                    <div key={sample.id} className="fl-player-sample-row">
                      <button
                        type="button"
                        className="fl-player-play-button"
                        onClick={() => handleToggleSample(sample.id)}
                        disabled={hasError}
                        aria-label={
                          isActive
                            ? `Pause approved sample ${index + 1}`
                            : `Play approved sample ${index + 1}`
                        }
                      >
                        {hasError ? "!" : isActive ? "Ⅱ" : "▶"}
                      </button>

                      <div className="fl-player-sample-main">
                        <div className="fl-player-sample-topline">
                          <span>
                            Approved Sample {String(index + 1).padStart(2, "0")}
                          </span>
                          <strong>{formatDuration(duration)}</strong>
                        </div>

                        <div className="fl-player-progress-track">
                          <span style={{ width: `${progress}%` }} />
                        </div>

                        <div className="fl-player-seek-row">
                          <span className="fl-player-timecode">
                            {formatDuration(currentTime)}
                          </span>

                          <input
                            type="range"
                            min={0}
                            max={duration || 0}
                            step={0.01}
                            value={Math.min(currentTime, duration || 0)}
                            className="fl-player-seek-slider"
                            disabled={hasError || duration <= 0}
                            onMouseDown={() => {
                              seekLockRef.current[sample.id] = true;
                            }}
                            onMouseUp={() => {
                              seekLockRef.current[sample.id] = false;
                            }}
                            onTouchStart={() => {
                              seekLockRef.current[sample.id] = true;
                            }}
                            onTouchEnd={() => {
                              seekLockRef.current[sample.id] = false;
                            }}
                            onChange={(event) => handleSeekChange(sample.id, event)}
                          />

                          <span className="fl-player-timecode">
                            {formatDuration(duration)}
                          </span>
                        </div>

                        <div className="fl-player-sample-meta">
                          Submitted {formatDate(sample.created_at)}
                        </div>

                        {hasError && (
                          <div className="fl-player-sample-error">
                            This audio file could not be loaded.
                          </div>
                        )}
                      </div>

                      <audio
                        ref={(node) => {
                          audioRefs.current[sample.id] = node;
                        }}
                        src={sample.audioUrl}
                        preload="metadata"
                        className="fl-player-audio-element"
                        onLoadedMetadata={(event) => {
                          const audio = event.currentTarget;

                          setAudioDurations((current) => ({
                            ...current,
                            [sample.id]: audio.duration,
                          }));
                        }}
                        onTimeUpdate={(event) => {
                          if (seekLockRef.current[sample.id]) return;

                          const audio = event.currentTarget;

                          setAudioTimes((current) => ({
                            ...current,
                            [sample.id]: audio.currentTime,
                          }));
                        }}
                        onPlay={() => {
                          pauseAllOtherSamples(sample.id);
                          setActiveSampleId(sample.id);
                        }}
                        onPause={() => {
                          setActiveSampleId((current) =>
                            current === sample.id ? null : current
                          );
                        }}
                        onEnded={() => {
                          setActiveSampleId(null);
                          setAudioTimes((current) => ({
                            ...current,
                            [sample.id]: 0,
                          }));
                        }}
                        onError={() => {
                          setAudioErrors((current) => ({
                            ...current,
                            [sample.id]: true,
                          }));
                        }}
                      >
                        Your browser does not support the audio element.
                      </audio>
                    </div>
                  );
                })}
              </div>
            )}
          </article>

          <aside className="fl-player-sidebar">
            <article className="card fl-player-panel fl-player-stats-panel">
              <div className="fl-player-panel-header">
                <div>
                  <p className="panel-label">Battle record</p>
                  <h2>Stats</h2>
                </div>

                <span className="sample-badge">Live</span>
              </div>

              <div className="fl-player-stat-grid">
                {recordStats.map((stat) => (
                  <div
                    key={stat.label}
                    className={`fl-player-stat-card ${
                      stat.wide ? "fl-player-stat-card-wide" : ""
                    }`}
                  >
                    <span>{stat.label}</span>
                    <strong>{stat.value}</strong>
                  </div>
                ))}
              </div>
            </article>

            <article className="card fl-player-panel fl-player-links-panel">
              <div className="fl-player-panel-header">
                <div>
                  <p className="panel-label">Music links</p>
                  <h2>Connect</h2>
                </div>
              </div>

              {musicLinks.length > 0 ? (
                <div className="fl-player-link-grid">
                  {musicLinks.map((link) => (
                    <a
                      key={link.label}
                      href={link.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="fl-player-link-card"
                    >
                      <span>{link.label}</span>
                      <strong>Open</strong>
                    </a>
                  ))}
                </div>
              ) : (
                <div className="fl-player-empty-mini">
                  This producer has not added external music links yet.
                </div>
              )}
            </article>
          </aside>
        </div>
      </div>
    </section>
  );
}