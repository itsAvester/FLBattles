"use client";

import { useMemo, useState } from "react";

type FaqItem = {
  question: string;
  answer: string;
};

type FaqSection = {
  number: string;
  label: string;
  title: string;
  summary: string;
  items: FaqItem[];
};

const faqSections: FaqSection[] = [
  {
    number: "01",
    label: "Battle flow",
    title: "How does FLBattles work?",
    summary:
      "Join a lobby, get a sample, make a beat, upload it, vote, and see how your result affects your profile.",
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
    summary:
      "Your profile is your public identity on FLBattles: name, links, battle stats, rating, and rank position.",
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
    summary:
      "Players move through rank tiers based on rating. The top 10 players receive a special Champion title.",
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
    summary:
      "The leaderboard shows the strongest producers by rating and lets players search public profiles.",
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
    summary:
      "Use any DAW, export a clean audio file, and expect the system to keep improving while FLBattles is in beta.",
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

export default function FaqPage() {
  const [activeSectionTitle, setActiveSectionTitle] = useState(
    faqSections[0].title
  );

  const activeSection = useMemo(() => {
    return (
      faqSections.find((section) => section.title === activeSectionTitle) ??
      faqSections[0]
    );
  }, [activeSectionTitle]);

  return (
    <section className="faq-page page-inner">
      <div className="faq-content-grid">
        <aside className="faq-section-menu card" aria-label="FAQ sections">
          <div className="faq-section-menu-inner">
            <p className="panel-label">Sections</p>

            <div className="faq-section-button-list">
              {faqSections.map((section) => {
                const isActive = section.title === activeSection.title;

                return (
                  <button
                    key={section.title}
                    type="button"
                    className={`faq-section-button ${
                      isActive ? "faq-section-button-active" : ""
                    }`}
                    onClick={() => setActiveSectionTitle(section.title)}
                  >
                    <span>{section.number}</span>
                    <strong>{section.label}</strong>
                  </button>
                );
              })}
            </div>
          </div>
        </aside>

        <article className="faq-active-card card">
          <div className="faq-active-card-inner">
            <div className="faq-active-heading">
              <div className="faq-active-number-block">
                <span className="faq-active-number">
                  {activeSection.number}
                </span>
                <p className="panel-label">{activeSection.label}</p>
              </div>

              <div>
                <div className="eyebrow faq-card-eyebrow">
                  <span className="eyebrow-dot" />
                  Support desk · rules and ranking
                </div>

                <h1>{activeSection.title}</h1>

                <p>{activeSection.summary}</p>
              </div>
            </div>

            <div className="faq-answer-list">
              {activeSection.items.map((item) => (
                <div key={item.question} className="faq-answer-row">
                  <h3>{item.question}</h3>
                  <p>{item.answer}</p>
                </div>
              ))}
            </div>
          </div>
        </article>
      </div>

      <div className="faq-cta-card card">
        <div className="faq-cta-inner">
          <div className="eyebrow centered">
            <span className="eyebrow-dot" />
            Ready to play?
          </div>

          <h2>Start your next 15-minute battle.</h2>

          <p>
            Queue into a ranked lobby, flip the sample, upload your beat, and
            see how it stacks up.
          </p>

          <div className="faq-cta-actions">
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