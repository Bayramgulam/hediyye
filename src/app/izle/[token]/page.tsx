import { db } from "@/lib/db";
import { hash } from "@/lib/security";
import { notFound } from "next/navigation";
import { getSettings } from "@/lib/catalog";
import { money } from "@/lib/domain";
export const metadata = {
  title: "Sifarişin izlənməsi",
  robots: { index: false, follow: false },
};
export const statusNames: Record<string, string> = {
  NEW: "Qəbul edildi",
  CONFIRMED: "Təsdiqləndi",
  PREPARING: "Hazırlanır",
  READY: "Hazırdır",
  OUT_FOR_DELIVERY: "Çatdırılır",
  DELIVERED: "Təhvil verildi",
  CANCELLED: "Ləğv edildi",
};
export default async function Page({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  if (!/^[a-f0-9]{64}$/.test(token)) notFound();
  const order = await db.order.findUnique({
    where: { tokenHash: hash(token) },
    select: {
      reference: true,
      status: true,
      paymentStatus: true,
      total: true,
      history: {
        select: { status: true, createdAt: true },
        orderBy: { createdAt: "asc" },
      },
    },
  });
  if (!order) notFound();
  const settings = await getSettings();
  return (
    <section className="section tracking">
      <span className="eyebrow">{order.reference}</span>
      <h1>{statusNames[order.status]}</h1>
      <p>
        {money(order.total)} ·{" "}
        {order.paymentStatus === "PAID" ? "Ödənilib" : "Ödəniş gözlənilir"}
      </p>
      <ol>
        {order.history.map((h, i) => (
          <li key={i}>
            <span>✓</span>
            <div>
              <h3>{statusNames[h.status]}</h3>
              <p>
                {new Intl.DateTimeFormat("az-AZ", {
                  timeZone: "Asia/Baku",
                  dateStyle: "medium",
                  timeStyle: "short",
                }).format(h.createdAt)}
              </p>
            </div>
          </li>
        ))}
      </ol>
      {settings.phone && (
        <a
          className="button"
          href={
            "https://wa.me/" +
            settings.phone.replace(/\D/g, "") +
            "?text=" +
            encodeURIComponent(
              "Salam, " +
                order.reference +
                " nömrəli sifarişim barədə yazıram.",
            )
          }
          target="_blank"
          rel="noreferrer"
        >
          WhatsApp-da əlaqə saxla ↗
        </a>
      )}
      <p className="muted">
        Bu keçid şəxsidir. Yalnız etibar etdiyin şəxslərlə paylaş.
      </p>
    </section>
  );
}
