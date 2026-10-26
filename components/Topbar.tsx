"use client";

import { useEffect, useState } from "react";
import { fmtLong, isLocked, msToLock } from "@/lib/time";

function lockLabel(now: Date): { text: string; locked: boolean } {
  if (isLocked(now)) return { text: "Locked · reopens at midnight", locked: true };
  const mins = Math.max(0, Math.floor(msToLock(now) / 60_000));
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  const left = h > 0 ? `${h}h ${m}m left` : `${m}m left`;
  return { text: `Locks 11:30 PM · ${left}`, locked: false };
}

export default function Topbar({ title, sub }: { title: string; sub?: string }) {
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    setNow(new Date());
    const t = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(t);
  }, []);

  const lock = now ? lockLabel(now) : null;

  return (
    <div className="topbar">
      <div style={{ minWidth: 0 }}>
        <h1>{title}</h1>
        {sub && <div className="sub">{sub}</div>}
      </div>
      <div className="right">
        {now && <span className="datepill">{fmtLong(now)}</span>}
        {lock && <span className={`lock${lock.locked ? " locked" : ""}`}>{lock.text}</span>}
      </div>
    </div>
  );
}
