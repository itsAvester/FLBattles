// app/page.tsx
import RegisteredProducerCount from "./components/RegisteredProducerCount";
export default function HomePage() {
  return (
    <main className="home-shell">
      {/* HERO */}
      <section className="retro-hero">
        <div className="page-inner hero-grid">
          <div className="hero-copy">
            <div className="eyebrow">
              <span className="eyebrow-dot" />
              Ranked sample beat battles · real-time matchmaking
            </div>

            <h1>
              Live Sample
              <br />
              Beat Battles
            </h1>

            <p className="hero-description">
              Battle producers in real time using the exact same sample. Upload
              your best flip, earn votes, and climb the ranked producer ladder.
            </p>

            <div className="hero-actions">
              <a href="/battles" className="btn-primary">
                Enter Ranked Queue
              </a>
              <a href="/leaderboard" className="btn-secondary">
                View Leaderboard
              </a>
            </div>

           <div className="hero-stats hero-stats-three">
  <div className="hero-stat-item">
    <div className="hero-stat-icon">♙</div>
    <strong>
      <RegisteredProducerCount suffix="+" />
    </strong>
    <span>Producers</span>
  </div>

  <div className="hero-stat-item">
    <div className="hero-stat-icon">◉</div>
    <strong>23K+</strong>
    <span>Page Views</span>
  </div>

  <div className="hero-stat-item">
    <div className="hero-stat-icon">♕</div>
    <strong>Top 10</strong>
    <span>Ranked Ladder</span>
  </div>
</div>

            <p className="mini-note">
              Join <RegisteredProducerCount suffix="+" /> registered producers competing in live ranked sample-flip beat battles.
            </p>
          </div>

          <div className="battle-window">
            <div className="window-topbar">
              <div className="window-dots">
                <span />
                <span />
                <span />
              </div>
              <span className="window-title">
  <RegisteredProducerCount suffix="+" /> PRODUCERS REGISTERED
</span>
              <span className="window-status">RANKED</span>
            </div>

            <div className="stats-grid">
              <div className="stat-box">
                <strong>15</strong>
                <span>Minutes To Create</span>
              </div>
              <div className="stat-box">
                <strong>7</strong>
                <span>Producers Per Lobby</span>
              </div>
              <div className="stat-box">
                <strong>1458+</strong>
                <span>Registered Producers</span>
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

          <h2>Everyone gets the same sample. The best flip wins.</h2>

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
              Everyone receives the same sample and 15 minutes to make the best
              possible flip.
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
            The goal is simple: finish more ideas. Short-time pressure forces
            you to commit, experiment, and practice faster.
          </p>

          <div className="check-list">
            <div>
              <span>✓</span>
              Fast rounds that fit between classes, sessions, or breaks.
            </div>
            <div>
              <span>✓</span>
              Ranked tiers from Bronze to Champion so progress feels visible.
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

          <h2>Join the next live sample-flip battle.</h2>

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