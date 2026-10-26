import { HttpError } from "@/lib/session";
import { ACTIVE_STAGES, PROJECT_TYPES, STAGES } from "@/lib/constants";
import { dayStart, isValidKey } from "@/lib/time";

export function str(v: unknown, max = 500): string | null {
  if (typeof v !== "string") return null;
  const t = v.trim();
  return t ? t.slice(0, max) : null;
}

export function amount(v: unknown, label: string): number {
  if (v === "" || v === null || v === undefined) return 0;
  const n = typeof v === "number" ? v : Number(String(v).replace(/[,\s₹]/g, ""));
  if (!Number.isFinite(n) || n < 0) throw new HttpError(400, `${label} must be a positive number.`);
  if (n > 1_000_000_000) throw new HttpError(400, `${label} looks too large. Check the figure.`);
  return Math.round(n);
}

export function dateKeyField(v: unknown, label: string, required: boolean): Date | null {
  if (v === "" || v === null || v === undefined) {
    if (required) throw new HttpError(400, `${label} is required.`);
    return null;
  }
  if (!isValidKey(v)) throw new HttpError(400, `${label} must be a valid date.`);
  return dayStart(v);
}

export function checkStage(v: unknown): string {
  if (typeof v !== "string" || !(STAGES as readonly string[]).includes(v)) {
    throw new HttpError(400, "Pick a valid stage.");
  }
  return v;
}

export function checkProjectType(v: unknown): string {
  if (typeof v !== "string" || !PROJECT_TYPES.includes(v)) {
    throw new HttpError(400, "Pick a valid project type.");
  }
  return v;
}

// The rules that hold for a project in any stage.
export function checkStageRules(p: {
  stage: string; nextStep: string | null; reviewTo: string | null; reviewOn: Date | null; parkedReason: string | null;
}) {
  if (ACTIVE_STAGES.includes(p.stage) && !p.nextStep) {
    throw new HttpError(400, "Add a next step. Active projects always need one.");
  }
  if (p.stage === "Sent for review" && (!p.reviewTo || !p.reviewOn)) {
    throw new HttpError(400, "Say who it was sent to for review, and when.");
  }
  if (p.stage === "Parked" && !p.parkedReason) {
    throw new HttpError(400, "Add a one-line reason for parking it.");
  }
}

export function cleanCats(v: unknown): string[] {
  const raw = Array.isArray(v) ? v : typeof v === "string" ? v.split(",") : [];
  const out: string[] = [];
  for (const x of raw) {
    if (typeof x !== "string") continue;
    const t = x.trim().slice(0, 80);
    if (t && !out.some((o) => o.toLowerCase() === t.toLowerCase())) out.push(t);
  }
  return out;
}
