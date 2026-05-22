// app/page.tsx

export default function HomePage() {
  return (
    <main className="home-shell">
      {/* HERO */}
      <section className="retro-hero">
        <div className="page-inner hero-grid">
          <div className="hero-copy">
            <div className="eyebrow">
              <span className="eyebrow-dot" />
              Ranked beat battles · real-time matchmaking
            </div>

            <h1>
              10 Minute
              <br />
              Beat Battles
            </h1>

            <p className="hero-description">
              Queue into a live lobby, flip the same sample as everyone else,
              upload your best idea, and climb the ranked ladder through votes.
            </p>

            <div className="hero-actions">
              <a href="/battles" className="btn-primary">
                Enter Ranked Queue
              </a>
              <a href="/profile" className="btn-secondary">
                View Profile
              </a>
            </div>

            <p className="mini-note">
              Built for fast reps, unfinished ideas, and producers who want to
              improve under pressure.
            </p>
          </div>

          <div className="battle-window">
            <div className="window-topbar">
              <div className="window-dots">
                <span />
                <span />
                <span />
              </div>
              <span className="window-title">FLBATTLE.COM</span>
              <span className="window-status">LIVE</span>
            </div>

            <div className="stats-grid">
              <div className="stat-box">
                <strong>10:00</strong>
                <span>Round timer</span>
              </div>
              <div className="stat-box">
                <strong>7</strong>
                <span>Max players</span>
              </div>
              <div className="stat-box">
                <strong>1500+</strong>
                <span>Ruby rating</span>
              </div>
            </div>

            <div className="sample-panel">
              <div>
                <p className="panel-label">Current sample</p>
                <h3>“Midnight Loop”</h3>
              </div>
              <div className="sample-badge">Ranked</div>
            </div>

            <div className="waveform-card">
              <div className="waveform-header">
                <span>Waveform Preview</span>
                <span>00:16</span>
              </div>
              <div className="waveform">
                <span style={{ height: "26%" }} />
                <span style={{ height: "42%" }} />
                <span style={{ height: "34%" }} />
                <span style={{ height: "58%" }} />
                <span style={{ height: "46%" }} />
                <span style={{ height: "70%" }} />
                <span style={{ height: "52%" }} />
                <span style={{ height: "84%" }} />
                <span style={{ height: "62%" }} />
                <span style={{ height: "76%" }} />
                <span style={{ height: "44%" }} />
                <span style={{ height: "88%" }} />
                <span style={{ height: "56%" }} />
                <span style={{ height: "72%" }} />
                <span style={{ height: "40%" }} />
                <span style={{ height: "64%" }} />
              </div>
            </div>

            <div className="task-table">
              <div className="task-row task-head">
                <span>Battle phase</span>
                <span>Status</span>
                <span>Time</span>
              </div>
              <div className="task-row">
                <span>Queue</span>
                <span className="status complete">Complete</span>
                <span>2 min ago</span>
              </div>
              <div className="task-row">
                <span>Flip sample</span>
                <span className="status running">Running</span>
                <span>Now</span>
              </div>
              <div className="task-row">
                <span>Upload</span>
                <span className="status waiting">Waiting</span>
                <span>Next</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="page-inner section-block">
        <div className="section-heading">
          <div className="eyebrow centered">
            <span className="eyebrow-dot" />
            How it works
          </div>
          <h2>Jump in like a game lobby. Leave with a beat idea.</h2>
          <p>
            FL Battles is designed to feel quick, competitive, and repeatable.
            No month-long contests. No complicated rules. Just short rounds and
            real feedback.
          </p>
        </div>

        <div className="feature-grid">
          <div className="card feature-card">
            <span className="card-number">01</span>
            <h3>Queue up</h3>
            <p>
              Join a ranked lobby with other producers. Once enough players are
              in, the round starts.
            </p>
          </div>

          <div className="card feature-card">
            <span className="card-number">02</span>
            <h3>Flip the sample</h3>
            <p>
              Everyone receives the same sample and ten minutes to make the best
              possible idea.
            </p>
          </div>

          <div className="card feature-card">
            <span className="card-number">03</span>
            <h3>Upload & vote</h3>
            <p>
              Submit your clip, vote on other beats, and gain rating when your
              track wins.
            </p>
          </div>
        </div>
      </section>

      {/* WHY PLAY */}
      <section className="page-inner section-block split-section">
        <div>
          <div className="eyebrow">
            <span className="eyebrow-dot" />
            Why play here
          </div>

          <h2>Built for producers who want reps, not perfection.</h2>

          <p>
            The goal is simple: finish more ideas. Ten-minute pressure forces
            you to commit, experiment, and practice faster.
          </p>

          <div className="check-list">
            <div>
              <span>✓</span>
              Fast rounds that fit between classes, sessions, or breaks.
            </div>
            <div>
              <span>✓</span>
              Ranked tiers from Bronze to Ruby so progress feels visible.
            </div>
            <div>
              <span>✓</span>
              Simple uploads and voting instead of complicated contest rules.
            </div>
            <div>
              <span>✓</span>
              Build a folder of ideas you can turn into full tracks later.
            </div>
          </div>
        </div>

        <div className="card roadmap-card">
          <p className="panel-label">Early access roadmap</p>
          <h3>Coming next</h3>

          <div className="roadmap-list">
            <div>
              <span>01</span>
              Custom lobbies for friends and Discord servers
            </div>
            <div>
              <span>02</span>
              Season-based leaderboards and rewards
            </div>
            <div>
              <span>03</span>
              Profile stats, streaks, win rate, and favorite genres
            </div>
            <div>
              <span>04</span>
              Genre filters and themed battle nights
            </div>
          </div>
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="page-inner final-cta-section">
        <div className="card final-cta">
          <div className="eyebrow centered">
            <span className="eyebrow-dot" />
            Ready to battle?
          </div>

          <h2>Start your first 10-minute round.</h2>

          <p>
            Log in, hit queue, and see what you can make from a random sample.
            Worst case, you leave with a new idea.
          </p>

          <div className="hero-actions centered-actions">
            <a href="/battles" className="btn-primary">
              Enter Ranked Queue
            </a>
            <a href="/faq" className="btn-secondary">
              Learn More
            </a>
          </div>
        </div>
      </section>
    </main>
  );
}