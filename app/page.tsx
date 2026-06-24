// app/page.tsx
import RegisteredProducerCount from "./components/RegisteredProducerCount";
import RecentChampions from "./components/RecentChampions";

export default function HomePage() {
  return (
    <main className="home-shell fl-home-launchpad">
      <section className="fl-home-hero">
        <div className="page-inner fl-home-hero-grid">
          <div className="fl-home-copy">
            <div className="eyebrow fl-home-eyebrow">
              <span className="eyebrow-dot" />
              Private rooms · ranked seasons · live voting
            </div>

            <h1 className="fl-home-headline">
              <span>Make beats.</span>
              <span>Battle producers.</span>
              <span>Climb the board.</span>
            </h1>

            <p className="fl-home-description">
              Flip the same sample, upload your beat, vote for a winner, and
              compete in ranked seasons — or host a private battle with one
              invite link.
            </p>

            <div className="fl-home-actions">
              <a href="/battles" className="btn-primary fl-home-primary-action">
                Start Battling
              </a>

              <a href="/leaderboard" className="btn-secondary fl-home-secondary-action">
                View Leaderboard
              </a>
            </div>

            <div className="fl-home-proof-row" aria-label="FL Battles stats">
              <div>
                <strong>
                  <RegisteredProducerCount suffix="+" />
                </strong>
                <span>producers joined</span>
              </div>

              <div>
                <strong>Private</strong>
                <span>rooms by link</span>
              </div>

              <div>
                <strong>Ranked</strong>
                <span>monthly seasons</span>
              </div>
            </div>
          </div>

          <div className="fl-home-side-panel">
            <div className="fl-home-start-card">
              <div className="fl-home-start-topline">
                <span>Battle loop</span>
                <span>Live</span>
              </div>

              <div className="fl-home-start-steps">
                <div>
                  <span>01</span>
                  <strong>Get a sample</strong>
                </div>

                <div>
                  <span>02</span>
                  <strong>Make a beat</strong>
                </div>

                <div>
                  <span>03</span>
                  <strong>Vote & rank up</strong>
                </div>
              </div>
            </div>

            <RecentChampions />
          </div>
        </div>
      </section>

      <section className="page-inner fl-home-mode-section">
        <div className="fl-home-section-head">
          <div className="eyebrow centered">
            <span className="eyebrow-dot" />
            Choose your mode
          </div>

          <h2>One page. Three ways to play.</h2>
          <p>
            Ranked for competition, private rooms for friend groups, and
            community samples to keep battles fresh.
          </p>
        </div>

        <div className="fl-home-mode-grid">
          <a href="/battles" className="fl-home-mode-card fl-home-mode-card-primary">
            <span className="fl-home-mode-number">01</span>
            <strong>Enter ranked queue</strong>
            <p>Public matchmaking, monthly leaderboard points, and real wins.</p>
          </a>

          <a href="/battles" className="fl-home-mode-card">
            <span className="fl-home-mode-number">02</span>
            <strong>Create private lobby</strong>
            <p>Invite friends with one link and run an unranked battle fast.</p>
          </a>

          <a href="/samples/submit" className="fl-home-mode-card">
            <span className="fl-home-mode-number">03</span>
            <strong>Submit samples</strong>
            <p>Upload original sounds that may appear in future battles.</p>
          </a>
        </div>
      </section>

      <section className="page-inner fl-home-final-strip">
        <div>
          <span className="panel-label">Ready to battle?</span>
          <h2>Start a session in seconds.</h2>
          <p>
            Jump into ranked matchmaking or create a private lobby for your
            group. The battle flow lives on the Battles page now.
          </p>
        </div>

        <a href="/battles" className="btn-primary fl-home-primary-action">
          Go to Battles
        </a>
      </section>
    </main>
  );
}
