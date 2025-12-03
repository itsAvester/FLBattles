// app/page.tsx
export default function HomePage() {
  return (
    <section className="hero">
      <div className="hero-content">
        <h1>10-Minute FL Studio Beat Battles</h1>
        <p>
          Get matched with other producers, receive a shared sample, and create
          your best idea in 10 minutes. Upload your clip and climb the ranked
          ladder.
        </p>
        <div className="hero-actions">
          <a href="/battles" className="btn-primary">
            Enter Ranked Queue
          </a>
          <a href="/profile" className="btn-secondary">
            View Profile
          </a>
        </div>
      </div>
    </section>
  );
}