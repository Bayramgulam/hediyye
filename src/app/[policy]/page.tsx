import { getSettings } from "@/lib/catalog";
import { notFound } from "next/navigation";
const titles: Record<string, string> = {
  catdirilma: "Çatdırılma və təhvil",
  mexfilik: "Məxfilik",
  sertler: "İstifadə şərtləri",
};
export default async function Page({
  params,
}: {
  params: Promise<{ policy: string }>;
}) {
  const { policy } = await params;
  if (!titles[policy]) notFound();
  const s = await getSettings();
  return (
    <section className="section policy-page">
      <span className="eyebrow">LUMA · MƏLUMAT</span>
      <h1>{titles[policy]}</h1>
      <div style={{ whiteSpace: "pre-wrap" }}>{s.policies[policy]}</div>
    </section>
  );
}
