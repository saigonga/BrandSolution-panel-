"use client";

import type { ProjectDTO } from "@/lib/dto";
import { stageClass } from "@/lib/constants";
import { fmtShort, relDay } from "@/lib/time";
import { useShell } from "@/components/AppShell";

function onKeyOpen(e: React.KeyboardEvent, open: () => void) {
  if (e.key === "Enter" || e.key === " ") {
    e.preventDefault();
    open();
  }
}

function TypeTag({ p }: { p: ProjectDTO }) {
  return p.workType === "INTERNAL" ? <span className="tag internal">Internal</span> : <span className="tag client">Client</span>;
}

function BrandLine({ p }: { p: ProjectDTO }) {
  if (p.workType === "INTERNAL") {
    return p.internalCategory ? <div className="brandline">{p.internalCategory}</div> : null;
  }
  if (!p.client) return null;
  return (
    <div className="brandline">
      <b>{p.client.brand}</b>
      {p.productCategory ? ` · ${p.productCategory}` : ""}
    </div>
  );
}

export default function ProjectCard({ p, compact = false }: { p: ProjectDTO; compact?: boolean }) {
  const { openProject } = useShell();
  const open = () => openProject(p.id);

  if (compact) {
    return (
      <div
        className={`ccard${p.isStale ? " stale" : ""}`}
        role="button"
        tabIndex={0}
        onClick={open}
        onKeyDown={(e) => onKeyOpen(e, open)}
        aria-label={`Open ${p.name}`}
      >
        <div className="ctop">
          <h4>{p.name}</h4>
          <TypeTag p={p} />
        </div>
        <BrandLine p={p} />
        <div className="crow">
          <span className={`pill ${stageClass(p.stage)}`}>{p.stage}</span>
          {p.isOverdue && <span className="tagx stale">Overdue</span>}
        </div>
        <div className={`cfoot${p.isStale ? " stale" : ""}`}>
          {p.isStale ? `⚠ stale · ${p.staleDays} working days untouched` : `updated ${relDay(p.updatedAt)}`}
        </div>
      </div>
    );
  }

  return (
    <div
      className={`card${p.isStale ? " stale" : ""}`}
      role="button"
      tabIndex={0}
      onClick={open}
      onKeyDown={(e) => onKeyOpen(e, open)}
      aria-label={`Open ${p.name}`}
    >
      <div className="top">
        <h3>{p.name}</h3>
        <TypeTag p={p} />
      </div>
      <BrandLine p={p} />
      <div className="meta">
        <span className="chip">{p.projectType}</span>
        <span className={`pill ${stageClass(p.stage)}`}>{p.stage}</span>
      </div>
      {p.stage === "Sent for review" && p.reviewTo && (
        <div className="review">
          <span>↗</span> Sent to {p.reviewTo}
          {p.reviewOn ? ` · ${fmtShort(p.reviewOn)}` : ""}
        </div>
      )}
      {p.stage === "Parked" && p.parkedReason && <div className="parkednote">Parked: {p.parkedReason}</div>}
      {p.nextStep && (
        <div className="next">
          <b>Next step</b>
          {p.nextStep}
        </div>
      )}
      <div className="cardfoot">
        <div className="dates">
          <span>Start {fmtShort(p.startDate)}</span>
          {p.deadline && <span className={p.isOverdue ? "over" : ""}>Due {fmtShort(p.deadline)}</span>}
        </div>
        <span className={`stamp${p.isStale ? " stale" : ""}`}>
          {p.isStale ? `stale · ${p.staleDays} working days` : `updated ${relDay(p.updatedAt)}`}
        </span>
      </div>
    </div>
  );
}
