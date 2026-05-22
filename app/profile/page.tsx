"use client";

import { useEffect, useState } from "react";
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

  const pageFont =
    "var(--font-manrope), Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";

  const inputStyle: React.CSSProperties = {
    width: "100%",
    marginTop: 6,
    padding: "11px 12px",
    borderRadius: 0,
    border: "1px solid var(--line-bright)",
    background: "rgba(5, 5, 5, 0.85)",
    color: "var(--text)",
    fontFamily: pageFont,
    fontSize: "0.95rem",
    outline: "none",
  };

  const labelStyle: React.CSSProperties = {
    display: "block",
    color: "var(--text)",
    fontSize: "0.85rem",
    fontWeight: 700,
  };

  const labelTextStyle: React.CSSProperties = {
    display: "inline-block",
    color: "var(--muted)",
    fontSize: "0.72rem",
    fontWeight: 900,
    textTransform: "uppercase",
    letterSpacing: "0.12em",
  };

  const dividerStyle: React.CSSProperties = {
    marginTop: 12,
    paddingTop: 16,
    borderTop: "1px solid var(--line)",
  };

  if (loading) {
    return (
      <section
        className="page-inner"
        style={{
          paddingTop: 72,
          paddingBottom: 72,
          fontFamily: pageFont,
        }}
      >
        <div className="eyebrow">
          <span className="eyebrow-dot" />
          Profile terminal
        </div>

        <h1
          style={{
            margin: 0,
            fontFamily: pageFont,
            fontSize: "clamp(3rem, 7vw, 6rem)",
            lineHeight: 0.9,
            letterSpacing: "-0.075em",
            fontWeight: 800,
            color: "var(--text)",
          }}
        >
          Loading Profile
        </h1>

        <div className="queue-status">
          <span className="spinner" />
          <span>Fetching account stats and rank data.</span>
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
          paddingBottom: 72,
          fontFamily: pageFont,
        }}
      >
        <div className="eyebrow">
          <span className="eyebrow-dot" />
          Profile terminal
        </div>

        <h1
          style={{
            margin: 0,
            fontFamily: pageFont,
            fontSize: "clamp(3rem, 7vw, 6rem)",
            lineHeight: 0.9,
            letterSpacing: "-0.075em",
            fontWeight: 800,
            color: "var(--text)",
          }}
        >
          No Profile Found
        </h1>

        <p
          style={{
            maxWidth: 620,
            marginTop: 20,
            color: "var(--muted)",
            lineHeight: 1.7,
          }}
        >
          Try logging out and back in. If this keeps happening, your profile row
          may need to be recreated in Supabase.
        </p>
      </section>
    );
  }

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
        Player profile · account hub
      </div>

      <h1
        style={{
          margin: 0,
          fontFamily: pageFont,
          fontSize: "clamp(3.8rem, 8vw, 7.4rem)",
          lineHeight: 0.86,
          letterSpacing: "-0.075em",
          fontWeight: 800,
          color: "var(--text)",
        }}
      >
        Your
        <br />
        Profile
      </h1>

      <p
        className="page-description"
        style={{
          maxWidth: 680,
          marginTop: 24,
          color: "var(--muted)",
          fontSize: "1rem",
          lineHeight: 1.75,
        }}
      >
        Manage your account, music links, battle stats, rating, and rank.
      </p>

      {errorMsg && (
        <p
          style={{
            marginTop: 18,
            marginBottom: 18,
            maxWidth: 680,
            color: "#ffd4ca",
            border: "1px solid rgba(255, 77, 28, 0.45)",
            background: "rgba(255, 77, 28, 0.075)",
            fontSize: "0.9rem",
            fontWeight: 700,
            lineHeight: 1.45,
            padding: "10px 12px",
          }}
        >
          {errorMsg}
        </p>
      )}

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(0, 1.12fr) minmax(320px, 0.88fr)",
          gap: 18,
          marginTop: 34,
          alignItems: "start",
        }}
      >
        {/* Account Info */}
        <div
          className="card"
          style={{
            padding: 26,
            overflow: "hidden",
          }}
        >
          <span className="card-number">01</span>

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
              Account info
            </p>

            <span className="sample-badge">Editable</span>
          </div>

          <h2
            style={{
              position: "relative",
              zIndex: 1,
              margin: "0 0 18px",
              fontFamily: pageFont,
              fontSize: "clamp(2rem, 3.4vw, 3.2rem)",
              fontWeight: 800,
              lineHeight: 0.95,
              letterSpacing: "-0.07em",
              color: "var(--text)",
            }}
          >
            Edit Profile
          </h2>

          {userEmail && (
            <p
              style={{
                position: "relative",
                zIndex: 1,
                marginBottom: 18,
                color: "var(--muted)",
                lineHeight: 1.6,
              }}
            >
              <span style={{ color: "var(--muted-2)" }}>Email:</span>{" "}
              <strong style={{ color: "var(--text)" }}>{userEmail}</strong>
            </p>
          )}

          <form
            onSubmit={handleSaveProfile}
            style={{
              position: "relative",
              zIndex: 1,
              display: "flex",
              flexDirection: "column",
              gap: 14,
            }}
          >
            <label style={labelStyle}>
              <span style={labelTextStyle}>Display Name</span>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                style={inputStyle}
                maxLength={32}
                placeholder="Your producer name"
              />
            </label>

            <div style={dividerStyle}>
              <p className="panel-label" style={{ margin: 0 }}>
                Music links
              </p>
            </div>

            <label style={labelStyle}>
              <span style={labelTextStyle}>Spotify URL</span>
              <input
                type="url"
                placeholder="https://open.spotify.com/artist/..."
                value={spotifyUrl}
                onChange={(e) => setSpotifyUrl(e.target.value)}
                style={inputStyle}
              />
            </label>

            <label style={labelStyle}>
              <span style={labelTextStyle}>SoundCloud URL</span>
              <input
                type="url"
                placeholder="https://soundcloud.com/yourname"
                value={soundcloudUrl}
                onChange={(e) => setSoundcloudUrl(e.target.value)}
                style={inputStyle}
              />
            </label>

            <label style={labelStyle}>
              <span style={labelTextStyle}>YouTube URL</span>
              <input
                type="url"
                placeholder="https://www.youtube.com/@yourchannel"
                value={youtubeUrl}
                onChange={(e) => setYoutubeUrl(e.target.value)}
                style={inputStyle}
              />
            </label>

            <button
              type="submit"
              className="btn-primary"
              disabled={saving}
              style={{
                alignSelf: "flex-start",
                marginTop: 8,
              }}
            >
              {saving ? "Saving..." : "Save Profile"}
            </button>
          </form>
        </div>

        {/* Right Side */}
        <div
          style={{
            display: "grid",
            gap: 18,
          }}
        >
          {/* Rank Summary */}
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
                fontFamily: pageFont,
                fontSize: "clamp(2rem, 3.4vw, 3rem)",
                fontWeight: 800,
                lineHeight: 0.95,
                letterSpacing: "-0.07em",
                color: "var(--text)",
              }}
            >
              Rank
            </h2>

            <div
              style={{
                position: "relative",
                zIndex: 1,
                display: "grid",
                borderTop: "1px solid var(--line)",
              }}
            >
              {[
                ["Tier", rankTier],
                ["Rating", formatRating(profile.rating)],
                ["Global Position", formatRankPosition(globalRank)],
              ].map(([label, value]) => (
                <div
                  key={label}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    gap: 16,
                    padding: "14px 0",
                    borderBottom: "1px solid var(--line)",
                  }}
                >
                  <span
                    style={{
                      color: "var(--muted)",
                      fontSize: "0.78rem",
                      fontWeight: 900,
                      textTransform: "uppercase",
                      letterSpacing: "0.1em",
                    }}
                  >
                    {label}
                  </span>

                  <strong
                    style={{
                      color: "var(--text)",
                      fontSize: "1rem",
                    }}
                  >
                    {value}
                  </strong>
                </div>
              ))}
            </div>
          </div>

          {/* Stats */}
          <div
            className="card"
            style={{
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
                Battle stats
              </p>

              <span className="sample-badge">Tracked</span>
            </div>

            <h2
              style={{
                position: "relative",
                zIndex: 1,
                margin: "0 0 18px",
                fontFamily: pageFont,
                fontSize: "clamp(2rem, 3.4vw, 3rem)",
                fontWeight: 800,
                lineHeight: 0.95,
                letterSpacing: "-0.07em",
                color: "var(--text)",
              }}
            >
              Stats
            </h2>

            <div
              style={{
                position: "relative",
                zIndex: 1,
                display: "grid",
                borderTop: "1px solid var(--line)",
              }}
            >
              {[
                ["Battles Played", profile.total_battles ?? 0],
                ["Win Rate", formatWinRate(profile.win_rate)],
              ].map(([label, value]) => (
                <div
                  key={label}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    gap: 16,
                    padding: "14px 0",
                    borderBottom: "1px solid var(--line)",
                  }}
                >
                  <span
                    style={{
                      color: "var(--muted)",
                      fontSize: "0.78rem",
                      fontWeight: 900,
                      textTransform: "uppercase",
                      letterSpacing: "0.1em",
                    }}
                  >
                    {label}
                  </span>

                  <strong
                    style={{
                      color: "var(--text)",
                      fontSize: "1rem",
                    }}
                  >
                    {value}
                  </strong>
                </div>
              ))}
            </div>
          </div>

          {/* Account Security */}
          <div
            className="card"
            style={{
              padding: 26,
              overflow: "hidden",
            }}
          >
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
                Account security
              </p>

              <span
                style={{
                  padding: "8px 10px",
                  color: "var(--orange)",
                  border: "1px solid rgba(255, 77, 28, 0.45)",
                  background: "rgba(255, 77, 28, 0.075)",
                  fontSize: "0.64rem",
                  fontWeight: 900,
                  textTransform: "uppercase",
                  letterSpacing: "0.12em",
                }}
              >
                Password
              </span>
            </div>

            <h2
              style={{
                position: "relative",
                zIndex: 1,
                margin: "0 0 14px",
                fontFamily: pageFont,
                fontSize: "clamp(2rem, 3.4vw, 3rem)",
                fontWeight: 800,
                lineHeight: 0.95,
                letterSpacing: "-0.07em",
                color: "var(--text)",
              }}
            >
              Secure Access
            </h2>

            <p
              style={{
                position: "relative",
                zIndex: 1,
                margin: "0 0 18px",
                color: "var(--muted)",
                lineHeight: 1.65,
              }}
            >
              Update your password to keep your FL Battles account secure.
            </p>

            <Link href="/change-password" className="btn-secondary">
              Change Password
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}