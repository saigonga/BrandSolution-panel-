"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { useShell } from "@/components/AppShell";
import { useEscape } from "@/components/useEscape";
import type { BackfillDTO, ClosureDTO } from "@/lib/dto";
import type { MoneyTotals } from "@/lib/stats";
import { computeMargins, groupINR } from "@/lib/money";
import { addDays, dayStart, fmtShort } from "@/lib/time";
import { api, digitsOnly } from "@/lib/api";
import { BACKFILL_MAX_DAYS } from "@/config/settings";

interface Props {
  entries: ClosureDTO[];
  totals: MoneyTotals;
  monthLabel: string;
  todayKey: string;
  todayWritable: boolean;
  backfills: BackfillDTO[];
}

function shown(digits: string) {
  return digits ? groupINR(Number(digits)) : "";
}

export default function Ledger({ entries, totals, monthLabel, todayKey, todayWritable, backfills }: Props) {
  const { clients } = useShell();
  const router = useRouter();

  const openBackfills = backfills.filter((b) => b.usableNow);
  const targets = [
    ...(todayWritable ? [{ value: "today", label: `Today · ${fmtShort(dayStart(todayKey))}`, dayKey: todayKey }] : []),
    ...openBackfills.map((b) => ({ value: b.id, label: `${fmtShort(dayStart(b.dayKey))} · approved backfill`, dayKey: b.dayKey })),
  ];

  const [target, setTarget] = useState(targets[0]?.value ?? "");
  const [clientId, setClientId] = useState(clients[0]?.id ?? "");
  const [productCategory, setProductCategory] = useState(clients[0]?.productCategories[0] ?? "");
  const [description, setDescription] = useState("");
  const [closed, setClosed] = useState("");
  const [fee, setFee] = useState("");
  const [direct, setDirect] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [showBackfill, setShowBackfill] = useState(false);

  const t = targets.find((x) => x.value === target) ?? targets[0];
  const dayEntries = t ? entries.filter((e) => e.dayKey === t.dayKey) : [];
  const hasReal = dayEntries.some((e) => !e.isZero);
  const hasZero = dayEntries.some((e) => e.isZero);
  const todayFilled = entries.some((e) => e.dayKey === todayKey);

  const client = useMemo(() => clients.find((c) => c.id === clientId), [clients, clientId]);
  const { net, gross } = computeMargins(Number(closed || 0), Number(fee || 0), Number(direct || 0));
  const anyAmount = !!(closed || fee || direct);

  function pickClient(id: string) {
    setClientId(id);
    setProductCategory(clients.find((c) => c.id === id)?.productCategories[0] ?? "");
  }

  async function add(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setOk(null);
    setBusy(true);
    try {
      await api("/api/closures", "POST", {
        backfillId: t && t.value !== "today" ? t.value : undefined,
        clientId,
        productCategory,
        description,
        closedAmount: Number(closed || 0),
        agencyFee: Number(fee || 0),
        directExpense: Number(direct || 0),
      });
      setDescription("");
      setClosed("");
      setFee("");
      setDirect("");
      setOk("Added to the ledger.");
      router.refresh();
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function markZero() {
    setErr(null);
    setOk(null);
    setBusy(true);
    try {
      await api("/api/closures", "POST", { zero: true, backfillId: t && t.value !== "today" ? t.value : undefined });
      setOk("Marked 000 for the day.");
      router.refresh();
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string) {
    setErr(null);
    setOk(null);
    try {
      await api(`/api/closures/${id}`, "DELETE");
      router.refresh();
    } catch (e) {
      setErr((e as Error).message);
    }
  }

  return (
    <>
      <div className="sec-h">
        <h2>Today&apos;s ledger</h2>
        <span className="hint">Log every closure, or mark a zero</span>
        <span className="act">
          <button className="btn ghost sm" onClick={() => setShowBackfill(true)}>Missed a day?</button>
        </span>
      </div>

      <div className="grid" style={{ gap: 12 }}>
        {!todayWritable && !openBackfills.length ? (
          <div className="callout crit">
            <span className="ic">!</span>
            <div>Today is locked after 11:30 PM. It reopens at midnight. For a past day, use <b>Missed a day?</b> to ask for a backfill.</div>
          </div>
        ) : (
          <form className="ledger-form" onSubmit={add}>
            <div className="row2" style={{ justifyContent: "space-between" }}>
              <strong style={{ fontSize: 13 }}>
                Log a closure
                {todayWritable && (
                  <span className={todayFilled ? "pos" : "muted"} style={{ fontWeight: 500, fontSize: 12, marginLeft: 10 }}>
                    {todayFilled ? "✓ Today is filled" : "Today isn't filled yet"}
                  </span>
                )}
              </strong>
              <span className="zero">
                No closure {t?.value === "today" ? "today" : "that day"}?
                <button type="button" className="btn ghost sm" onClick={markZero} disabled={busy || hasReal || hasZero}>
                  {hasZero ? "000 marked" : "Mark 000"}
                </button>
              </span>
            </div>

            {targets.length > 1 && (
              <div className="field" style={{ maxWidth: 320 }}>
                <label htmlFor="lg-target">Log for</label>
                <select id="lg-target" value={target} onChange={(e) => setTarget(e.target.value)}>
                  {targets.map((x) => <option key={x.value} value={x.value}>{x.label}</option>)}
                </select>
              </div>
            )}

            {clients.length === 0 ? (
              <div className="callout warn">
                <span className="ic">!</span>
                <div>No clients in the directory yet. <Link href="/clients" style={{ color: "var(--brand)" }}>Add a client</Link> to log closures. You can still mark 000.</div>
              </div>
            ) : (
              <div className="fields">
                <div className="field">
                  <label htmlFor="lg-client">Client</label>
                  <select id="lg-client" value={clientId} onChange={(e) => pickClient(e.target.value)}>
                    {clients.map((c) => <option key={c.id} value={c.id}>{c.brand}</option>)}
                  </select>
                </div>
                <div className="field">
                  <label htmlFor="lg-prod">Product category</label>
                  <select id="lg-prod" value={productCategory} onChange={(e) => setProductCategory(e.target.value)}>
                    {(client?.productCategories ?? []).map((p) => <option key={p}>{p}</option>)}
                  </select>
                </div>
                <div className="field wide">
                  <label htmlFor="lg-desc">What closed</label>
                  <input id="lg-desc" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="e.g. 2 creators · IG reels" maxLength={200} />
                </div>
                <div className="field">
                  <label htmlFor="lg-closed">Closed amount ₹</label>
                  <input id="lg-closed" inputMode="numeric" value={shown(closed)} onChange={(e) => setClosed(digitsOnly(e.target.value))} placeholder="0" />
                </div>
                <div className="field">
                  <label htmlFor="lg-fee">Agency fee ₹</label>
                  <input id="lg-fee" inputMode="numeric" value={shown(fee)} onChange={(e) => setFee(digitsOnly(e.target.value))} placeholder="0" />
                </div>
                <div className="field">
                  <label htmlFor="lg-direct">Direct expense ₹</label>
                  <input id="lg-direct" inputMode="numeric" value={shown(direct)} onChange={(e) => setDirect(digitsOnly(e.target.value))} placeholder="0" />
                </div>
                <div className="field calc">
                  <label htmlFor="lg-net">Net margin <span className="lockicon">· auto</span></label>
                  <input id="lg-net" readOnly tabIndex={-1} value={anyAmount ? groupINR(net) : "—"} />
                </div>
                <div className="field calc">
                  <label htmlFor="lg-gross">Gross margin <span className="lockicon">· auto</span></label>
                  <input id="lg-gross" readOnly tabIndex={-1} value={anyAmount ? groupINR(gross) : "—"} />
                </div>
              </div>
            )}

            {err && <div className="formerr">{err}</div>}
            {ok && <div className="formok">{ok}</div>}
            {clients.length > 0 && (
              <div className="row2">
                <button type="submit" className="btn pri" disabled={busy}>{busy ? "Saving…" : "Add to ledger"}</button>
                <span className="muted" style={{ fontSize: 12 }}>Net = closed − direct. Gross = net + fee. You only type the three amounts.</span>
              </div>
            )}
          </form>
        )}

        <div className="tblwrap">
          <table>
            <thead>
              <tr>
                <th>Date</th><th>Client</th><th>What closed</th>
                <th className="r">Closed</th><th className="r">Fee</th><th className="r">Direct</th>
                <th className="r">Net</th><th className="r">Gross</th><th aria-label="Actions"></th>
              </tr>
            </thead>
            <tbody>
              {entries.length === 0 && (
                <tr><td colSpan={9} className="muted">Nothing logged in {monthLabel} yet.</td></tr>
              )}
              {entries.map((c) =>
                c.isZero ? (
                  <tr key={c.id}>
                    <td>{fmtShort(dayStart(c.dayKey))}</td>
                    <td colSpan={7} className="muted">No closure · marked 000</td>
                    <td className="r">{c.editable && <button className="iconbtn" onClick={() => remove(c.id)}>Undo</button>}</td>
                  </tr>
                ) : (
                  <tr key={c.id}>
                    <td>{fmtShort(dayStart(c.dayKey))}</td>
                    <td>{c.client?.brand ?? "—"}{c.productCategory && <span className="subtle">{c.productCategory}</span>}</td>
                    <td className="wrap">{c.description}</td>
                    <td className="r money">{groupINR(c.closedAmount)}</td>
                    <td className="r money">{groupINR(c.agencyFee)}</td>
                    <td className="r money">{groupINR(c.directExpense)}</td>
                    <td className={`r money ${c.net >= 0 ? "pos" : "neg"}`}>{groupINR(c.net)}</td>
                    <td className={`r money ${c.gross >= 0 ? "pos" : "neg"}`}>{groupINR(c.gross)}</td>
                    <td className="r">{c.editable && <button className="iconbtn" onClick={() => remove(c.id)}>Delete</button>}</td>
                  </tr>
                )
              )}
              {totals.count > 0 && (
                <tr className="total">
                  <td colSpan={3}>{monthLabel} to date</td>
                  <td className="r money">{groupINR(totals.closed)}</td>
                  <td className="r money">{groupINR(totals.fee)}</td>
                  <td className="r money">{groupINR(totals.direct)}</td>
                  <td className="r money">{groupINR(totals.net)}</td>
                  <td className="r money">{groupINR(totals.gross)}</td>
                  <td></td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {backfills.length > 0 && (
          <div className="tile" style={{ padding: "4px 16px" }}>
            {backfills.map((b) => (
              <div key={b.id} className="flagrow">
                <span className={`tagx ${b.status === "APPROVED" ? "ok" : b.status === "DENIED" ? "no" : "wait"}`}>
                  {b.status === "APPROVED" ? "Approved" : b.status === "DENIED" ? "Denied" : "Pending"}
                </span>
                <div className="txt">
                  Backfill for <b>{fmtShort(dayStart(b.dayKey))}</b> · <span className="muted">{b.reason}</span>
                </div>
                {b.usableNow && <span className="pos" style={{ fontSize: 12, fontWeight: 600 }}>Open until 11:30 PM tonight</span>}
              </div>
            ))}
          </div>
        )}
      </div>

      {showBackfill && <BackfillModal todayKey={todayKey} onClose={() => setShowBackfill(false)} />}
    </>
  );
}

function BackfillModal({ todayKey, onClose }: { todayKey: string; onClose: () => void }) {
  const router = useRouter();
  useEscape(onClose);
  const yesterday = addDays(todayKey, -1);
  const [date, setDate] = useState(yesterday);
  const [reason, setReason] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setBusy(true);
    try {
      await api("/api/backfills", "POST", { date, reason });
      onClose();
      router.refresh();
    } catch (e) {
      setErr((e as Error).message);
      setBusy(false);
    }
  }

  return (
    <div className="scrim" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <form className="modal narrow" role="dialog" aria-modal="true" aria-label="Request a backfill" onSubmit={submit}>
        <div className="mhead">
          <h3>Request a backfill</h3>
          <button type="button" className="x" onClick={onClose} aria-label="Close">×</button>
        </div>
        <div className="mbody">
          <div className="callout">
            <span className="ic" style={{ color: "var(--brand)" }}>●</span>
            <div>Locked days can only be reopened by the manager. Once approved, the day stays open for you until 11:30 PM tonight.</div>
          </div>
          <div className="ff">
            <label htmlFor="bf-date">Day you missed</label>
            <input id="bf-date" type="date" value={date} max={yesterday} min={addDays(todayKey, -BACKFILL_MAX_DAYS)} onChange={(e) => setDate(e.target.value)} />
          </div>
          <div className="ff">
            <label htmlFor="bf-reason">Reason</label>
            <input id="bf-reason" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="One line for the manager" maxLength={300} />
          </div>
        </div>
        <div className="mfoot">
          {err && <div className="formerr">{err}</div>}
          <button type="button" className="btn ghost" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn pri" disabled={busy}>{busy ? "Sending…" : "Send to manager"}</button>
        </div>
      </form>
    </div>
  );
}
