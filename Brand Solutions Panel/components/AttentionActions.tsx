"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useShell } from "@/components/AppShell";
import { api } from "@/lib/api";

export function OpenProjectButton({ id }: { id: string }) {
  const { openProject } = useShell();
  return <button className="btn ghost sm" onClick={() => openProject(id)}>Open</button>;
}

export function BackfillDecision({ id }: { id: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function decide(action: "approve" | "deny") {
    setBusy(true);
    setErr(null);
    try {
      await api(`/api/backfills/${id}`, "PATCH", { action });
      router.refresh();
    } catch (e) {
      setErr((e as Error).message);
      setBusy(false);
    }
  }

  return (
    <div className="mini">
      {err && <span className="neg" style={{ fontSize: 12 }}>{err}</span>}
      <button className="btn ghost sm" disabled={busy} onClick={() => decide("deny")}>Deny</button>
      <button className="btn pri sm" disabled={busy} onClick={() => decide("approve")}>Approve</button>
    </div>
  );
}
