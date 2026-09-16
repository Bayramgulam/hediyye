import Link from "next/link";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getSettings } from "@/lib/catalog";
import { money, canTransition, transitions } from "@/lib/domain";
import {
  AdminForm,
  Field,
  Login,
  Logout,
  OrderActions,
  PrintButton,
} from "@/components/admin-client";
export const metadata = {
  title: "İdarəetmə",
  robots: { index: false, follow: false },
};
const names: Record<string, string> = {
  NEW: "Yeni",
  CONFIRMED: "Təsdiqləndi",
  PREPARING: "Hazırlanır",
  READY: "Hazırdır",
  OUT_FOR_DELIVERY: "Çatdırılır",
  DELIVERED: "Təhvil verildi",
  CANCELLED: "Ləğv edildi",
};
const text = (
  key: string,
  label: string,
  type = "text",
  hint?: string,
): Field => ({ key, label, type, hint });
export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ path?: string[] }>;
  searchParams: Promise<Record<string, string>>;
}) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return <Login />;
  const user = await db.user.findUnique({ where: { id: session.user.id } });
  if (!user || !["OWNER", "STAFF"].includes(user.role)) return <Login />;
  const { path = [] } = await params;
  const q = await searchParams;
  const section = path[0] || "dashboard";
  const id = path[1];
  const owner = user.role === "OWNER";
  if (!owner && !["dashboard", "orders"].includes(section))
    return (
      <section className="section">
        <h1>Bu bölməyə giriş icazən yoxdur.</h1>
      </section>
    );
  const page = Math.max(1, Number(q.page) || 1);
  const skip = (page - 1) * 20;
  let content: React.ReactNode;
  if (section === "dashboard") {
    const where =
      q.from || q.to
        ? {
            createdAt: {
              ...(q.from ? { gte: new Date(q.from) } : {}),
              ...(q.to ? { lte: new Date(q.to + "T23:59:59Z") } : {}),
            },
          }
        : {};
    const [count, value, paid, attention, low] = await Promise.all([
      db.order.count({ where }),
      db.order.aggregate({
        where: { ...where, status: { not: "CANCELLED" } },
        _sum: { total: true },
      }),
      db.payment.aggregate({ where, _sum: { amount: true } }),
      db.order.count({
        where: { ...where, status: { in: ["NEW", "CONFIRMED"] } },
      }),
      db.product.findMany({
        where: { active: true, stock: { lte: 5 } },
        take: 10,
      }),
    ]);
    content = (
      <>
        <h1>Mağazaya baxış</h1>
        <p>Sifarişlər, ödənişlər və diqqət tələb edən detallar.</p>
        <form className="admin-toolbar">
          <label>
            Başlanğıc <input type="date" name="from" defaultValue={q.from} />
          </label>
          <label>
            Son <input type="date" name="to" defaultValue={q.to} />
          </label>
          <button className="button">Göstər</button>
        </form>
        <div className="stat-grid">
          {[
            ["Sifarişlər", count],
            ["Sifariş dəyəri", money(value._sum.total || 0)],
            ["Qəbul edilmiş ödəniş", money(paid._sum.amount || 0)],
            ["Diqqət gözləyir", attention],
          ].map(([label, value]) => (
            <div key={label}>
              <small>{label}</small>
              <strong>{value}</strong>
            </div>
          ))}
        </div>
        <div className="admin-card">
          <h3>Azalan stok</h3>
          {low.length ? (
            <ul>
              {low.map((p) => (
                <li key={p.id}>
                  {p.name} — {p.stock} ədəd
                </li>
              ))}
            </ul>
          ) : (
            <p>Azalan stok yoxdur.</p>
          )}
        </div>
        <Link className="button" href="/admin/orders">
          Sifarişlərə bax →
        </Link>
      </>
    );
  } else if (section === "orders" && !id) {
    const where = {
      ...(q.search
        ? { reference: { contains: q.search, mode: "insensitive" as const } }
        : {}),
      ...(q.status ? { status: q.status } : {}),
    };
    const [orders, count] = await Promise.all([
      db.order.findMany({
        where,
        take: 20,
        skip,
        orderBy: { createdAt: "desc" },
      }),
      db.order.count({ where }),
    ]);
    content = (
      <>
        <h1>Sifarişlər</h1>
        <form className="admin-toolbar">
          <input
            name="search"
            placeholder="Sifariş nömrəsi"
            defaultValue={q.search}
          />
          <select name="status" defaultValue={q.status || ""}>
            <option value="">Bütün statuslar</option>
            {Object.entries(names).map(([id, n]) => (
              <option key={id} value={id}>
                {n}
              </option>
            ))}
          </select>
          <button className="button">Axtar</button>
        </form>
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Sifariş</th>
                <th>Tarix</th>
                <th>Status</th>
                <th>Ödəniş</th>
                <th>Cəmi</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((o) => (
                <tr key={o.id}>
                  <td>
                    <Link href={"/admin/orders/" + o.id}>{o.reference}</Link>
                  </td>
                  <td>
                    {o.createdAt.toLocaleDateString("az-AZ", {
                      timeZone: "Asia/Baku",
                    })}
                  </td>
                  <td>
                    <span className="badge">{names[o.status]}</span>
                  </td>
                  <td>
                    {o.paymentStatus === "PAID" ? "Ödənilib" : "Gözlənilir"}
                  </td>
                  <td>{money(o.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!orders.length && <p>Hələ sifariş yoxdur.</p>}
        <Pager page={page} count={count} q={q} />
      </>
    );
  } else if (section === "orders" && id) {
    const o = await db.order.findUnique({
      where: { id },
      include: {
        items: true,
        history: { orderBy: { createdAt: "asc" } },
        payments: true,
      },
    });
    if (!o) notFound();
    const customer = o.customer as Record<string, string>;
    const delivery = o.delivery as Record<string, string>;
    content = (
      <>
        <h1>{o.reference}</h1>
        <p>
          {names[o.status]} · {money(o.total)} ·{" "}
          {o.paymentStatus === "PAID" ? "Ödənilib" : "Ödəniş gözlənilir"}
        </p>
        <div className="packing-slip">
          <h3>Qablaşdırma vərəqi</h3>
          <p>
            {customer.name} · {customer.phone}
            <br />
            Alıcı: {customer.recipient} · {customer.recipientPhone}
            <br />
            {delivery.method === "pickup"
              ? "Mağazadan təhvil"
              : delivery.address}
            <br />
            {delivery.date} · {delivery.slot}
          </p>
          {o.items.map((line) => {
            const s = line.snapshot as {
              box: { name: string };
              items: { name: string; quantity: number }[];
              packaging: { name: string }[];
              config: {
                card: {
                  omit: boolean;
                  recipient: string;
                  sender: string;
                  message: string;
                };
                color: string;
              };
            };
            return (
              <div className="admin-card" key={line.id}>
                <h3>
                  {s.box.name} × {line.quantity}
                </h3>
                <p>Rəng: {s.config.color}</p>
                <ul>
                  {s.items.map((p, i) => (
                    <li key={i}>
                      {p.name} × {p.quantity}
                    </li>
                  ))}
                </ul>
                <p>{s.packaging.map((p) => p.name).join(" · ")}</p>
                {!s.config.card.omit && (
                  <blockquote>
                    {s.config.card.recipient}
                    <br />
                    {s.config.card.message}
                    <br />
                    {s.config.card.sender}
                  </blockquote>
                )}
                <p>{money(line.total * line.quantity)}</p>
              </div>
            );
          })}
          {o.note && <p>Sifariş qeydi: {o.note}</p>}
        </div>
        <PrintButton />
        <div className="admin-card">
          <h3>Sifarişi idarə et</h3>
          <OrderActions
            id={o.id}
            paid={o.paymentStatus === "PAID" || o.status === "CANCELLED"}
            states={(transitions[o.status] || [])
              .filter((s) =>
                canTransition(o.status, s, delivery.method === "pickup"),
              )
              .map((s) => ({ id: s, name: names[s] }))}
          />
        </div>
        <div className="admin-card">
          <h3>Tarixçə və daxili qeydlər</h3>
          {o.history.map((h) => (
            <p key={h.id}>
              {h.createdAt.toLocaleString("az-AZ", { timeZone: "Asia/Baku" })} ·{" "}
              {names[h.status]} — {h.note}
            </p>
          ))}
          {o.payments.map((p) => (
            <p key={p.id}>
              Ödəniş: {money(p.amount)} · {p.createdAt.toLocaleString("az-AZ")}{" "}
              · {p.actorId}
            </p>
          ))}
        </div>
      </>
    );
  } else if (section === "products" && !id) {
    const where = q.search
      ? { name: { contains: q.search, mode: "insensitive" as const } }
      : {};
    const [products, count] = await Promise.all([
      db.product.findMany({
        where,
        include: { category: true },
        orderBy: { name: "asc" },
        take: 20,
        skip,
      }),
      db.product.count({ where }),
    ]);
    content = (
      <>
        <h1>Məhsullar</h1>
        <div className="admin-toolbar">
          <Link className="button" href="/admin/products/new">
            Məhsul əlavə et +
          </Link>
          <form>
            <input
              name="search"
              placeholder="Məhsul axtar"
              defaultValue={q.search}
            />
            <button className="button">Axtar</button>
          </form>
        </div>
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Şəkil</th>
                <th>Məhsul</th>
                <th>Kateqoriya</th>
                <th>Qiymət</th>
                <th>Stok</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {products.map((p) => (
                <tr key={p.id}>
                  <td>
                    <img src={p.image} alt="" />
                  </td>
                  <td>
                    <Link href={"/admin/products/" + p.id}>{p.name}</Link>
                  </td>
                  <td>{p.category.name}</td>
                  <td>{money(p.price)}</td>
                  <td>{p.stock}</td>
                  <td>{p.active ? "Aktiv" : "Arxiv"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Pager page={page} count={count} q={q} />
      </>
    );
  } else if (section === "products" && id) {
    const categories = await db.category.findMany();
    const p =
      id === "new"
        ? {
            name: "",
            description: "",
            categoryId: categories[0]?.id,
            price: 0,
            stock: 0,
            units: 1,
            active: true,
            image: "/images/product-0.webp",
            cutout: "",
            compatibleBoxes: ["small", "medium", "large"],
            variants: [],
          }
        : await db.product.findUnique({ where: { id } });
    if (!p) notFound();
    content = (
      <>
        <h1>{id === "new" ? "Yeni məhsul" : "Məhsulu redaktə et"}</h1>
        <p className="admin-note">
          Qiymət qəpiklə daxil edilir: 18 AZN = 1800. Arxivləmək üçün “Aktiv”
          seçimini söndür.
        </p>
        <AdminForm
          action="product"
          initial={p}
          fields={[
            text("name", "Ad"),
            text("description", "Təsvir", "textarea"),
            {
              key: "categoryId",
              label: "Kateqoriya",
              type: "select",
              options: categories.map((c) => ({ value: c.id, label: c.name })),
            },
            text("price", "Qiymət (qəpik)", "number"),
            text("stock", "Mövcud stok", "number"),
            text("units", "Tutum vahidi", "number"),
            text("image", "Məhsul şəkli", "image"),
            text("cutout", "Önizləmə şəkli", "image"),
            text(
              "compatibleBoxes",
              "Uyğun qutular",
              "json",
              'Məsələn: ["small", "medium", "large"]',
            ),
            text(
              "variants",
              "Variant məlumatları",
              "json",
              'Məsələn: [{"name":"Rəng","value":"Krem"}]. Ayrı stoklu variant üçün ayrıca məhsul yaradın.',
            ),
            text("active", "Aktiv", "checkbox"),
          ]}
        />
      </>
    );
  } else if (section === "packaging") {
    const [boxes, options] = await Promise.all([
      db.box.findMany(),
      db.packaging.findMany(),
    ]);
    const box = boxes.find((b) => b.id === q.box);
    const option = options.find((p) => p.id === q.option);
    content = (
      <>
        <h1>Qutular və qablaşdırma</h1>
        <div className="admin-tabs">
          {boxes.map((b) => (
            <Link key={b.id} href={"/admin/packaging?box=" + b.id}>
              {b.name}
            </Link>
          ))}
          <Link href="/admin/packaging?box=new">+ Qutu</Link>
        </div>
        {q.box && (
          <AdminForm
            key={q.box}
            action="box"
            initial={
              box || {
                id: "",
                name: "",
                dimensions: "",
                price: 0,
                capacity: 5,
                colors: ["#F0E5D5"],
                active: true,
                image: "/images/product-5.webp",
              }
            }
            fields={[
              text("id", "Qutu kodu"),
              text("name", "Ad"),
              text("dimensions", "Ölçülər"),
              text("price", "Qiymət (qəpik)", "number"),
              text("capacity", "Tutum vahidi", "number"),
              text("colors", "Rəng kodları", "json"),
              text("image", "Şəkil", "image"),
              text("active", "Aktiv", "checkbox"),
            ]}
          />
        )}
        <div className="admin-tabs" style={{ marginTop: 30 }}>
          {options.map((p) => (
            <Link key={p.id} href={"/admin/packaging?option=" + p.id}>
              {p.name} (
              {p.kind === "ribbon"
                ? "lent"
                : p.kind === "tissue"
                  ? "kağız"
                  : "əlavə"}
              )
            </Link>
          ))}
          <Link href="/admin/packaging?option=new">+ Seçim</Link>
        </div>
        {q.option && (
          <AdminForm
            key={q.option}
            action="packaging"
            initial={
              option || {
                id: "",
                name: "",
                kind: "ribbon",
                color: "#642C3B",
                price: 0,
                active: true,
              }
            }
            fields={[
              text("id", "Kod"),
              text("name", "Ad"),
              {
                key: "kind",
                label: "Növ",
                type: "select",
                options: [
                  { value: "ribbon", label: "Lent" },
                  { value: "tissue", label: "Kağız" },
                  { value: "extra", label: "Əlavə" },
                ],
              },
              text("color", "Rəng", "color"),
              text("price", "Əlavə qiymət (qəpik)", "number"),
              text("active", "Aktiv", "checkbox"),
            ]}
          />
        )}
      </>
    );
  } else if (section === "collections") {
    const gifts = await db.gift.findMany({
      include: { components: true },
      orderBy: { position: "asc" },
    });
    const gift = gifts.find((g) => g.id === id);
    content = (
      <>
        <h1>Hazır hədiyyələr</h1>
        <div className="admin-tabs">
          {gifts.map((g) => (
            <Link key={g.id} href={"/admin/collections/" + g.id}>
              {g.name}
            </Link>
          ))}
          <Link href="/admin/collections/new">+ Hədiyyə</Link>
        </div>
        {id && (
          <AdminForm
            key={id}
            action="gift"
            initial={
              gift
                ? {
                    ...gift,
                    components: gift.components.map((c) => ({
                      productId: c.productId,
                      quantity: c.quantity,
                    })),
                  }
                : {
                    slug: "",
                    name: "",
                    description: "",
                    occasion: "Ad günü",
                    boxId: "medium",
                    image: "/images/hero.webp",
                    featured: false,
                    position: 0,
                    active: true,
                    components: [{ productId: "p0", quantity: 1 }],
                  }
            }
            fields={[
              text("slug", "Keçid adı"),
              text("name", "Ad"),
              text("description", "Təsvir", "textarea"),
              text("occasion", "Hədiyyə səbəbi"),
              text("boxId", "Qutu kodu"),
              text("image", "Şəkil", "image"),
              text(
                "components",
                "Qutunun məhsulları",
                "json",
                "productId və quantity sahələri ilə məhsul siyahısı. Stok əsas məhsullardan götürülür.",
              ),
              text("position", "Sıra", "number"),
              text("featured", "Ana səhifədə göstər", "checkbox"),
              text("active", "Aktiv", "checkbox"),
            ]}
          />
        )}
      </>
    );
  } else if (section === "settings") {
    const s = await getSettings();
    content = (
      <>
        <h1>Mağaza parametrləri</h1>
        <AdminForm
          action="settings"
          initial={s}
          fields={[
            text("brand", "Brend adı"),
            text("logo", "Loqo (istəyə görə)", "image"),
            text("heroImage", "Ana səhifə şəkli", "image"),
            text("email", "Əlaqə e-poçtu", "email"),
            text("phone", "WhatsApp nömrəsi"),
            text("address", "Təhvil ünvanı", "textarea"),
            text("instagram", "Instagram ünvanı"),
            text("heroText", "Ana səhifə mətni", "textarea"),
            text("delivery", "Çatdırılma aktivdir", "checkbox"),
            text("pickup", "Mağazadan təhvil aktivdir", "checkbox"),
            text("cashDelivery", "Çatdırılmada nağd ödəniş", "checkbox"),
            text("cashPickup", "Təhvildə nağd ödəniş", "checkbox"),
            text("leadDays", "Minimum hazırlıq müddəti (gün)", "number"),
            text("cutoffHour", "Son sifariş saatı (Bakı)", "number"),
            text(
              "disabledDates",
              "Bağlı tarixlər",
              "json",
              "YYYY-MM-DD formatında tarix siyahısı",
            ),
            text("reservationHours", "Təsdiq gözləmə müddəti (saat)", "number"),
            text(
              "policies",
              "Mağaza siyasətləri",
              "json",
              "catdirilma, mexfilik və sertler. Real satışdan əvvəl mağazaya uyğun mətnləri təsdiqləyin.",
            ),
          ]}
        />
      </>
    );
  } else if (section === "delivery") {
    const [zones, slots] = await Promise.all([
      db.deliveryZone.findMany(),
      db.deliverySlot.findMany({ orderBy: { date: "desc" }, take: 20, skip }),
    ]);
    content = (
      <>
        <h1>Çatdırılma və vaxtlar</h1>
        <h3>Çatdırılma zonaları</h3>
        <div className="admin-tabs">
          {zones.map((z) => (
            <Link href={"/admin/delivery?zone=" + z.id} key={z.id}>
              {z.name} · {money(z.fee)}
            </Link>
          ))}
          <Link href="/admin/delivery?zone=new">+ Zona</Link>
        </div>
        {q.zone && (
          <AdminForm
            key={q.zone}
            action="zone"
            initial={
              zones.find((z) => z.id === q.zone) || {
                name: "",
                fee: 0,
                active: true,
              }
            }
            fields={[
              text("name", "Zona adı"),
              text("fee", "Çatdırılma haqqı (qəpik)", "number"),
              text("active", "Aktiv", "checkbox"),
            ]}
          />
        )}
        <div className="admin-card">
          <h3>Vaxt əlavə et / tutumu dəyiş</h3>
          <AdminForm
            action="slot"
            initial={{ date: "", label: "12:00–15:00", capacity: 10 }}
            fields={[
              text("date", "Tarix", "date"),
              text("label", "Vaxt aralığı"),
              text("capacity", "Maksimum sifariş sayı", "number"),
            ]}
          />
        </div>
        <table className="admin-table">
          <thead>
            <tr>
              <th>Tarix</th>
              <th>Vaxt</th>
              <th>Rezerv / tutum</th>
            </tr>
          </thead>
          <tbody>
            {slots.map((s) => (
              <tr key={s.id}>
                <td>{s.date}</td>
                <td>{s.label}</td>
                <td>
                  {s.reserved} / {s.capacity}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <Pager page={page} count={await db.deliverySlot.count()} q={q} />
      </>
    );
  } else if (section === "categories") {
    const categories = await db.category.findMany();
    content = (
      <>
        <h1>Kateqoriyalar</h1>
        <ul>
          {categories.map((c) => (
            <li key={c.id}>
              {c.id} — {c.name}
            </li>
          ))}
        </ul>
        <AdminForm
          action="category"
          initial={{ id: "", name: "" }}
          fields={[text("id", "Kod"), text("name", "Ad")]}
        />
      </>
    );
  } else if (section === "inquiries") {
    const rows = await db.inquiry.findMany({
      take: 20,
      skip,
      orderBy: { createdAt: "desc" },
    });
    content = (
      <>
        <h1>Müraciətlər</h1>
        {rows.map((r) => (
          <div className="admin-card" key={r.id}>
            <h3>{r.name}</h3>
            <p>
              {r.email} · {r.createdAt.toLocaleDateString("az-AZ")}
            </p>
            <p style={{ whiteSpace: "pre-wrap" }}>{r.message}</p>
          </div>
        ))}
        {!rows.length && <p>Hələ müraciət yoxdur.</p>}
        <Pager page={page} count={await db.inquiry.count()} q={q} />
      </>
    );
  } else if (section === "team") {
    content = (
      <>
        <h1>Əməkdaş əlavə et</h1>
        <p>
          Əməkdaş yalnız sifarişləri və mağaza göstəricilərini görə, sifariş
          statusunu və ödənişi qeyd edə bilər.
        </p>
        <AdminForm
          action="staff"
          initial={{ name: "", email: "", password: "" }}
          fields={[
            text("name", "Ad"),
            text("email", "E-poçt", "email"),
            text("password", "İlkin şifrə (ən azı 12 simvol)", "password"),
          ]}
        />
      </>
    );
  } else if (section === "audit") {
    const rows = await db.auditLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 20,
      skip,
    });
    content = (
      <>
        <h1>Əməliyyat jurnalı</h1>
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Tarix</th>
                <th>İstifadəçi</th>
                <th>Əməliyyat</th>
                <th>Obyekt</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <td>{r.createdAt.toLocaleString("az-AZ")}</td>
                  <td>{r.actorId}</td>
                  <td>{r.action}</td>
                  <td>{r.entityId}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Pager page={page} count={await db.auditLog.count()} q={q} />
      </>
    );
  } else notFound();
  return (
    <div className="admin-shell">
      <aside className="admin-nav">
        <div className="admin-nav-head">
          <strong>LUMA / İDARƏETMƏ</strong>
          <Link href="/" className="admin-store-link">
            Mağazaya bax ↗
          </Link>
        </div>
        <div className="admin-nav-links">
          {[
            ["dashboard", "Ümumi baxış"],
            ["orders", "Sifarişlər"],
            ...(owner
              ? [
                  ["products", "Məhsullar"],
                  ["categories", "Kateqoriyalar"],
                  ["packaging", "Qablaşdırma"],
                  ["collections", "Hazır hədiyyələr"],
                  ["delivery", "Çatdırılma"],
                  ["inquiries", "Müraciətlər"],
                  ["settings", "Parametrlər"],
                  ["team", "Əməkdaşlar"],
                  ["audit", "Əməliyyat jurnalı"],
                ]
              : []),
          ].map(([key, name]) => (
            <Link
              key={key}
              href={key === "dashboard" ? "/admin" : "/admin/" + key}
              aria-current={section === key ? "page" : undefined}
            >
              {name}
            </Link>
          ))}
          <Logout />
        </div>
      </aside>
      <div className="admin-content">{content}</div>
    </div>
  );
}
function Pager({
  page,
  count,
  q,
}: {
  page: number;
  count: number;
  q: Record<string, string>;
}) {
  return (
    <div className="admin-pager">
      {page > 1 && (
        <Link
          href={"?" + new URLSearchParams({ ...q, page: String(page - 1) })}
        >
          ← Əvvəlki
        </Link>
      )}
      <span>
        {page} / {Math.max(1, Math.ceil(count / 20))}
      </span>
      {page * 20 < count && (
        <Link
          href={"?" + new URLSearchParams({ ...q, page: String(page + 1) })}
        >
          Növbəti →
        </Link>
      )}
    </div>
  );
}
