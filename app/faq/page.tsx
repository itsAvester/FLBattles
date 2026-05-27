export default function FaqPage() {
  const pageFont =
    "var(--font-manrope), Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";

  const faqSections = [
    {
      number: "01",
      label: "Battle flow",
      title: "How does FL Battles work?",
      items: [
        {
          question: "Join a battle lobby.",
          answer:
            "Go to the Battles page and join or create a lobby. Every lobby has a unique battle ID.",
        },
        {
          question: "Get the sample.",
          answer:
            "Each battle has one shared sample in the middle of the page. Download it and drop it into FL Studio or your DAW of choice.",
        },
        {
          question: "Produce for 15 minutes.",
          answer:
            "You have a 15-minute timer to build your beat. You can upload your track at any time during this window.",
        },
        {
          question: "Upload your track.",
          answer:
            "When you are happy with your idea, export it as MP3, WAV, or another supported audio file and upload it in the lobby.",
        },
        {
          question: "Voting phase.",
          answer:
            "After production time, everyone can listen to the submitted tracks and vote. You can only vote once per battle and cannot vote for yourself.",
        },
        {
          question: "Ranking and stats update.",
          answer:
            "When a battle ends, your battles played, win rate, rating, rank tier, and leaderboard position can update.",
        },
      ],
    },
    {
      number: "02",
      label: "Profiles",
      title: "What is my profile page for?",
      items: [
        {
          question: "Display name",
          answer:
            "This is the name that shows on the leaderboard, battle results, and public player pages.",
        },
        {
          question: "Music links",
          answer:
            "You can add Spotify, SoundCloud, and YouTube links so other players can check out your music.",
        },
        {
          question: "Stats",
          answer:
            "Your profile shows battles played, win rate, current rating, rank tier, and global position.",
        },
      ],
    },
    {
      number: "03",
      label: "Ranking",
      title: "How does the ranking system work?",
      items: [
        {
          question: "Unranked",
          answer: "No rating yet. This usually applies to new players.",
        },
        {
          question: "Bronze",
          answer: "0–49 rating.",
        },
        {
          question: "Silver",
          answer: "50–99 rating.",
        },
        {
          question: "Gold",
          answer: "100–199 rating.",
        },
        {
          question: "Platinum",
          answer: "200–299 rating.",
        },
        {
          question: "Diamond",
          answer: "300–399 rating.",
        },
        {
          question: "Emerald",
          answer: "400–599 rating.",
        },
        {
          question: "Ruby",
          answer: "600+ rating.",
        },
        {
          question: "Champion",
          answer:
            "A special title for the top 10 players on the entire site, regardless of rating.",
        },
      ],
    },
    {
      number: "04",
      label: "Leaderboard",
      title: "How does the leaderboard work?",
      items: [
        {
          question: "Top players",
          answer:
            "The leaderboard shows the top players sorted by rating from highest to lowest.",
        },
        {
          question: "Search",
          answer:
            "You can search players by display name and open their public profile.",
        },
        {
          question: "Champion rank",
          answer:
            "The top 10 players on the leaderboard receive the Champion title.",
        },
      ],
    },
    {
      number: "05",
      label: "Audio",
      title: "Other questions",
      items: [
        {
          question: "Can I use any DAW?",
          answer:
            "Yes. The site is themed around FL Studio, but you can use any DAW as long as you can import the sample and export audio.",
        },
        {
          question: "What audio formats are supported?",
          answer:
            "MP3 and WAV are the safest choices. If you run into upload issues, exporting as MP3 or WAV will usually fix it.",
        },
        {
          question: "Will the rating system change?",
          answer:
            "Possibly. While the site is in development, rating gains and losses may be adjusted to make matchmaking and ranks feel fair.",
        },
      ],
    },
  ];

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
        Support desk · rules and ranking
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
        Battle
        <br />
        FAQ
      </h1>

      <p
        className="page-description"
        style={{
          maxWidth: 720,
          marginTop: 24,
          color: "var(--muted)",
          fontSize: "1rem",
          lineHeight: 1.75,
        }}
      >
        Answers to common questions about how FL Battles works, how ranks are
        calculated, what your profile is for, and what to expect when the timer
        starts.
      </p>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
          gap: 14,
          marginTop: 34,
          marginBottom: 18,
        }}
      >
        <div className="card" style={{ padding: 22, overflow: "hidden" }}>
          <div style={{ position: "relative", zIndex: 1 }}>
            <p className="panel-label">Timer</p>
            <strong
              style={{
                display: "block",
                marginTop: 8,
                fontFamily: pageFont,
                fontSize: "2.2rem",
                lineHeight: 1,
                letterSpacing: "-0.06em",
                color: "var(--text)",
              }}
            >
              15:00
            </strong>
            <p
              style={{
                margin: "10px 0 0",
                color: "var(--muted)",
                fontSize: "0.9rem",
                lineHeight: 1.55,
              }}
            >
              Every ranked battle is built around a short production window.
            </p>
          </div>
        </div>

        <div className="card" style={{ padding: 22, overflow: "hidden" }}>
          <div style={{ position: "relative", zIndex: 1 }}>
            <p className="panel-label">Modes</p>
            <strong
              style={{
                display: "block",
                marginTop: 8,
                fontFamily: pageFont,
                fontSize: "2.2rem",
                lineHeight: 1,
                letterSpacing: "-0.06em",
                color: "var(--text)",
              }}
            >
              Ranked / Custom
            </strong>
            <p
              style={{
                margin: "10px 0 0",
                color: "var(--muted)",
                fontSize: "0.9rem",
                lineHeight: 1.55,
              }}
            >
              Play for rating or create private lobbies for friends.
            </p>
          </div>
        </div>

        <div className="card" style={{ padding: 22, overflow: "hidden" }}>
          <div style={{ position: "relative", zIndex: 1 }}>
            <p className="panel-label">Goal</p>
            <strong
              style={{
                display: "block",
                marginTop: 8,
                fontFamily: pageFont,
                fontSize: "2.2rem",
                lineHeight: 1,
                letterSpacing: "-0.06em",
                color: "var(--text)",
              }}
            >
              Finish Ideas
            </strong>
            <p
              style={{
                margin: "10px 0 0",
                color: "var(--muted)",
                fontSize: "0.9rem",
                lineHeight: 1.55,
              }}
            >
              Get fast reps, upload your beat, vote, and run it back.
            </p>
          </div>
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(0, 1fr)",
          gap: 18,
          marginTop: 18,
        }}
      >
        {faqSections.map((section) => (
          <div
            key={section.title}
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
                display: "grid",
                gridTemplateColumns: "90px minmax(0, 1fr)",
                gap: 24,
                alignItems: "start",
              }}
            >
              <div>
                <span
                  style={{
                    display: "block",
                    color: "var(--orange)",
                    fontFamily: pageFont,
                    fontSize: "3.4rem",
                    fontWeight: 800,
                    lineHeight: 1,
                    letterSpacing: "-0.08em",
                  }}
                >
                  {section.number}
                </span>

                <p
                  className="panel-label"
                  style={{
                    marginTop: 14,
                    marginBottom: 0,
                  }}
                >
                  {section.label}
                </p>
              </div>

              <div>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                    gap: 16,
                    marginBottom: 18,
                  }}
                >
                  <h2
                    style={{
                      margin: 0,
                      fontFamily: pageFont,
                      fontSize: "clamp(2rem, 3.4vw, 3.2rem)",
                      fontWeight: 800,
                      lineHeight: 0.95,
                      letterSpacing: "-0.07em",
                      color: "var(--text)",
                    }}
                  >
                    {section.title}
                  </h2>

                  <span className="sample-badge">Info</span>
                </div>

                <div
                  style={{
                    display: "grid",
                    borderTop: "1px solid var(--line)",
                  }}
                >
                  {section.items.map((item) => (
                    <div
                      key={item.question}
                      style={{
                        display: "grid",
                        gridTemplateColumns: "minmax(180px, 0.42fr) minmax(0, 1fr)",
                        gap: 18,
                        padding: "16px 0",
                        borderBottom: "1px solid var(--line)",
                      }}
                    >
                      <h3
                        style={{
                          margin: 0,
                          color: "var(--text)",
                          fontSize: "0.95rem",
                          fontWeight: 900,
                          letterSpacing: "-0.02em",
                        }}
                      >
                        {item.question}
                      </h3>

                      <p
                        style={{
                          margin: 0,
                          color: "var(--muted)",
                          fontSize: "0.92rem",
                          lineHeight: 1.65,
                        }}
                      >
                        {item.answer}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div
        className="card"
        style={{
          marginTop: 18,
          padding: 30,
          overflow: "hidden",
          textAlign: "center",
        }}
      >
        <div style={{ position: "relative", zIndex: 1 }}>
          <div className="eyebrow centered">
            <span className="eyebrow-dot" />
            Ready to play?
          </div>

          <h2
            style={{
              maxWidth: 760,
              margin: "0 auto",
              fontFamily: pageFont,
              fontSize: "clamp(2.4rem, 5vw, 4.5rem)",
              fontWeight: 800,
              lineHeight: 0.9,
              letterSpacing: "-0.075em",
              color: "var(--text)",
            }}
          >
            Start your next 15-minute battle.
          </h2>

          <p
            style={{
              maxWidth: 600,
              margin: "18px auto 0",
              color: "var(--muted)",
              lineHeight: 1.7,
            }}
          >
            Queue into a ranked lobby, flip the sample, upload your beat, and
            see how it stacks up.
          </p>

          <div
            style={{
              display: "flex",
              justifyContent: "center",
              gap: 12,
              flexWrap: "wrap",
              marginTop: 26,
            }}
          >
            <a href="/battles" className="btn-primary">
              Enter Queue
            </a>

            <a href="/profile" className="btn-secondary">
              View Profile
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}