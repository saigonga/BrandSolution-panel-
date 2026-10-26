"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { useShell } from "@/components/AppShell";
import { useEscape } from "@/components/useEscape";
import type { ProjectDTO, UpdateDTO } from "@/lib/dto";
import { ACTIVE_STAGES, STAGES, stageClass } from "@/lib/constants";
import { calendarDaysBetween, dayKey, fmtShort, fmtTime, relDay } from "@/lib/time";
import { api, keyFromISO, todayKeyIST } from "@/lib/api";

interface Detail {
  project: ProjectDTO;
  updates: UpdateDTO[];
  canEdit: boolean;
  locked: boolean;
}

const EVT_LABEL: Record<UpdateDTO["type"], string> = { NOTE: "Note", STAGE: "Stage", CREATE: "Created", EDIT: "Edit" };

export default function ProjectDrawer({ id, onClose }: { id: string; onClose: () => void }) {
  const { team } = useShell();
  const router = useRouter();
  useEscape(onClose);

  const [data, setData] = useState<Detail | null>(null);
  const [loadErr, setLoadErr] = useState<string | null>(null);

  // composer
  const [note, setNote] = useState("");
  const [stage, setStage] = useState("");
  const [nextStep, setNextStep] = useState("");
  const [deadline, setDeadline] = useState("");
  const [reviewTo, setReviewTo] = useState("");
  const [reviewOn, setReviewOn] = useState("");
  const [parkedReason, setParkedReason] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const d = await api<Detail>(`/api/projects/${id}`);
      setData(d);
      const p = d.project;
      setStage(p.stage);
      setNextStep(p.nextStep ?? "");
      setDeadline(keyFromISO(p.deadline));
      setReviewTo(p.reviewTo ?? team.find((m) => m.role === "MANAGER")?.name ?? "Client");
      setReviewOn(p.reviewOn ? keyFromISO(p.reviewOn) : todayKeyIST());
      setParkedReason(p.parkedReason ?? "");
    } catch (e) {
      setLoadErr((e as Error).message);
    }
  }, [id, team]);

  useEffect(() => {
    load();
  }, [load]);

  async function post(e: React.FormEvent) {
    e.preventDefault();
    if (!data) return;
    setErr(null);
    setBusy(true);
    try {
      await api(`/api/projects/${id}/updates`, "POST", {
        note,
        stage,
        nextStep,
        deadline,
        ...(stage === "Sent for review" ? { reviewTo, reviewOn } : {}),
        ...(stage === "Parked" ? { parkedReason } : {}),
      });
      setNote("");
      await load();
      router.refresh();
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const p = data?.project;
  const today = todayKeyIST();
  const active = ACTIVE_STAGES.includes(stage);

  return (
    <div className="drawer">
      <div className="ovl" onClick={onClose} />
      <div className="dpanel" role="dialog" aria-modal="true" aria-label={p ? p.name : "Project"}>
        <div className="dhead">
          <div className="drow">
            <h3>{p ? p.name : "Loading…"}</h3>
            <button className="x" onClick={onClose} aria-label="Close">×</button>
          </div>
          {p && (
            <div className="dmeta">
              <span>{p.owner.name}</span>
              <span className="sep">·</span>
              <span>{p.workType === "INTERNAL" ? "Internal" : "Client"}</span>
              <span className="sep">·</span>
              <span>
                {p.workType === "INTERNAL"
                  ? p.internalCategory
                  : `${p.client?.brand ?? ""}${p.productCategory ? ` · ${p.productCategory}` : ""}`}
              </span>
              <span className="sep">·</span>
              <span>{p.projectType}</span>
              <span className={`pill ${stageClass(p.stage)}`}>{p.stage}</span>
            </div>
          )}
        </div>

        <div className="dbody">
          {loadErr && <div className="formerr">{loadErr}</div>}
          {!data && !loadErr && <div className="loading">Loading project…</div>}

          {data && p && (
            <>
              {data.canEdit && !data.locked && (
                <form className="composer" onSubmit={post}>
                  <span className="lab">Mark an update</span>
                  <div className="ff">
                    <textarea
                      id="dr-note"
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                      placeholder="What moved on this project today?"
                      maxLength={2000}
                      aria-label="Update note"
                    />
                  </div>
                  <div className="fgrid">
                    <div className="ff">
                      <label htmlFor="dr-stage">Stage</label>
                      <select id="dr-stage" value={stage} onChange={(e) => setStage(e.target.value)}>
                        {STAGES.map((s) => <option key={s}>{s}</option>)}
                      </select>
                    </div>
                    <div className="ff">
                      <label htmlFor="dr-deadline">Deadline</label>
                      <input id="dr-deadline" type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} />
                    </div>
                    <div className="ff full">
                      <label htmlFor="dr-next">Next step {active && <span className="req">*</span>}</label>
                      <input id="dr-next" value={nextStep} onChange={(e) => setNextStep(e.target.value)} placeholder="The single next move" maxLength={300} />
                    </div>
                  </div>

                  {stage === "Sent for review" && (
                    <div className="condbox">
                      <div className="lbl">Review detail</div>
                      <div className="ff">
                        <label htmlFor="dr-rto">Sent to</label>
                        <select id="dr-rto" value={reviewTo} onChange={(e) => setReviewTo(e.target.value)}>
                          {team.map((m) => <option key={m.id}>{m.name}</option>)}
                          <option>Client</option>
                        </select>
                      </div>
                      <div className="ff">
                        <label htmlFor="dr-ron">Sent on</label>
                        <input id="dr-ron" type="date" max={today} value={reviewOn} onChange={(e) => setReviewOn(e.target.value)} />
                      </div>
                    </div>
                  )}

                  {stage === "Parked" && (
                    <div className="condbox slate">
                      <div className="lbl">Parked reason</div>
                      <div className="ff full">
                        <label htmlFor="dr-park">Why parked</label>
                        <input id="dr-park" value={parkedReason} onChange={(e) => setParkedReason(e.target.value)} placeholder="One line on why it's paused" maxLength={200} />
                      </div>
                    </div>
                  )}

                  {err && <div className="formerr">{err}</div>}
                  <div style={{ display: "flex", justifyContent: "flex-end" }}>
                    <button type="submit" className="btn pri" disabled={busy}>{busy ? "Posting…" : "Post update"}</button>
                  </div>
                </form>
              )}

              {data.canEdit && data.locked && (
                <div className="callout crit">
                  <span className="ic">!</span>
                  <div>Today is locked after 11:30 PM. Updates reopen at midnight.</div>
                </div>
              )}

              {!data.canEdit && (
                <div className="callout">
                  <span className="ic" style={{ color: "var(--info)" }}>●</span>
                  <div>This is {p.owner.name.split(" ")[0]}&apos;s project. You can read its history; only the owner or the manager can post to it.</div>
                </div>
              )}

              <div className="dsum">
                <div className="m">Open for<b>{(() => { const n = calendarDaysBetween(keyFromISO(p.startDate), dayKey()) + 1; return `${n} ${n === 1 ? "day" : "days"}`; })()}</b></div>
                <div className="m">Updates<b>{data.updates.filter((u) => u.type !== "CREATE").length}</b></div>
                <div className="m">Last touched<b>{relDay(p.updatedAt)}</b></div>
                <div className="m">Deadline<b className={p.isOverdue ? "neg" : ""}>{p.deadline ? fmtShort(p.deadline) : "—"}</b></div>
              </div>

              <div className="tl-title">Activity · newest first</div>
              <div className="timeline">
                {data.updates.map((u) => (
                  <div key={u.id} className={`tl-item ev-${u.type}${u.type === "STAGE" && u.toStage === "Closed" ? " closed" : ""}`}>
                    <span className="dot" />
                    <div className="tl-head">
                      <span className="au">{u.author.name.split(" ")[0]}</span>
                      <span className="tm">{fmtShort(u.createdAt)} · {fmtTime(u.createdAt)}</span>
                      <span className="evt">{EVT_LABEL[u.type]}</span>
                    </div>
                    <div className="tl-body">
                      {u.type === "STAGE" && (
                        <span className="fromto">{u.fromStage} → {u.toStage}</span>
                      )}
                      {u.type === "STAGE" && u.body ? `  ${u.body}` : null}
                      {u.type !== "STAGE" && u.body}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
