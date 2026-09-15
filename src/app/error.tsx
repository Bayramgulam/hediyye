"use client";
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <section className="section empty-state">
      <h1>Kiçik bir fasilə.</h1>
      <p>Səhifəni yükləmək mümkün olmadı. Bir az sonra yenidən sına.</p>
      <button className="button" onClick={reset}>
        Yenidən sına
      </button>
    </section>
  );
}
