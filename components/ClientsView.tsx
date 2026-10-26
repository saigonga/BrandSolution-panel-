"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { ClientDTO } from "@/lib/dto";
import { useEscape } from "@/components/useEscape";
import { api } from "@/lib/api";

export default function ClientsView({ clients, isManager }: { clients: ClientDTO[]; isManager: boolean }) {
  const [editing, setEditing] = useState<ClientDTO | "new" | null>(null);
  const [q, setQ] = useState("");

  const needle = q.trim().toLowerCase();
  const list = needle
    ? clients.filter((c) =>
        [c.brand, c.brandCategory, ...c.productCategories].some((s) => s.toLowerCase().includes(needle))
      )
    : clients;

  return (
    <>
      <div className="sec-h first">
        <h2>Client directory</h2>
        <span className="hint">{clients.length} brand{clients.length === 1 ? "" : "s"}</span>
        <span className="act">
          <div className="field" style={{ width: 200 }}>
            <input aria-label="Search clients" placeholder="Search brand or category" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
          <button className="btn pri" onClick={() => setEditing("new")}>+ Add client</button>
        </span>
      </div>
      <div className="callout">
        <span className="ic" style={{ color: "var(--info)" }}>●</span>
        <div>
          One row per brand. Add projects and closures pick the brand and its product category from here, so a client is entered once.
          {!isManager && " You can add brands and new product categories; renaming or removing is the manager's call."}
        </div>
      </div>

      <div className="tblwrap" style={{ marginTop: 14 }}>
        <table style={{ minWidth: 680 }}>
          <thead>
            <tr><th>Brand</th><th>Brand category</th><th>Product categories we work on</th><th className="r">Projects</th><th aria-label="Actions"></th></tr>
          </thead>
          <tbody>
            {list.length === 0 && (
              <tr><td colSpan={5} className="muted">{clients.length ? "No brand matches that search." : "No clients yet. Add the first one."}</td></tr>
            )}
            {list.map((c) => (
              <tr key={c.id}>
                <td className="dirbrand">{c.brand}</td>
                <td><span className="catpill">{c.brandCategory}</span></td>
                <td className="prodcats">{c.productCategories.map((p) => <span key={p} className="catpill">{p}</span>)}</td>
                <td className="r num">{c.projectCount ?? 0}</td>
                <td className="r"><button className="btn ghost sm" onClick={() => setEditing(c)}>Edit</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {editing && (
        <ClientModal
          client={editing === "new" ? null : editing}
          isManager={isManager}
          onClose={() => setEditing(null)}
        />
      )}
    </>
  );
}

function ClientModal({ client, isManager, onClose }: { client: ClientDTO | null; isManager: boolean; onClose: () => void }) {
  const router = useRouter();
  useEscape(onClose);
  const isNew = !client;
  const lockBase = !isNew && !isManager;

  const [brand, setBrand] = useState(client?.brand ?? "");
  const [brandCategory, setBrandCategory] = useState(client?.brandCategory ?? "");
  const [cats, setCats] = useState((client?.productCategories ?? []).join(", "));
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setBusy(true);
    const body = { brand, brandCategory, productCategories: cats.split(",").map((s) => s.trim()).filter(Boolean) };
    try {
      if (isNew) await api("/api/clients", "POST", body);
      else await api(`/api/clients/${client!.id}`, "PATCH", body);
      onClose();
      router.refresh();
    } catch (e) {
      setErr((e as Error).message);
      setBusy(false);
    }
  }

  return (
    <div className="scrim" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <form className="modal narrow" role="dialog" aria-modal="true" aria-label={isNew ? "Add client" : "Edit client"} onSubmit={submit}>
        <div className="mhead">
          <h3>{isNew ? "Add client" : `Edit ${client!.brand}`}</h3>
          <button type="button" className="x" onClick={onClose} aria-label="Close">×</button>
        </div>
        <div className="mbody">
          <div className="ff">
            <label htmlFor="cl-brand">Brand name</label>
            <input id="cl-brand" autoFocus={isNew} value={brand} readOnly={lockBase} onChange={(e) => setBrand(e.target.value)} placeholder="e.g. Atomberg" maxLength={80} />
          </div>
          <div className="ff">
            <label htmlFor="cl-cat">Brand category</label>
            <input id="cl-cat" value={brandCategory} readOnly={lockBase} onChange={(e) => setBrandCategory(e.target.value)} placeholder="e.g. Consumer appliances" maxLength={80} />
          </div>
          <div className="ff">
            <label htmlFor="cl-prod">Product categories</label>
            <input id="cl-prod" autoFocus={!isNew} value={cats} onChange={(e) => setCats(e.target.value)} placeholder="e.g. Fans, Mixer grinders, Water purifiers" />
            <div className="hintline">
              Separate with commas. Each one becomes selectable when adding a project or a closure for this brand.
              {lockBase && " You can add categories; only the manager can remove them."}
            </div>
          </div>
        </div>
        <div className="mfoot">
          {err && <div className="formerr">{err}</div>}
          <button type="button" className="btn ghost" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn pri" disabled={busy}>{busy ? "Saving…" : isNew ? "Add to directory" : "Save changes"}</button>
        </div>
      </form>
    </div>
  );
}
