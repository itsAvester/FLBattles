import type { Metadata } from "next";
import RegisteredProducerCount from "../components/RegisteredProducerCount";
import RecentChampions from "../components/RecentChampions";

export const metadata: Metadata = {
  title: "Online Beat Battles for Music Producers | FLBattles",
  description:
    "Compete in online beat battles, host custom producer battles, make beats from samples, vote on submissions, and climb the FLBattles leaderboard.",
  alternates: {
    canonical: "/beat-battles",
  },
  openGraph: {
    title: "Online Beat Battles for Music Producers | FLBattles",
    description:
      "Ranked and custom online beat battles for music producers. Flip samples, upload beats, vote, and climb the leaderboard.",
    url: "https://flbattles.com/beat-battles",
    siteName: "FLBattles",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Online Beat Battles for Music Producers | FLBattles",
    description:
      "Join ranked beat battles, host custom battles, make beats from samples, and climb the FLBattles leaderboard.",
  },
};

const websiteJsonLd = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: "FLBattles",
  url: "https://flbattles.com",
  description:
    "An online beat battle platform for music producers to join ranked beat battles, host custom battles, make beats from samples, vote, and climb the leaderboard.",
};

const organizationJsonLd = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "FLBattles",
  url: "https://flbattles.com",
  description:
    "FLBattles is an online beat battle platform for producers, ranked competitions, custom lobbies, sample-based battles, voting, and leaderboards.",
};

const faqJsonLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    {
      "@type": "Question",
      name: "What is a beat battle?",
      acceptedAnswer: {
        "@type": "Answer",
        text:
          "A beat battle is a music production challenge where producers create beats from the same sample or prompt, then compare submissions through voting or judging.",
      },
    },
    {
      "@type": "Question",
      name: "How do online beat battles work on FLBattles?",
      acceptedAnswer: {
        "@type": "Answer",
        text:
          "On FLBattles, producers join a ranked or custom lobby, receive a shared sample, make a beat during the timed round, upload their track, vote on submissions, and see the results.",
      },
    },
    {
      "@type": "Question",
      name: "Can I host a custom beat battle?",
      acceptedAnswer: {
        "@type": "Answer",
        text:
          "Yes. FLBattles lets producers create private custom beat battle lobbies and invite others with a direct lobby link.",
      },
    },
    {
      "@type": "Question",
      name: "Are FLBattles beat battles ranked?",
      acceptedAnswer: {
        "@type": "Answer",
        text:
          "FLBattles includes ranked beat battles where results can affect rating, rank tier, win rate, and leaderboard position.",
      },
    },
  ],
};

