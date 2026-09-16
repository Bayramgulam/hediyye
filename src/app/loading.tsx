export default function Loading() {
  return (
    <section className="section loading" role="status" aria-label="Yüklənir">
      <span className="loading-kicker">LUMA · DÜŞÜNÜLƏRƏK HAZIRLANIR</span>
      <div className="loading-title" />
      <div className="loading-copy" />
      <div className="loading-grid" aria-hidden="true">
        <span />
        <span />
        <span />
      </div>
    </section>
  );
}
