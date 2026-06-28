import Link from "next/link";

export default function SiteFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="site-footer">
      <div className="page-inner site-footer-inner">
        <div className="site-footer-brand">
          <Link href="/" className="site-footer-logo" aria-label="FLBattles home">
            <span className="site-footer-logo-mark" />
            <span>FLBATTLES</span>
          </Link>

          <p>
            Timed beat battles for producers. Upload only original audio or
            audio you own, control, or have permission to use.
          </p>
        </div>

        <nav className="site-footer-links" aria-label="Footer navigation">
          <div className="site-footer-link-group">
            <span>Platform</span>
            <Link href="/battles">Battles</Link>
            <Link href="/leaderboard">Leaderboard</Link>
            <Link href="/samples/submit">Submit Sample</Link>
            <Link href="/profile">Profile</Link>
          </div>

          <div className="site-footer-link-group">
            <span>Legal</span>
            <Link href="/legal/terms">Terms</Link>
            <Link href="/legal/privacy">Privacy</Link>
            <Link href="/legal/dmca">DMCA</Link>
            <Link href="/legal/community-guidelines">Community Guidelines</Link>
            <Link href="/legal/battle-rules">Battle Rules</Link>
          </div>

          <div className="site-footer-link-group">
            <span>Copyright</span>
            <Link href="/legal/sample-submission-terms">Sample Submission Terms</Link>
            <Link href="/legal/copyright">Copyright Policy</Link>
            <Link href="/report">Report an Issue</Link>
            <a href="mailto:support@flbattles.com">Contact</a>
          </div>
        </nav>
      </div>

      <div className="page-inner site-footer-bottom">
        <span>© {year} FLBattles. All rights reserved.</span>
        <span>Original or properly licensed audio only. No uncleared third-party material.</span>
      </div>
    </footer>
  );
}
