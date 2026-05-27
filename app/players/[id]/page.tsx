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

type ApprovedSample = {
  id: string;
  file_path: string;
  created_at: string;
  audioUrl: string;
};

export default function PlayerPage() {
  const params = useParams<{ id: string }>();
  const playerId = params.id;

  const [profile, setProfile] = useState<PlayerProfile | null>(null);
  const [approvedSamples, setApprovedSamples] = useState<ApprovedSample[]>([]);
  const [globalRank, setGlobalRank] = useState<number | null>(null);

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

  const formatWinRate = (w: number | null) =>
    w == null ? "N/A" : `${w.toFixed(1)}%`;

  const formatRating = (r: number | null) =>
    r == null ? "Unranked" : `${Math.round(r)}`;

  const formatRankPosition = (pos: number | null) =>
    pos == null ? "N/A" : `#${pos}`;

  const formatDate = (dateString: string) =>
    new Date(dateString).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    });

  const pageFont =
    "var(--font-manrope), Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";

  const statCardStyle: React.CSSProperties = {
    border: "1px solid var(--line)",
    background: "rgba(255, 255, 255, 0.025)",
    padding: 18,
    minHeight: 92,
  };

  const statLabelStyle: React.CSSProperties = {
    margin: 0,
    color: "var(--muted)",
    fontSize: "0.68rem",
    fontWeight: 900,
    textTransform: "uppercase",
    letterSpacing: "0.14em",
  };

  const statValueStyle: React.CSSProperties = {
    display: "block",
    marginTop: 10,
    color: "var(--text)",
    fontSize: "1.65rem",
    lineHeight: 1,
    fontWeight: 900,
    letterSpacing: "-0.04em",
  };

  if (loading) {
    return (
      <section
        className="page-inner"
        style={{
          paddingTop: 72,
          paddingBottom: 96,
          fontFamily: pageFont,
        }}
      >
        <div className="eyebrow">
          <span className="eyebrow-dot" />
          Producer profile
        </div>

        <h1
          style={{
            margin: 0,
            fontSize: "clamp(3rem, 7vw, 6rem)",
            lineHeight: 0.9,
            letterSpacing: "-0.075em",
            fontWeight: 800,
            color: "var(--text)",
          }}
        >
          Loading Player
        </h1>

        <div className="queue-status">
          <span className="spinner" />
          <span>Fetching producer profile.</span>
        </div>
      </section>
    );
  }

  if (!profile) {
    return (
      <section
        className="page-inner"
        style={{
          paddingTop: 72,
          paddingBottom: 96,
          fontFamily: pageFont,
        }}
      >
        <div className="eyebrow">
          <span className="eyebrow-dot" />
          Producer profile
        </div>

        <h1
          style={{
            margin: 0,
            fontSize: "clamp(3rem, 7vw, 6rem)",
            lineHeight: 0.9,
            letterSpacing: "-0.075em",
            fontWeight: 800,
            color: "var(--text)",
          }}
        >
          Player Not Found
        </h1>

        <p
          style={{
            marginTop: 18,
            color: "var(--muted)",
            lineHeight: 1.7,
          }}
        >
          {errorMsg ?? "This player profile could not be loaded."}
        </p>

        <div style={{ marginTop: 24 }}>
          <Link href="/leaderboard" className="btn-secondary">
            Back to Leaderboard
          </Link>
        </div>
      </section>
    );
  }

  const tier = computeRankTier(profile.rating, globalRank);
  const name =
    profile.display_name || `Producer ${profile.id.slice(0, 6).toUpperCase()}`;

  const hasAnyLink =
    !!profile.spotify_url ||
    !!profile.soundcloud_url ||
    !!profile.youtube_url;

  return (
    <section
      className="page-inner"
      style={{
        paddingTop: 72,
        paddingBottom: 96,
        fontFamily: pageFont,
      }}
    >
      <div className="eyebrow">
        <span className="eyebrow-dot" />
        Producer profile · public view
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(0, 1.15fr) minmax(300px, 0.85fr)",
          gap: 18,
          alignItems: "stretch",
          marginTop: 8,
        }}
      >
        <div
          className="card"
          style={{
            padding: 30,
            overflow: "hidden",
            minHeight: 360,
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
          }}
        >
          <span className="card-number">01</span>

          <div style={{ position: "relative", zIndex: 1 }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: 14,
                marginBottom: 20,
              }}
            >
              <p className="panel-label" style={{ margin: 0 }}>
                Public producer
              </p>

              <span className="sample-badge">{tier}</span>
            </div>

            <h1
              style={{
                margin: 0,
                fontSize: "clamp(3.2rem, 7.2vw, 7rem)",
                lineHeight: 0.86,
                letterSpacing: "-0.075em",
                fontWeight: 800,
                color: "var(--text)",
                wordBreak: "break-word",
              }}
            >
              {name}
            </h1>

            <p
              style={{
                maxWidth: 620,
                marginTop: 22,
                color: "var(--muted)",
                fontSize: "1rem",
                lineHeight: 1.75,
              }}
            >
              Public profile, battle record, music links, and approved community
              samples from this producer.
            </p>
          </div>

          <div
            style={{
              position: "relative",
              zIndex: 1,
              display: "flex",
              gap: 10,
              flexWrap: "wrap",
              marginTop: 28,
            }}
          >
            <Link href="/leaderboard" className="btn-secondary">
              Back to Leaderboard
            </Link>

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
          </div>
        </div>

        <div
          className="card"
          style={{
            padding: 26,
            overflow: "hidden",
          }}
        >
          <span className="card-number">02</span>

          <div
            style={{
              position: "relative",
              zIndex: 1,
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: 14,
              marginBottom: 18,
            }}
          >
            <p className="panel-label" style={{ margin: 0 }}>
              Rank summary
            </p>

            <span className="sample-badge">Live</span>
          </div>

          <h2
            style={{
              position: "relative",
              zIndex: 1,
              margin: "0 0 18px",
              fontSize: "clamp(2rem, 3.4vw, 3rem)",
              fontWeight: 800,
              lineHeight: 0.95,
              letterSpacing: "-0.07em",
              color: "var(--text)",
            }}
          >
            Battle Stats
          </h2>

          <div
            style={{
              position: "relative",
              zIndex: 1,
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 10,
            }}
          >
            <div style={statCardStyle}>
              <p style={statLabelStyle}>Tier</p>
              <strong style={statValueStyle}>{tier}</strong>
            </div>

            <div style={statCardStyle}>
              <p style={statLabelStyle}>Rating</p>
              <strong style={statValueStyle}>
                {formatRating(profile.rating)}
              </strong>
            </div>

            <div style={statCardStyle}>
              <p style={statLabelStyle}>Global Rank</p>
              <strong style={statValueStyle}>
                {formatRankPosition(globalRank)}
              </strong>
            </div>

            <div style={statCardStyle}>
              <p style={statLabelStyle}>Battles</p>
              <strong style={statValueStyle}>
                {profile.total_battles ?? 0}
              </strong>
            </div>

            <div style={{ ...statCardStyle, gridColumn: "1 / -1" }}>
              <p style={statLabelStyle}>Win Rate</p>
              <strong style={statValueStyle}>
                {formatWinRate(profile.win_rate)}
              </strong>
            </div>
          </div>

          {!hasAnyLink && (
            <p
              style={{
                position: "relative",
                zIndex: 1,
                margin: "18px 0 0",
                color: "var(--muted)",
                lineHeight: 1.6,
              }}
            >
              This producer has not added external music links yet.
            </p>
          )}
        </div>
      </div>

      <div
        className="card"
        style={{
          marginTop: 18,
          padding: 26,
          overflow: "hidden",
        }}
      >
        <span className="card-number">03</span>

        <div
          style={{
            position: "relative",
            zIndex: 1,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 14,
            marginBottom: 18,
          }}
        >
          <p className="panel-label" style={{ margin: 0 }}>
            Approved samples
          </p>

          <span className="sample-badge">
            {approvedSamples.length} Approved
          </span>
        </div>

        <h2
          style={{
            position: "relative",
            zIndex: 1,
            margin: "0 0 12px",
            fontSize: "clamp(2.2rem, 4vw, 4rem)",
            fontWeight: 800,
            lineHeight: 0.95,
            letterSpacing: "-0.07em",
            color: "var(--text)",
          }}
        >
          Community Sample Vault
        </h2>

        <p
          style={{
            position: "relative",
            zIndex: 1,
            maxWidth: 720,
            margin: "0 0 22px",
            color: "var(--muted)",
            lineHeight: 1.7,
          }}
        >
          Samples submitted by this producer that have been approved for future
          battles.
        </p>

        {approvedSamples.length === 0 && (
          <div
            style={{
              position: "relative",
              zIndex: 1,
              border: "1px solid var(--line)",
              background: "rgba(255, 255, 255, 0.025)",
              padding: 18,
            }}
          >
            <p
              style={{
                margin: 0,
                color: "var(--muted)",
                lineHeight: 1.6,
              }}
            >
              This producer does not have any approved samples yet.
            </p>
          </div>
        )}

        {approvedSamples.length > 0 && (
          <div
            style={{
              position: "relative",
              zIndex: 1,
              display: "grid",
              gap: 12,
            }}
          >
            {approvedSamples.map((sample, index) => (
              <div
                key={sample.id}
                style={{
                  display: "grid",
                  gridTemplateColumns: "minmax(150px, 0.35fr) minmax(260px, 1fr)",
                  gap: 16,
                  alignItems: "center",
                  border: "1px solid var(--line)",
                  background: "rgba(255, 255, 255, 0.025)",
                  padding: 16,
                }}
              >
                <div>
                  <p
                    style={{
                      margin: 0,
                      color: "var(--muted)",
                      fontSize: "0.68rem",
                      fontWeight: 900,
                      textTransform: "uppercase",
                      letterSpacing: "0.14em",
                    }}
                  >
                    Approved Sample {String(index + 1).padStart(2, "0")}
                  </p>

                  <strong
                    style={{
                      display: "block",
                      marginTop: 8,
                      color: "var(--text)",
                      fontSize: "1rem",
                    }}
                  >
                    Submitted {formatDate(sample.created_at)}
                  </strong>
                </div>

                <audio
                  controls
                  preload="metadata"
                  src={sample.audioUrl}
                  style={{
                    width: "100%",
                    minWidth: 0,
                  }}
                >
                  Your browser does not support the audio element.
                </audio>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}