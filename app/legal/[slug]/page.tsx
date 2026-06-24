import Link from "next/link";
import { notFound } from "next/navigation";

const LAST_UPDATED = "June 23, 2026";
const SITE_NAME = "FLBattles";
const SUPPORT_EMAIL = "legalflbattles@gmail.com";
const COPYRIGHT_EMAIL = "legalflbattles@gmail.com";
const LEGAL_NOTICE_ADDRESS = "legalflbattles@gmail.com";

type LegalSection = {
  heading: string;
  paragraphs: string[];
};

type LegalPage = {
  title: string;
  description: string;
  sections: LegalSection[];
};

const pages: Record<string, LegalPage> = {
  terms: {
    title: "Terms of Service",
    description:
      "These Terms explain the rules for using FLBattles, creating an account, joining battles, uploading audio, voting, and using site features.",
    sections: [
      {
        heading: "1. Acceptance of these Terms",
        paragraphs: [
          `By creating an account or using ${SITE_NAME}, you agree to these Terms of Service, the Privacy Policy, Copyright Policy, Community Guidelines, Battle Rules, and any rules shown during signup, upload, or battle flows.`,
          "If you do not agree, do not create an account, upload content, join battles, or use the platform.",
        ],
      },
      {
        heading: "2. Age requirement",
        paragraphs: [
          "You must be at least 13 years old to use FLBattles. If you are under 18, you may only use FLBattles with permission from a parent or legal guardian.",
        ],
      },
      {
        heading: "3. Account responsibility",
        paragraphs: [
          "You are responsible for your account, your login credentials, your profile information, your uploads, your votes, and all activity connected to your account.",
          "You may not impersonate another person, create abusive or misleading accounts, use bots, manipulate votes, or interfere with the platform.",
        ],
      },
      {
        heading: "4. Audio uploads and user content",
        paragraphs: [
          "You may only upload audio, beats, samples, filenames, notes, usernames, profile links, and other content that you created, own, control, or have all necessary rights, licenses, and permissions to use.",
          "You may not upload copyrighted loops, melodies, vocals, samples, sound recordings, stems, acapellas, beats, or other third-party material unless you have permission for the specific use on FLBattles.",
          `You grant ${SITE_NAME} a non-exclusive, worldwide, royalty-free license to host, store, stream, reproduce, display, moderate, and use your uploaded content as needed to operate battles, voting, rankings, results, profiles, moderation, security, and related platform features.`,
        ],
      },
      {
        heading: "5. Moderation and removal",
        paragraphs: [
          `${SITE_NAME} may reject, remove, restrict, disable access to, or delete content or accounts at any time if we believe they may violate these Terms, copyright rules, community rules, battle rules, platform integrity, or applicable law.`,
        ],
      },
      {
        heading: "6. No professional advice or guaranteed availability",
        paragraphs: [
          `${SITE_NAME} is provided as a platform for entertainment, competition, and community use. We do not guarantee uninterrupted availability, rankings, matchmaking, battle results, or data retention.`,
        ],
      },
      {
        heading: "7. Limitation of liability",
        paragraphs: [
          "To the fullest extent allowed by law, FLBattles is not responsible for indirect, incidental, special, consequential, exemplary, or punitive damages, lost profits, lost data, lost opportunities, or disputes between users.",
        ],
      },
      {
        heading: "8. Contact",
        paragraphs: [
          `Questions about these Terms can be sent to ${SUPPORT_EMAIL}. Legal notices can be sent to ${LEGAL_NOTICE_ADDRESS}.`,
        ],
      },
    ],
  },

  privacy: {
    title: "Privacy Policy",
    description:
      "This Privacy Policy explains what information FLBattles collects, how it is used, and how users can contact us.",
    sections: [
      {
        heading: "1. Information we collect",
        paragraphs: [
          "FLBattles may collect account information such as email address, user ID, display name, profile links, signup timestamps, legal acceptance records, and authentication data.",
          "FLBattles may collect platform activity such as battle participation, lobby history, uploaded audio paths, sample submissions, voting activity, results, ranking data, badge data, and moderation records.",
          "FLBattles may collect technical information such as device, browser, logs, approximate location derived from technical systems, analytics events, and security information.",
        ],
      },
      {
        heading: "2. How we use information",
        paragraphs: [
          "We use information to create accounts, operate battles, process uploads, run voting, show results, maintain leaderboards and profiles, prevent abuse, enforce rules, improve the site, and respond to support or legal requests.",
        ],
      },
      {
        heading: "3. Uploaded audio",
        paragraphs: [
          "Battle audio may be stored temporarily or as needed for voting, results, moderation, security, dispute review, and technical operation. Sample submissions may be stored for review and, if approved, platform use.",
        ],
      },
      {
        heading: "4. Service providers",
        paragraphs: [
          "FLBattles uses third-party infrastructure and service providers for hosting, authentication, storage, database, analytics, and site operation. These providers may process information as needed to provide their services.",
        ],
      },
      {
        heading: "5. Data deletion requests",
        paragraphs: [
          `Users may request account or data deletion by contacting ${SUPPORT_EMAIL}. Some information may be retained when reasonably necessary for legal, security, fraud prevention, dispute, accounting, backup, or platform integrity purposes.`,
        ],
      },
      {
        heading: "6. Security",
        paragraphs: [
          "We use reasonable technical and organizational measures to protect user information, but no online service can guarantee perfect security.",
        ],
      },
      {
        heading: "7. Children",
        paragraphs: [
          "FLBattles is not intended for children under 13. Users must be at least 13 years old to create an account.",
        ],
      },
      {
        heading: "8. Contact",
        paragraphs: [`Privacy questions can be sent to ${SUPPORT_EMAIL}.`],
      },
    ],
  },

  dmca: {
    title: "DMCA Policy",
    description:
      "This page explains how copyright owners can submit takedown notices and how users can respond.",
    sections: [
      {
        heading: "1. Copyright contact",
        paragraphs: [
          `Copyright concerns and DMCA notices should be sent to ${COPYRIGHT_EMAIL}.`,
          `Mailing address for legal notices: ${LEGAL_NOTICE_ADDRESS}.`,
          "Before relying on this page publicly, register your DMCA agent with the U.S. Copyright Office and make sure this page matches the registered contact information.",
        ],
      },
      {
        heading: "2. Takedown notices",
        paragraphs: [
          "A copyright notice should identify the copyrighted work, identify the material on FLBattles that is claimed to infringe, include enough information for us to locate the material, include contact information for the complaining party, include a good-faith statement, include an accuracy statement, and include a physical or electronic signature.",
        ],
      },
      {
        heading: "3. Counter-notices",
        paragraphs: [
          "If your content was removed and you believe it was removed by mistake or misidentification, you may send a counter-notice with your contact information, identification of the removed material, a statement under penalty of perjury that you believe the material was removed by mistake or misidentification, consent to appropriate jurisdiction, and your physical or electronic signature.",
        ],
      },
      {
        heading: "4. Repeat infringers",
        paragraphs: [
          "FLBattles may suspend or terminate accounts that repeatedly upload infringing content or repeatedly violate copyright rules.",
        ],
      },
      {
        heading: "5. Removal and moderation",
        paragraphs: [
          "FLBattles may remove, restrict, or disable access to content at any time when we believe it may violate copyright, site rules, or applicable law.",
        ],
      },
    ],
  },

  copyright: {
    title: "Copyright Policy",
    description:
      "FLBattles is for original audio, properly licensed audio, and content users have permission to use.",
    sections: [
      {
        heading: "1. Original or cleared audio only",
        paragraphs: [
          "You may only upload beats, samples, sounds, loops, melodies, vocals, stems, notes, and other content that you created, own, control, or have permission to use for the specific FLBattles feature you are using.",
        ],
      },
      {
        heading: "2. Prohibited uploads",
        paragraphs: [
          "Do not upload copyrighted songs, acapellas, vocals, melodies, loops, drums, stems, sample packs, ripped audio, downloaded beats, or third-party content unless you have the rights and permissions required for use on FLBattles.",
        ],
      },
      {
        heading: "3. Battle beat uploads",
        paragraphs: [
          "Battle beat uploads are submitted for temporary battle hosting, streaming, voting, moderation, and results display. You are responsible for ensuring each submission is original or properly licensed.",
        ],
      },
      {
        heading: "4. Sample submissions",
        paragraphs: [
          "Sample submissions may be reviewed and, if approved, made available for other FLBattles users to use within competitions. Because approved samples may be reused in battles, you must have all rights needed to submit them for that purpose.",
        ],
      },
      {
        heading: "5. Enforcement",
        paragraphs: [
          "FLBattles may reject, remove, disable, restrict, or delete any upload that may violate copyright rules, platform rules, or applicable law.",
        ],
      },
    ],
  },

  "community-guidelines": {
    title: "Community Guidelines",
    description:
      "These guidelines help keep FLBattles fair, respectful, and useful for producers.",
    sections: [
      {
        heading: "1. Respect other users",
        paragraphs: [
          "Do not harass, threaten, dox, impersonate, exploit, or abuse other users. Do not use usernames, profile content, uploads, or messages to target another person.",
        ],
      },
      {
        heading: "2. Keep uploads appropriate",
        paragraphs: [
          "Do not upload content that is unlawful, hateful, threatening, sexually exploitative, invasive of privacy, malicious, or intended to harm the platform or other users.",
        ],
      },
      {
        heading: "3. Do not cheat",
        paragraphs: [
          "Do not manipulate votes, use bots, create fake accounts, coordinate unfair voting, exploit bugs, evade restrictions, or interfere with battle results.",
        ],
      },
      {
        heading: "4. Moderation",
        paragraphs: [
          "FLBattles may remove content, reset results, restrict features, or suspend accounts when needed to protect the platform and community.",
        ],
      },
    ],
  },

  "battle-rules": {
    title: "Battle Rules",
    description:
      "These rules explain how FLBattles competitions, submissions, voting, and results work.",
    sections: [
      {
        heading: "1. Joining a battle",
        paragraphs: [
          "Users may join ranked or custom battles through the available site flows. Some battles may require a minimum number of players before starting.",
        ],
      },
      {
        heading: "2. Samples and production window",
        paragraphs: [
          "When a battle starts, users receive the battle sample or host-selected audio and must submit within the production window shown on the site.",
        ],
      },
      {
        heading: "3. Beat submissions",
        paragraphs: [
          "Each user is responsible for submitting audio they created or have permission to use. Submissions may be stored and streamed for battle voting, moderation, results, and related platform operation.",
        ],
      },
      {
        heading: "4. Voting",
        paragraphs: [
          "Voting rules may vary by mode. Ranked battles and custom battles may use different voting styles. FLBattles may reject or disregard votes that appear fraudulent, abusive, duplicated, or manipulated.",
        ],
      },
      {
        heading: "5. No submissions, disconnections, and leaving",
        paragraphs: [
          "A player who does not submit, disconnects, or leaves may lose the battle, receive a penalty, or be disqualified depending on the mode and site logic.",
        ],
      },
      {
        heading: "6. Ties and results",
        paragraphs: [
          "FLBattles may use automated tie-breakers, voting timestamps, platform rules, or admin review to resolve ties or disputed results.",
        ],
      },
      {
        heading: "7. Rule changes",
        paragraphs: [
          "FLBattles may update battle rules, scoring, voting, ranking, and moderation systems as the platform evolves.",
        ],
      },
    ],
  },

  "sample-submission-terms": {
    title: "Sample Submission Terms",
    description:
      "These terms apply when users submit samples for review and possible use in future FLBattles competitions.",
    sections: [
      {
        heading: "1. Required rights",
        paragraphs: [
          "You may only submit samples that you created, own, control, or have all necessary rights, licenses, permissions, and clearances to submit for FLBattles review and competition use.",
        ],
      },
      {
        heading: "2. License to FLBattles",
        paragraphs: [
          "By submitting a sample, you grant FLBattles a non-exclusive, worldwide, royalty-free license to review, store, host, stream, reproduce, display, and make the sample available as part of FLBattles competitions, voting, rankings, moderation, results, and related site features.",
        ],
      },
      {
        heading: "3. Use by other users",
        paragraphs: [
          "If your sample is approved, other FLBattles users may use it within FLBattles competitions to create and submit battle entries.",
        ],
      },
      {
        heading: "4. Prohibited samples",
        paragraphs: [
          "Do not submit copyrighted loops, melodies, drums, vocals, recordings, stems, ripped audio, or sample-pack material unless you created it yourself or have permission for this use.",
        ],
      },
      {
        heading: "5. Review and removal",
        paragraphs: [
          "FLBattles may approve, reject, remove, disable, or restrict any sample at any time if it may violate copyright, site rules, moderation standards, or applicable law.",
        ],
      },
    ],
  },
};

export default async function LegalDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const page = pages[slug];

  if (!page) {
    notFound();
  }

  return (
    <main className="legal-shell">
      <article className="page-inner legal-page">
        <header className="legal-hero">
          <Link href="/legal" className="legal-back-link">
            ← Legal center
          </Link>

          <div className="eyebrow">
            <span className="eyebrow-dot" />
            Last updated {LAST_UPDATED}
          </div>

          <h1>{page.title}</h1>
          <p>{page.description}</p>
        </header>

        <div className="legal-document-card">
          {page.sections.map((section) => (
            <section key={section.heading} className="legal-section">
              <h2>{section.heading}</h2>
              {section.paragraphs.map((paragraph) => (
                <p key={paragraph}>{paragraph}</p>
              ))}
            </section>
          ))}
        </div>
      </article>
    </main>
  );
}
