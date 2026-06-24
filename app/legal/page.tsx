import Link from "next/link";

const legalPages = [
  {
    href: "/legal/terms",
    title: "Terms of Service",
    description: "Account rules, upload rules, platform rights, moderation, and liability terms.",
  },
  {
    href: "/legal/privacy",
    title: "Privacy Policy",
    description: "What FLBattles collects, how data is used, and how users can contact you.",
  },
  {
    href: "/legal/dmca",
    title: "DMCA Policy",
    description: "Copyright takedown process and designated copyright contact information.",
  },
  {
    href: "/legal/community-guidelines",
    title: "Community Guidelines",
    description: "Rules for respectful use, usernames, uploads, votes, and fair play.",
  },
  {
    href: "/legal/battle-rules",
    title: "Battle Rules",
    description: "How battles, uploads, voting, ties, no-submissions, and disqualifications work.",
  },
  {
    href: "/legal/sample-submission-terms",
    title: "Sample Submission Terms",
    description: "Rights and permissions required when submitting samples for review.",
  },
];

export default function LegalIndexPage() {
  return (
    <main className="legal-shell">
      <section className="page-inner legal-page">
        <header className="legal-hero">
          <div className="eyebrow">
            <span className="eyebrow-dot" />
            FLBattles legal center
          </div>
          <h1>Legal & platform rules.</h1>
          <p>
            These pages explain the rules for accounts, uploads, copyright,
            privacy, battles, and community behavior on FLBattles.
          </p>
        </header>

        <div className="legal-card-grid">
          {legalPages.map((page) => (
            <Link key={page.href} href={page.href} className="legal-nav-card">
              <span>Read</span>
              <strong>{page.title}</strong>
              <p>{page.description}</p>
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}