export default function BeatBattlesPage() {
  return (
    <main className="home-shell fl-home-launchpad">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(websiteJsonLd),
        }}
      />

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(organizationJsonLd),
        }}
      />

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(faqJsonLd),
        }}
      />

      <section className="fl-home-hero">
        <div className="page-inner fl-home-hero-grid">
          <div className="fl-home-copy">
            <div className="eyebrow fl-home-eyebrow">
              <span className="eyebrow-dot" />
              Online beat battles · ranked lobbies · custom rooms
            </div>

            <h1 className="fl-home-headline">
              <span>Online beat battles.</span>
              <span>Built for producers.</span>
              <span>Ready in seconds.</span>
            </h1>

            <p className="fl-home-description">
              FLBattles is an online beat battle platform where music producers
              flip the same sample, upload beats, vote for winners, climb ranked
              leaderboards, and host private custom battles with one invite link.
            </p>

            <div className="fl-home-actions">
              <a href="/battles" className="btn-primary fl-home-primary-action">
                Start a Beat Battle
              </a>

              <a
                href="/leaderboard"
                className="btn-secondary fl-home-secondary-action"
              >
                View Leaderboard
              </a>
            </div>

            <div className="fl-home-proof-row" aria-label="FLBattles stats">
              <div>
                <strong>
                  <RegisteredProducerCount suffix="+" />
                </strong>
                <span>producers joined</span>
              </div>

              <div>
                <strong>Custom</strong>
                <span>beat battle rooms</span>
              </div>

              <div>
                <strong>Ranked</strong>
                <span>producer battles</span>
              </div>
            </div>
          </div>

          <div className="fl-home-side-panel">
            <RecentChampions />
          </div>
        </div>
      </section>

      <section className="page-inner fl-home-mode-section">
        <div className="fl-home-section-head">
          <div className="eyebrow centered">
            <span className="eyebrow-dot" />
            How FLBattles works
          </div>

          <h2>One sample. One timer. One winner.</h2>
          <p>
            Every beat battle gives producers the same creative starting point,
            then lets the community decide who flipped it best.
          </p>
        </div>

        <div className="fl-home-mode-grid">
          <a href="/battles" className="fl-home-mode-card fl-home-mode-card-primary">
            <span className="fl-home-mode-number">01</span>
            <strong>Join a beat battle</strong>
            <p>
              Enter ranked matchmaking or create a private custom lobby for your
              producer friends.
            </p>
          </a>

          <a href="/battles" className="fl-home-mode-card">
            <span className="fl-home-mode-number">02</span>
            <strong>Flip the sample</strong>
            <p>
              Download the shared sample, make your beat, and upload your track
              before the timer ends.
            </p>
          </a>

          <a href="/leaderboard" className="fl-home-mode-card">
            <span className="fl-home-mode-number">03</span>
            <strong>Vote and climb</strong>
            <p>
              Listen to submissions, vote for the best beat, and build your rank
              on the leaderboard.
            </p>
          </a>
        </div>
      </section>

      <section className="page-inner fl-home-mode-section">
        <div className="fl-home-section-head">
          <div className="eyebrow centered">
            <span className="eyebrow-dot" />
            Beat battle modes
          </div>

          <h2>Ranked battles or private rooms.</h2>
          <p>
            FLBattles is built for quick public competition and invite-only
            beat battles with your own group.
          </p>
        </div>

        <div className="fl-home-mode-grid">
          <a href="/battles" className="fl-home-mode-card fl-home-mode-card-primary">
            <span className="fl-home-mode-number">01</span>
            <strong>Ranked beat battles</strong>
            <p>
              Queue into public producer battles, win points, improve your
              rating, and chase the Champion title.
            </p>
          </a>

          <a href="/battles" className="fl-home-mode-card">
            <span className="fl-home-mode-number">02</span>
            <strong>Custom beat battles</strong>
            <p>
              Host a private battle, invite producers with a link, and run an
              unranked session on your terms.
            </p>
          </a>

          <a href="/samples/submit" className="fl-home-mode-card">
            <span className="fl-home-mode-number">03</span>
            <strong>Sample-based battles</strong>
            <p>
              Submit original samples that may be used in future battles and
              help keep the platform fresh.
            </p>
          </a>
        </div>
      </section>

      <section className="page-inner fl-home-mode-section">
        <div className="fl-home-section-head">
          <div className="eyebrow centered">
            <span className="eyebrow-dot" />
            Beat battle FAQ
          </div>

          <h2>Common questions from producers.</h2>
          <p>
            New to online beat battles? Here are the basics before you jump into
            a lobby.
          </p>
        </div>

        <div className="fl-home-mode-grid">
          <a href="/faq" className="fl-home-mode-card">
            <span className="fl-home-mode-number">01</span>
            <strong>What is a beat battle?</strong>
            <p>
              A timed production challenge where producers make beats from the
              same sample and compete through voting.
            </p>
          </a>

          <a href="/faq" className="fl-home-mode-card">
            <span className="fl-home-mode-number">02</span>
            <strong>Can I host one?</strong>
            <p>
              Yes. Create a custom lobby and invite producers with a direct
              battle link.
            </p>
          </a>

          <a href="/faq" className="fl-home-mode-card">
            <span className="fl-home-mode-number">03</span>
            <strong>Are battles ranked?</strong>
            <p>
              Ranked battles can affect rating, win rate, tier, and leaderboard
              position.
            </p>
          </a>
        </div>
      </section>

      <section className="page-inner fl-home-final-strip">
        <div>
          <span className="panel-label">Ready to compete?</span>
          <h2>Start an online beat battle.</h2>
          <p>
            Join ranked matchmaking or create a private custom lobby for your
            group. FLBattles gives producers a fast way to battle, vote, and
            climb the board.
          </p>
        </div>

        <a href="/battles" className="btn-primary fl-home-primary-action">
          Go to Battles
        </a>
      </section>
    </main>
  );
}