// app/page.tsx
import RegisteredProducerCount from "./components/RegisteredProducerCount";
import RecentChampions from "./components/RecentChampions";

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
              Every producer gets the same sample. Flip it, upload your beat,
              earn votes, and climb the ranked producer ladder.
            </p>

            <div className="hero-actions">
              <a href="/battles" className="btn-primary">
                Enter Ranked Queue
              </a>

              <a href="#how-it-works" className="btn-secondary">
                How It Works
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
                <strong>Live</strong>
                <span>Ranked Queue</span>
              </div>

              <div className="hero-stat-item">
                <div className="hero-stat-icon">♕</div>
                <strong>Top 10</strong>
                <span>Ranked Ladder</span>
              </div>
            </div>

            <p className="mini-note">
              Join <RegisteredProducerCount suffix="+" /> registered producers
              competing in live ranked sample-flip beat battles.
            </p>
          </div>

          <div className="hero-visual-stack">
            <RecentChampions />
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section id="how-it-works" className="page-inner section-block">
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
            Built for better reps
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
          <p className="panel-label">Coming soon</p>

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
            Log in, join the ranked queue, and flip the next sample before the
            timer ends. Every round gives you feedback, practice, and a shot at
            climbing the ladder.
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