import Link from "next/link";
import { db } from "@/lib/db";
import { hash } from "@/lib/security";
import { notFound } from "next/navigation";
export const metadata = {
  title: "Sifariş qəbul edildi",
  robots: { index: false, follow: false },
};
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ token: string }>;
}) {
  const { token } = await searchParams;
  if (!token || !/^\w{64}$/.test(token)) notFound();
  const order = await db.order.findUnique({
    where: { tokenHash: hash(token) },
    select: { reference: true },
  });
  if (!order) notFound();
  return (
    <section className="section confirmation">
      <span className="confirmation-check">✓</span>
      <span className="eyebrow">GÖZƏL BİR DÜŞÜNCƏ YOLA ÇIXIR</span>
      <h1>
        Sifarişin <em>qəbul edildi.</em>
      </h1>
      <p>
        Sifariş nömrəsi: <strong>{order.reference}</strong>
      </p>
      <p>
        Bu şəxsi keçidi saxla. Sifarişin hazırlanmasını buradan izləyə bilərsən.
      </p>
      <Link className="button" href={"/izle/" + token}>
        Sifarişimi izlə →
      </Link>
    </section>
  );
}
