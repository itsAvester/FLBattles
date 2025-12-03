export default function FaqPage() {
  return (
    <section className="page-inner">
      <h1>FAQ</h1>
      <p className="page-description">
        Answers to common questions about how FL Battles works, how ranks are
        calculated, and what to expect in a battle.
      </p>

      {/* How it works */}
      <div className="card" style={{ marginBottom: 24 }}>
        <h2>How does FL Battles work?</h2>
        <ul
          style={{
            listStyle: "decimal",
            paddingLeft: "1.5rem",
            marginTop: 8,
            display: "grid",
            gap: 8,
          }}
        >
          <li>
            <strong>Join a battle lobby.</strong> Go to the{" "}
            <span style={{ fontWeight: 600 }}>Battles</span> page and join /
            create a lobby. Every lobby has a unique battle ID.
          </li>
          <li>
            <strong>Get the sample.</strong> Each battle has one sample in the
            middle of the page. Download it and drop it into FL Studio (or your
            DAW of choice).
          </li>
          <li>
            <strong>Produce for 10 minutes.</strong> You have a 10-minute timer
            to build your beat. You can upload your track at any time during
            this window.
          </li>
          <li>
            <strong>Upload your track.</strong> When you&apos;re happy with your
            idea, export it (mp3/wav/etc.) and upload it in the lobby. Once you
            upload, you&apos;re locked in for that battle.
          </li>
          <li>
            <strong>Voting phase.</strong> After production time, the battle
            moves to results. Everyone in the lobby can listen to the submitted
            tracks and vote. You can only vote once per battle and can&apos;t
            vote for yourself.
          </li>
          <li>
            <strong>Ranking & stats update.</strong> When a battle ends, your
            stats (battles played, win rate, rating) are updated. Your rating
            determines your rank tier and position on the global leaderboard.
          </li>
        </ul>
      </div>

      {/* Profiles & links */}
      <div className="card" style={{ marginBottom: 24 }}>
        <h2>What is my profile page for?</h2>
        <p style={{ marginTop: 8 }}>
          Your profile stores your display name, stats, and external music
          links.
        </p>
        <ul
          style={{
            listStyle: "disc",
            paddingLeft: "1.5rem",
            marginTop: 8,
            display: "grid",
            gap: 6,
          }}
        >
          <li>
            <strong>Display Name</strong> – This is the name that shows on the
            leaderboard and battle results.
          </li>
          <li>
            <strong>Spotify, SoundCloud, YouTube</strong> – Add links on your{" "}
            <span style={{ fontWeight: 600 }}>Profile</span> page so other
            players can check out your music. These links are visible on your
            public player page.
          </li>
          <li>
            <strong>Stats</strong> – You can see battles played, win rate, and
            current rating.
          </li>
        </ul>
      </div>

      {/* Ranking system */}
      <div className="card" style={{ marginBottom: 24 }}>
        <h2>How does the ranking system work?</h2>
        <p style={{ marginTop: 8 }}>
          Every player has a hidden numeric <strong>rating</strong>. Your rating
          goes up when you perform well in battles and can go down if you lose
          (exact tuning may change while the site is in development).
        </p>
        <p style={{ marginTop: 8 }}>
          Your rating puts you into one of several <strong>tiers</strong>:
        </p>

        <ul
          style={{
            listStyle: "disc",
            paddingLeft: "1.5rem",
            marginTop: 8,
            display: "grid",
            gap: 4,
          }}
        >
          <li>
            <strong>Unranked</strong> – No rating yet (usually new players).
          </li>
          <li>
            <strong>Bronze</strong> – 0–199 rating
          </li>
          <li>
            <strong>Silver</strong> – 200–399 rating
          </li>
          <li>
            <strong>Gold</strong> – 400–599 rating
          </li>
          <li>
            <strong>Platinum</strong> – 600–799 rating
          </li>
          <li>
            <strong>Diamond</strong> – 800–999 rating
          </li>
          <li>
            <strong>Emerald</strong> – 1000–1499 rating
          </li>
          <li>
            <strong>Ruby</strong> – 1500+ rating
          </li>
          <li>
            <strong>Champion</strong> – Top 10 players on the entire site,
            regardless of rating. This is a special title for the highest-ranked
            producers.
          </li>
        </ul>

        <p style={{ marginTop: 8 }}>
          You can see your tier and rating on your{" "}
          <span style={{ fontWeight: 600 }}>Profile</span> page, and compare
          yourself to others on the{" "}
          <span style={{ fontWeight: 600 }}>Leaderboard</span>.
        </p>
      </div>

      {/* Leaderboard */}
      <div className="card" style={{ marginBottom: 24 }}>
        <h2>How does the leaderboard work?</h2>
        <ul
          style={{
            listStyle: "disc",
            paddingLeft: "1.5rem",
            marginTop: 8,
            display: "grid",
            gap: 6,
          }}
        >
          <li>
            The leaderboard shows the <strong>top 100 players</strong> sorted by
            rating (highest first).
          </li>
          <li>
            You can search players by their <strong>display name</strong>.
          </li>
          <li>
            Clicking on a player&apos;s name opens their{" "}
            <strong>public profile</strong>, where you can see their stats,
            rank, and external links.
          </li>
          <li>
            The top 10 players on the leaderboard are given the{" "}
            <strong>Champion</strong> rank.
          </li>
        </ul>
      </div>

      {/* Misc */}
      <div className="card">
        <h2>Other questions</h2>
        <ul
          style={{
            listStyle: "disc",
            paddingLeft: "1.5rem",
            marginTop: 8,
            display: "grid",
            gap: 6,
          }}
        >
          <li>
            <strong>Can I use any DAW?</strong> Yes. The site is themed around
            FL Studio, but you can use any DAW as long as you can import the
            sample and export audio.
          </li>
          <li>
            <strong>What audio formats are supported?</strong> Typically mp3 and
            wav. If you run into upload issues with a specific format, exporting
            as mp3 or wav will usually fix it.
          </li>
          <li>
            <strong>Will the rating system change?</strong> Possibly. While the
            site is in development, the exact rating gains/losses per battle may
            be adjusted to make matchmaking and ranks feel fair.
          </li>
        </ul>
      </div>
    </section>
  );
}
