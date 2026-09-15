import { getSettings } from "@/lib/catalog";
import { Contact } from "@/components/contact";
export const metadata = { title: "Əlaqə" };
export default async function Page() {
  const s = await getSettings();
  return (
    <section className="section contact-page">
      <div>
        <span className="eyebrow">BİR SALAMLA BAŞLAYAQ</span>
        <h1>
          Səni <em>dinləyirik.</em>
        </h1>
        <p>
          Hədiyyə seçimi, xüsusi bir fikir, yaxud sifarişinlə bağlı sualın var?
          Bizə yaz.
        </p>
        {s.email && <p>{s.email}</p>}
        {s.phone && <p>{s.phone}</p>}
        {s.address && <p>{s.address}</p>}
      </div>
      <Contact />
    </section>
  );
}
