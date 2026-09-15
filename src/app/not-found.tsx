import Link from "next/link";
export default function NotFound() {
  return (
    <section className="section empty-state">
      <span className="eyebrow">404</span>
      <h1>
        Bu səhifə <em>tapılmadı.</em>
      </h1>
      <Link className="button" href="/">
        Ana səhifəyə qayıt →
      </Link>
    </section>
  );
}
