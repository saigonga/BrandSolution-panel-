"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { useShell } from "@/components/AppShell";
import Avatar from "@/components/Avatar";
import { useEscape } from "@/components/useEscape";
import { ACTIVE_STAGES, PROJECT_TYPES, STAGES } from "@/lib/constants";
import { api, todayKeyIST } from "@/lib/api";

export default function ProjectModal({ mode, onClose }: { mode: "self" | "assign"; onClose: () => void }) {
  const { me, clients, team, isManager } = useShell();
  const router = useRouter();
  useEscape(onClose);

  const assigning = mode === "assign" && isManager;
  const others = team.filter((m) => m.id !== me.id);
  const today = todayKeyIST();

  const [name, setName] = useState("");
  const [workType, setWorkType] = useState<"CLIENT" | "INTERNAL">("CLIENT");
  const [clientId, setClientId] = useState(clients[0]?.id ?? "");
  const [productCategory, setProductCategory] = useState(clients[0]?.productCategories[0] ?? "");
  const [internalCategory, setInternalCategory] = useState("");
  const [projectType, setProjectType] = useState(PROJECT_TYPES[0]);
  const [ownerId, setOwnerId] = useState(assigning ? others[0]?.id ?? me.id : me.id);
  const [stage, setStage] = useState("Not started");
  const [nextStep, setNextStep] = useState("");
  const [deadline, setDeadline] = useState("");
  const [reviewTo, setReviewTo] = useState(team.find((m) => m.role === "MANAGER")?.name ?? "Client");
  const [reviewOn, setReviewOn] = useState(today);
  const [parkedReason, setParkedReason] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const client = useMemo(() => clients.find((c) => c.id === clientId), [clients, clientId]);
  const active = ACTIVE_STAGES.includes(stage);

  function pickClient(id: string) {
    setClientId(id);
    setProductCategory(clients.find((c) => c.id === id)?.productCategories[0] ?? "");
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setBusy(true);
    try {
      await api("/api/projects", "POST", {
        name,
        workType,
        clientId: workType === "CLIENT" ? clientId : undefined,
        productCategory: workType === "CLIENT" ? productCategory : undefined,
        internalCategory: workType === "INTERNAL" ? internalCategory : undefined,
        projectType,
        ownerId: assigning ? ownerId : me.id,
        stage,
        nextStep,
        deadline,
        reviewTo: stage === "Sent for review" ? reviewTo : undefined,
        reviewOn: stage === "Sent for review" ? reviewOn : undefined,
        parkedReason: stage === "Parked" ? parkedReason : undefined,
      });
      onClose();
      router.refresh();
    } catch (e) {
      setErr((e as Error).message);
      setBusy(false);
    }
  }

  return (
    <div className="scrim" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <form className="modal" role="dialog" aria-modal="true" aria-label={assigning ? "Assign project" : "New project"} onSubmit={submit}>
        <div className="mhead">
          <h3>{assigning ? "Assign project" : "New project"}</h3>
          <button type="button" className="x" onClick={onClose} aria-label="Close">×</button>
        </div>

        <div className="mbody">
          <div className="ff">
            <label htmlFor="pm-name">Project name <span className="req">*</span></label>
            <input id="pm-name" autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Scapia · YouTube + IG GTM" maxLength={140} />
          </div>

          <div className="ff">
            <label>Work type</label>
            <div className="seg">
              <button type="button" className={workType === "CLIENT" ? "on" : ""} onClick={() => setWorkType("CLIENT")}>Client</button>
              <button type="button" className={workType === "INTERNAL" ? "on" : ""} onClick={() => setWorkType("INTERNAL")}>Internal</button>
            </div>
          </div>

          <div className="fgrid">
            {workType === "CLIENT" ? (
              clients.length ? (
                <>
                  <div className="ff">
                    <label htmlFor="pm-client">Client <span className="req">*</span></label>
                    <select id="pm-client" value={clientId} onChange={(e) => pickClient(e.target.value)}>
                      {clients.map((c) => <option key={c.id} value={c.id}>{c.brand}</option>)}
                    </select>
                  </div>
                  <div className="ff">
                    <label htmlFor="pm-prod">Product category</label>
                    <select id="pm-prod" value={productCategory} onChange={(e) => setProductCategory(e.target.value)}>
                      {(client?.productCategories ?? []).map((p) => <option key={p} value={p}>{p}</option>)}
                    </select>
                  </div>
                </>
              ) : (
                <div className="ff full">
                  <div className="callout warn">
                    <span className="ic">!</span>
                    <div>
                      No clients yet. <Link href="/clients" onClick={onClose} style={{ color: "var(--brand)" }}>Add one in the Client directory</Link> first.
                    </div>
                  </div>
                </div>
              )
            ) : (
              <div className="ff full">
                <label htmlFor="pm-int">Category <span className="req">*</span></label>
                <input id="pm-int" value={internalCategory} onChange={(e) => setInternalCategory(e.target.value)} placeholder="e.g. Mattress category, internal workflow" maxLength={120} />
              </div>
            )}

            <div className="ff">
              <label htmlFor="pm-type">Project type</label>
              <select id="pm-type" value={projectType} onChange={(e) => setProjectType(e.target.value)}>
                {PROJECT_TYPES.map((t) => <option key={t}>{t}</option>)}
              </select>
            </div>

            <div className="ff">
              <label htmlFor="pm-owner">Owner</label>
              {assigning ? (
                <select id="pm-owner" value={ownerId} onChange={(e) => setOwnerId(e.target.value)}>
                  {team.map((m) => <option key={m.id} value={m.id}>{m.name}{m.id === me.id ? " (you)" : ""}</option>)}
                </select>
              ) : (
                <div className="ownerchip">
                  <Avatar name={me.name} image={me.image} />
                  <span>{me.name}</span>
                  <span className="you">You</span>
                </div>
              )}
            </div>

            <div className="ff">
              <label htmlFor="pm-stage">Stage</label>
              <select id="pm-stage" value={stage} onChange={(e) => setStage(e.target.value)}>
                {STAGES.map((s) => <option key={s}>{s}</option>)}
              </select>
            </div>
          </div>

          <div className="ff">
            <label htmlFor="pm-next">Next step {active && <span className="req">*</span>}</label>
            <input id="pm-next" value={nextStep} onChange={(e) => setNextStep(e.target.value)} placeholder="The single next move" maxLength={300} />
            {active && <div className="hintline req">Required while a project is active.</div>}
          </div>

          <div className="fgrid">
            <div className="ff">
              <label htmlFor="pm-start">Start date <span className="auto-note">· auto, set to today</span></label>
              <input id="pm-start" type="date" value={today} readOnly />
            </div>
            <div className="ff">
              <label htmlFor="pm-deadline">Deadline <span className="req">*</span></label>
              <input id="pm-deadline" type="date" min={today} value={deadline} onChange={(e) => setDeadline(e.target.value)} />
            </div>
          </div>

          {stage === "Sent for review" && (
            <div className="condbox">
              <div className="lbl">Review detail</div>
              <div className="ff">
                <label htmlFor="pm-rto">Sent to</label>
                <select id="pm-rto" value={reviewTo} onChange={(e) => setReviewTo(e.target.value)}>
                  {team.map((m) => <option key={m.id}>{m.name}</option>)}
                  <option>Client</option>
                </select>
              </div>
              <div className="ff">
                <label htmlFor="pm-ron">Sent on</label>
                <input id="pm-ron" type="date" max={today} value={reviewOn} onChange={(e) => setReviewOn(e.target.value)} />
              </div>
            </div>
          )}

          {stage === "Parked" && (
            <div className="condbox slate">
              <div className="lbl">Parked reason</div>
              <div className="ff full">
                <label htmlFor="pm-park">Why parked</label>
                <input id="pm-park" value={parkedReason} onChange={(e) => setParkedReason(e.target.value)} placeholder="One line on why it's paused" maxLength={200} />
              </div>
            </div>
          )}
        </div>

        <div className="mfoot">
          {err && <div className="formerr">{err}</div>}
          <button type="button" className="btn ghost" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn pri" disabled={busy || (workType === "CLIENT" && !clients.length)}>
            {busy ? "Saving…" : assigning ? "Assign project" : "Create project"}
          </button>
        </div>
      </form>
    </div>
  );
}
