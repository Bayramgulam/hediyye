"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
export function Login() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <section className="login-page">
      <span className="eyebrow">LUMA · İDARƏETMƏ</span>
      <h1>Xoş gəldin.</h1>
      <form
        className="form-stack"
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          const f = new FormData(e.currentTarget);
          const r = await fetch("/api/auth/sign-in/email", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              email: f.get("email"),
              password: f.get("password"),
            }),
          });
          if (r.ok) {
            router.replace("/admin");
            router.refresh();
          } else setError("E-poçt və ya şifrə düzgün deyil.");
          setBusy(false);
        }}
      >
        <label>
          E-poçt
          <input name="email" type="email" autoComplete="username" required />
        </label>
        <label>
          Şifrə
          <input
            name="password"
            type="password"
            autoComplete="current-password"
            required
          />
        </label>
        <button className="button" disabled={busy}>
          {busy ? "Yoxlanılır..." : "Daxil ol →"}
        </button>
        {error && <p role="alert">{error}</p>}
      </form>
    </section>
  );
}
export type Field = {
  key: string;
  label: string;
  type?: string;
  options?: { value: string; label: string }[];
  hint?: string;
};
export function AdminForm({
  action,
  initial,
  fields,
}: {
  action: string;
  initial: Record<string, unknown>;
  fields: Field[];
}) {
  const [values, setValues] = useState(initial);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const router = useRouter();
  return (
    <form
      className="form-stack admin-editor"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        setMessage("");
        try {
          const data = { ...values };
          for (const f of fields) {
            if (f.type === "json" && typeof data[f.key] === "string")
              data[f.key] = JSON.parse(data[f.key] as string);
            if (f.type === "number") data[f.key] = Number(data[f.key]);
          }
          const r = await fetch("/api/admin", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action, data }),
          });
          const res = await r.json();
          if (!r.ok) throw Error(res.error);
          setMessage("Dəyişikliklər yadda saxlanıldı.");
          router.refresh();
        } catch (e) {
          setMessage((e as Error).message);
        }
        setBusy(false);
      }}
    >
      {fields.map((f) => (
        <label
          key={f.key}
          className={f.type === "checkbox" ? "check-label" : ""}
        >
          {f.type === "checkbox" ? (
            <>
              <input
                type="checkbox"
                checked={!!values[f.key]}
                onChange={(e) =>
                  setValues({ ...values, [f.key]: e.target.checked })
                }
              />
              {f.label}
            </>
          ) : (
            <>
              {f.label}
              {f.type === "select" ? (
                <select
                  value={String(values[f.key] ?? "")}
                  onChange={(e) =>
                    setValues({ ...values, [f.key]: e.target.value })
                  }
                >
                  {f.options?.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              ) : f.type === "textarea" || f.type === "json" ? (
                <textarea
                  rows={f.type === "json" ? 5 : 3}
                  className={f.type === "json" ? "code" : ""}
                  value={
                    typeof values[f.key] === "object"
                      ? JSON.stringify(values[f.key], null, 2)
                      : String(values[f.key] ?? "")
                  }
                  onChange={(e) =>
                    setValues({ ...values, [f.key]: e.target.value })
                  }
                />
              ) : (
                <input
                  type={f.type === "image" ? "text" : f.type || "text"}
                  value={String(values[f.key] ?? "")}
                  onChange={(e) =>
                    setValues({ ...values, [f.key]: e.target.value })
                  }
                />
              )}{" "}
              {f.type === "image" && (
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    const form = new FormData();
                    form.set("file", file);
                    const r = await fetch("/api/media", {
                      method: "POST",
                      body: form,
                    });
                    const d = await r.json();
                    if (r.ok) setValues({ ...values, [f.key]: d.url });
                    else setMessage(d.error);
                  }}
                />
              )}
              {f.hint && <small>{f.hint}</small>}
            </>
          )}
        </label>
      ))}
      <button className="button" disabled={busy}>
        {busy ? "Yadda saxlanılır..." : "Dəyişiklikləri yadda saxla"}
      </button>
      {message && <p role="status">{message}</p>}
    </form>
  );
}
export function OrderActions({
  id,
  states,
  paid,
}: {
  id: string;
  states: { id: string; name: string }[];
  paid: boolean;
}) {
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const router = useRouter();
  async function send(action: string, data: unknown) {
    setBusy(true);
    try {
      const r = await fetch("/api/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, id, data }),
      });
      const d = await r.json();
      if (!r.ok) throw Error(d.error);
      setMessage("Yadda saxlanıldı.");
      router.refresh();
    } catch (e) {
      setMessage((e as Error).message);
    }
    setBusy(false);
  }
  return (
    <>
      <div className="admin-actions">
        {states.map((s) => (
          <button
            key={s.id}
            disabled={busy}
            onClick={() => send("status", { status: s.id, note: "" })}
          >
            {s.name}
          </button>
        ))}
        {!paid && (
          <button disabled={busy} onClick={() => send("payment", {})}>
            Ödənişi qəbul etdim
          </button>
        )}
      </div>
      <form
        className="form-stack"
        style={{ marginTop: 20 }}
        onSubmit={(e) => {
          e.preventDefault();
          const form = e.currentTarget;
          send("note", String(new FormData(form).get("note")));
          form.reset();
        }}
      >
        <label>
          Daxili qeyd
          <textarea name="note" maxLength={2000} required />
        </label>
        <button className="button" disabled={busy}>
          Qeyd əlavə et
        </button>
      </form>
      {message && <p role="status">{message}</p>}
    </>
  );
}
export function PrintButton() {
  return (
    <button className="print-button" onClick={() => window.print()}>
      Qablaşdırma vərəqini çap et
    </button>
  );
}
export function Logout() {
  const router = useRouter();
  return (
    <button
      className="text-link"
      onClick={async () => {
        await fetch("/api/auth/sign-out", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: "{}",
        });
        router.replace("/admin");
        router.refresh();
      }}
    >
      Çıxış
    </button>
  );
}
