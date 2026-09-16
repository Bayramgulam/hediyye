"use client";
import { useState } from "react";
export function Contact() {
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <form
      className="form-stack"
      aria-busy={busy}
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        const form = e.currentTarget;
        const body = Object.fromEntries(new FormData(form));
        try {
          const r = await fetch("/api/contact", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
          });
          const d = await r.json();
          setMessage(r.ok ? "Mesajın qəbul edildi. Təşəkkür edirik." : d.error);
          if (r.ok) form.reset();
        } catch {
          setMessage("Bağlantını yoxlayıb yenidən sına.");
        }
        setBusy(false);
      }}
    >
      <label>
        Adın
        <input name="name" required minLength={2} maxLength={100} />
      </label>
      <label>
        E-poçt
        <input name="email" type="email" required />
      </label>
      <label>
        Mesajın
        <textarea
          name="message"
          required
          minLength={10}
          maxLength={3000}
          rows={5}
        />
      </label>
      <input
        className="honeypot"
        name="website"
        tabIndex={-1}
        autoComplete="off"
        aria-hidden="true"
      />
      <button className="button" disabled={busy}>
        {busy ? "Göndərilir..." : "Mesajı göndər ↗"}
      </button>
      {message && (
        <p className="status-message" role="status" aria-live="polite">
          {message}
        </p>
      )}
    </form>
  );
}
