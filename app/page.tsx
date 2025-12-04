// app/page.tsx
export default function HomePage() {
  return (
    <main>
      {/* HERO */}
      <section className="hero">
        <div
          className="page-inner"
          style={{
            display: "flex",
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 48,
            paddingTop: 10,
            paddingBottom: 5,
          }}
        >
          {/* Left: main copy */}
          <div style={{ maxWidth: 540 }}>
            <p
              style={{
                textTransform: "uppercase",
                letterSpacing: "0.18em",
                fontSize: 12,
                fontWeight: 600,
                color: "#60a5fa",
                marginBottom: 12,
              }}
            >
              Online beat battles · real-time matchmaking
            </p>

            <h1
              style={{
                fontSize: "3rem",
                lineHeight: 1.1,
                marginBottom: 16,
              }}
            >
              10-Minute FL Studio
              <br />
              Beat Battles, Ranked.
            </h1>

            <p
              style={{
                fontSize: "1.05rem",
                color: "#cbd5f5",
                maxWidth: 520,
                marginBottom: 24,
              }}
            >
              Queue up against other producers, flip a shared sample in ten
              minutes, and upload your best idea. Win votes, climb the ladder,
              and build a track record that actually means something.
            </p>

            <div
              className="hero-actions"
              style={{ display: "flex", gap: 12, flexWrap: "wrap" }}
            >
              <a href="/battles" className="btn-primary">
                Enter Ranked Queue
              </a>
              <a href="/profile" className="btn-secondary">
                View Profile
              </a>
            </div>

            <p
              style={{
                marginTop: 16,
                fontSize: 12,
                color: "#9ca3af",
              }}
            >
              No long signup forms. Just log in, hit queue, and start cooking.
            </p>
          </div>

          {/* Right: “live battle” preview card */}
          <div
            className="card"
            style={{
              maxWidth: 420,
              marginLeft: "auto",
              marginRight: 0,
              borderRadius: 24,
              padding: 20,
              background:
                "radial-gradient(circle at top, rgba(96,165,250,0.25), transparent 55%), rgba(15,23,42,0.95)",
              border: "1px solid rgba(148,163,184,0.25)",
              boxShadow: "0 24px 80px rgba(15,23,42,0.9)",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 12,
              }}
            >
              <span
                style={{
                  fontSize: 13,
                  padding: "4px 10px",
                  borderRadius: 999,
                  backgroundColor: "rgba(34,197,94,0.15)",
                  color: "#4ade80",
                  fontWeight: 500,
                }}
              >
                Live Ranked Lobby
              </span>
              <span style={{ fontSize: 12, color: "#9ca3af" }}>10:00 left</span>
            </div>

            <h3 style={{ marginBottom: 4, fontSize: 18 }}>Sample: “Midnight Loop”</h3>
            <p style={{ fontSize: 13, color: "#9ca3af", marginBottom: 16 }}>
              7 producers · 1 sample · 10 minutes to impress.
            </p>

            <div
              style={{
                marginBottom: 16,
                padding: 12,
                borderRadius: 16,
                background:
                  "linear-gradient(135deg, rgba(56,189,248,0.2), rgba(129,140,248,0.18))",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  fontSize: 12,
                  marginBottom: 8,
                  color: "#e5e7eb",
                }}
              >
                <span>Waveform Preview</span>
                <span>00:16</span>
              </div>
              <div
                style={{
                  height: 60,
                  borderRadius: 12,
                  backgroundImage:
                    "repeating-linear-gradient(90deg, rgba(15,23,42,0.3) 0, rgba(15,23,42,0.3) 2px, rgba(15,23,42,0.6) 2px, rgba(15,23,42,0.6) 4px)",
                  overflow: "hidden",
                  position: "relative",
                }}
              >
                <div
                  style={{
                    position: "absolute",
                    inset: 0,
                    opacity: 0.4,
                    background:
                      "linear-gradient(135deg, rgba(96,165,250,0.7), rgba(52,211,153,0.7))",
                    mixBlendMode: "screen",
                  }}
                />
              </div>
            </div>

            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                fontSize: 12,
                color: "#9ca3af",
              }}
            >
              <div>
                <div style={{ fontSize: 20, fontWeight: 600, color: "#e5e7eb" }}>
                  1,248
                </div>
                <div>Ranked battles played*</div>
              </div>
              <div>
                <div style={{ fontSize: 20, fontWeight: 600, color: "#e5e7eb" }}>
                  10 mins
                </div>
                <div>Per battle round</div>
              </div>
              <div>
                <div style={{ fontSize: 20, fontWeight: 600, color: "#e5e7eb" }}>
                  S / G / P
                </div>
                <div>Skill-based tiers</div>
              </div>
            </div>

            <p
              style={{
                marginTop: 10,
                fontSize: 10,
                color: "#6b7280",
              }}
            >
              *Stats are placeholder while the ladder is in early access.
            </p>
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section
        className="page-inner"
        style={{ paddingTop: 40, paddingBottom: 40 }}
      >
        <div
          style={{
            maxWidth: 780,
            margin: "0 auto 32px",
            textAlign: "center",
          }}
        >
          <h2 style={{ fontSize: "1.75rem", marginBottom: 8 }}>How it works</h2>
          <p style={{ color: "#9ca3af", fontSize: "0.98rem" }}>
            FL Battles is designed to feel like jumping into a game lobby,
            except the game is your DAW. No contests that last weeks — just
            short, intense rounds.
          </p>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: 20,
          }}
        >
          <div className="card" style={{ padding: 20 }}>
            <h3 style={{ marginBottom: 6 }}>1. Queue up</h3>
            <p style={{ fontSize: "0.95rem", color: "#cbd5f5" }}>
              Hit the ranked queue and get dropped into a lobby with other
              producers at a similar skill level.
            </p>
          </div>

          <div className="card" style={{ padding: 20 }}>
            <h3 style={{ marginBottom: 6 }}>2. Flip the sample</h3>
            <p style={{ fontSize: "0.95rem", color: "#cbd5f5" }}>
              Once the round starts, everyone gets the same sample and ten
              minutes on the clock to build their best idea in FL Studio.
            </p>
          </div>

          <div className="card" style={{ padding: 20 }}>
            <h3 style={{ marginBottom: 6 }}>3. Upload & vote</h3>
            <p style={{ fontSize: "0.95rem", color: "#cbd5f5" }}>
              Export a short clip, upload it, and vote on other submissions.
              Wins move you up the ranked ladder.
            </p>
          </div>
        </div>
      </section>

      {/* WHY PLAY HERE */}
      <section
        className="page-inner"
        style={{ paddingTop: 8, paddingBottom: 60 }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "minmax(0, 1.4fr) minmax(0, 1fr)",
            gap: 28,
            alignItems: "flex-start",
          }}
        >
          <div>
            <h2 style={{ fontSize: "1.7rem", marginBottom: 10 }}>
              Built for producers who want reps, not perfection.
            </h2>
            <p
              style={{
                color: "#cbd5f5",
                fontSize: "0.98rem",
                marginBottom: 16,
              }}
            >
              FL Battles is about volume and growth. The more rounds you play,
              the more ideas you finish, the faster you improve.
            </p>

            <ul
              style={{
                listStyle: "none",
                padding: 0,
                margin: 0,
                display: "grid",
                gap: 10,
                fontSize: "0.95rem",
                color: "#e5e7eb",
              }}
            >
              <li>
                ✅ Fast 10-minute rounds that fit between sessions or classes.
              </li>
              <li>✅ Skill-based ranks (Bronze to Top 10) to track progress.</li>
              <li>✅ Simple upload system — no complicated contest rules.</li>
              <li>
                ✅ Great way to build a folder of ideas you can finish later.
              </li>
            </ul>
          </div>

          <div className="card" style={{ padding: 20, borderRadius: 20 }}>
            <h3 style={{ marginBottom: 12 }}>Early access roadmap</h3>
            <ul
              style={{
                listStyle: "none",
                padding: 0,
                margin: 0,
                fontSize: "0.9rem",
                color: "#cbd5f5",
                display: "grid",
                gap: 8,
              }}
            >
              <li>🎧 Custom lobbies for friends & Discord servers</li>
              <li>🏆 Season-based leaderboards & cosmetic rewards</li>
              <li>📈 Profile stats: streaks, win rate, favorite genres</li>
              <li>🧪 Genre filters & themed battle nights</li>
            </ul>
            <p
              style={{
                marginTop: 14,
                fontSize: "0.8rem",
                color: "#9ca3af",
              }}
            >
              You&apos;re early. Expect bugs, new features, and lots of
              iteration. Feedback from players like you will shape how this
              evolves.
            </p>
          </div>
        </div>
      </section>

      {/* FINAL CTA */}
      <section
        className="page-inner"
        style={{
          paddingBottom: 80,
        }}
      >
        <div
          className="card"
          style={{
            padding: 24,
            borderRadius: 24,
            textAlign: "center",
            maxWidth: 720,
            margin: "0 auto",
          }}
        >
          <h2 style={{ fontSize: "1.6rem", marginBottom: 10 }}>
            Ready to play your first round?
          </h2>
          <p
            style={{
              color: "#cbd5f5",
              fontSize: "0.98rem",
              marginBottom: 20,
            }}
          >
            Log in, hit queue, and see what you can do with ten minutes and a
            random sample. Worst case, you leave with a new idea in your
            project folder.
          </p>
          <div style={{ display: "flex", justifyContent: "center", gap: 12 }}>
            <a href="/battles" className="btn-primary">
              Enter Ranked Queue
            </a>
            <a href="/faq" className="btn-secondary">
              Learn more
            </a>
          </div>
        </div>
      </section>
    </main>
  );
}
