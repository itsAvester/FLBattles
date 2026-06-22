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
              Private sample battles · ranked queue · real-time voting
            </div>

            <h1>
              Host Live
              <br />
              Beat Battles
            </h1>

            <p className="hero-description">
              Create a private lobby, invite producers with one link, and battle
              over the same sample. Built for friend groups, Discord servers,
              producer communities, and ranked competitors.
            </p>

            <div className="hero-actions">
              <a href="/battles" className="btn-primary">
                Create Custom Lobby
              </a>

              <a href="/battles" className="btn-secondary">
                Enter Ranked Queue
              </a>
            </div>

            <div className="custom-flow-card">
              <div className="custom-flow-topline">
                <span className="panel-label">Custom lobby flow</span>
                <span className="custom-flow-badge">Private link</span>
              </div>

              <div className="custom-flow-steps">
                <div>
                  <strong>01</strong>
                  <span>Create a lobby</span>
                </div>

                <div>
                  <strong>02</strong>
                  <span>Invite producers</span>
                </div>

                <div>
                  <strong>03</strong>
                  <span>Flip the sample</span>
                </div>

                <div>
                  <strong>04</strong>
                  <span>Vote for a winner</span>
                </div>
              </div>
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
                <strong>Private</strong>
                <span>Custom Lobbies</span>
              </div>

              <div className="hero-stat-item">
                <div className="hero-stat-icon">♕</div>
                <strong>Ranked</strong>
                <span>Live Ladder</span>
              </div>
            </div>

            <p className="mini-note">
              Join <RegisteredProducerCount suffix="+" /> producers using FL
              Battles to host private beat battles and compete in ranked sample
              flips.
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
            How custom battles work
          </div>

          <h2>Send one link. Everyone flips the same sample.</h2>

          <p>
            FL Battles is built for quick private sessions and competitive
            ranked reps. Hosts can bring their own group, start a battle, and
            crown a winner without complicated setup.
          </p>
        </div>

        <div className="feature-grid">
          <div className="card feature-card">
            <span className="card-number">01</span>

            <h3>Create a private lobby</h3>

            <p>
              Start a custom beat battle for your friends, Discord server,
              stream, class, or producer community.
            </p>
          </div>

          <div className="card feature-card">
            <span className="card-number">02</span>

            <h3>Invite with one link</h3>

            <p>
              Share the lobby link and let producers join directly. No need to
              wait for random matchmaking.
            </p>
          </div>

          <div className="card feature-card">
            <span className="card-number">03</span>

            <h3>Battle, vote, and replay</h3>

            <p>
              Everyone flips the same sample, uploads their beat, votes, and
              gets a winner fast.
            </p>
          </div>
        </div>
      </section>

      {/* WHY PLAY */}
      <section className="page-inner section-block split-section">
        <div>
          <div className="eyebrow">
            <span className="eyebrow-dot" />
            Built for producer communities
          </div>

          <h2>The easiest way to run a live beat battle online.</h2>

          <p>
            Custom lobbies make FL Battles useful even when the ranked queue is
            quiet. One host can bring a whole group, run a focused battle, and
            turn casual traffic into real sessions.
          </p>

          <div className="check-list">
            <div>
              <span>✓</span>
              Private lobbies for friends, Discords, streams, and producer
              groups.
            </div>

            <div>
              <span>✓</span>
              Fast sample-flip battles that are easy to repeat.
            </div>

            <div>
              <span>✓</span>
              Ranked queue stays available for producers who want ladder
              competition.
            </div>

            <div>
              <span>✓</span>
              Simple uploads and voting instead of complicated contest rules.
            </div>
          </div>
        </div>

        <div className="card roadmap-card">
          <p className="panel-label">Best for</p>

          <h3>Host-ready battles</h3>

          <div className="roadmap-list">
            <div>
              <span>01</span>
              Producer Discord events and community nights
            </div>

            <div>
              <span>02</span>
              Friend group challenges and private sessions
            </div>

            <div>
              <span>03</span>
              Streamer-hosted beat battles with live voting
            </div>

            <div>
              <span>04</span>
              Ranked players who want extra reps between queues
            </div>
          </div>
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="page-inner final-cta-section">
        <div className="card final-cta">
          <div className="eyebrow centered">
            <span className="eyebrow-dot" />
            Ready to host?
          </div>

          <h2>Create a private beat battle in seconds.</h2>

          <p>
            Start a custom lobby, invite producers with a link, and run a live
            sample battle with your own group. Ranked battles are still there
            when you want to compete on the ladder.
          </p>

          <div className="hero-actions centered-actions">
            <a href="/battles" className="btn-primary">
              Create Custom Lobby
            </a>

            <a href="/battles" className="btn-secondary">
              Enter Ranked Queue
            </a>
          </div>
        </div>
      </section>
    </main>
  );
}