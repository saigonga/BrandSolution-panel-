import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  addDays, dayKey, dayStart, isLocked, isWorkingDay, monthStartKey, workingDaysBetween,
} from "@/lib/time";
import { STALE_WORKING_DAYS } from "@/config/settings";
import { ACTIVE_STAGES } from "@/lib/constants";
import { computeMargins } from "@/lib/money";
import type {
  BackfillDTO, ClosureDTO, HabitStats, ProjectDTO, UpdateDTO,
} from "@/lib/dto";

// ---------- habit: fill rate + streak ----------

// ownerId -> set of IST day keys on which they logged a closure or a 000.
export async function loadFilledMap(fromKey: string): Promise<Map<string, Set<string>>> {
  const rows = await prisma.closure.findMany({
    where: { date: { gte: dayStart(fromKey) } },
    select: { ownerId: true, date: true },
  });
  const map = new Map<string, Set<string>>();
  for (const r of rows) {
    const k = dayKey(r.date);
    if (!map.has(r.ownerId)) map.set(r.ownerId, new Set());
    map.get(r.ownerId)!.add(k);
  }
  return map;
}

export function habitStats(filled: Set<string> | undefined, now: Date = new Date(), sinceKey?: string): HabitStats {
  const set = filled ?? new Set<string>();
  const today = dayKey(now);
  const locked = isLocked(now);
  // Days before someone joined the panel never count as misses.
  const since = sinceKey ?? "0000-00-00";

  // Fill rate this month. Today only counts once it is filled or locked.
  let num = 0;
  let den = 0;
  let k = monthStartKey(now) > since ? monthStartKey(now) : since;
  while (k <= today) {
    if (isWorkingDay(k)) {
      const counts = k !== today || set.has(k) || locked;
      if (counts) {
        den++;
        if (set.has(k)) num++;
      }
    }
    k = addDays(k, 1);
  }

  // Streak: consecutive filled working days, counting back from today
  // (or yesterday if today is still open and not yet filled).
  let streak = 0;
  let cur = today;
  if (!set.has(today)) {
    if (locked && isWorkingDay(today)) return { streak: 0, fillNum: num, fillDen: den, filledToday: false };
    cur = addDays(today, -1);
  }
  let guard = 0;
  while (guard++ < 400 && cur >= since) {
    if (isWorkingDay(cur)) {
      if (set.has(cur)) streak++;
      else break;
    }
    cur = addDays(cur, -1);
  }

  return { streak, fillNum: num, fillDen: den, filledToday: set.has(today) };
}

export function habitWindowStart(now: Date = new Date()): string {
  const a = addDays(dayKey(now), -150);
  const m = monthStartKey(now);
  return a < m ? a : m;
}

// ---------- projects ----------

// Closed / Dropped projects stay visible for the month they ended in, then archive.
export function visibleProjectsWhere(now: Date = new Date()): Prisma.ProjectWhereInput {
  return {
    NOT: {
      AND: [
        { stage: { in: ["Closed", "Dropped"] } },
        { updatedAt: { lt: dayStart(monthStartKey(now)) } },
      ],
    },
  };
}

export const projectInclude = {
  client: { select: { id: true, brand: true } },
  owner: { select: { id: true, name: true, image: true } },
} satisfies Prisma.ProjectInclude;

type ProjectRow = Prisma.ProjectGetPayload<{ include: typeof projectInclude }>;

export function toProjectDTO(p: ProjectRow, now: Date = new Date()): ProjectDTO {
  const today = dayKey(now);
  const active = ACTIVE_STAGES.includes(p.stage);
  const staleDays = workingDaysBetween(dayKey(p.updatedAt), today);
  const openish = active || p.stage === "Not started";
  return {
    id: p.id,
    name: p.name,
    workType: p.workType === "INTERNAL" ? "INTERNAL" : "CLIENT",
    projectType: p.projectType,
    stage: p.stage,
    nextStep: p.nextStep,
    startDate: p.startDate.toISOString(),
    deadline: p.deadline ? p.deadline.toISOString() : null,
    reviewTo: p.reviewTo,
    reviewOn: p.reviewOn ? p.reviewOn.toISOString() : null,
    parkedReason: p.parkedReason,
    internalCategory: p.internalCategory,
    productCategory: p.productCategory,
    client: p.client ? { id: p.client.id, brand: p.client.brand } : null,
    owner: { id: p.owner.id, name: p.owner.name, image: p.owner.image },
    updatedAt: p.updatedAt.toISOString(),
    staleDays,
    isStale: active && staleDays >= STALE_WORKING_DAYS,
    isOverdue: openish && !!p.deadline && dayKey(p.deadline) < today,
  };
}

export function toUpdateDTO(u: {
  id: string; type: string; body: string | null; fromStage: string | null; toStage: string | null;
  createdAt: Date; author: { id: string; name: string };
}): UpdateDTO {
  const t = ["NOTE", "STAGE", "CREATE", "EDIT"].includes(u.type) ? u.type : "NOTE";
  return {
    id: u.id,
    type: t as UpdateDTO["type"],
    body: u.body,
    fromStage: u.fromStage,
    toStage: u.toStage,
    createdAt: u.createdAt.toISOString(),
    author: { id: u.author.id, name: u.author.name },
  };
}

// ---------- closures ----------

export const closureInclude = {
  client: { select: { id: true, brand: true } },
  owner: { select: { id: true, name: true } },
} satisfies Prisma.ClosureInclude;

type ClosureRow = Prisma.ClosureGetPayload<{ include: typeof closureInclude }>;

export function toClosureDTO(c: ClosureRow, editableDays: Set<string>, viewerId: string): ClosureDTO {
  const { net, gross } = computeMargins(c.closedAmount, c.agencyFee, c.directExpense);
  const k = dayKey(c.date);
  return {
    id: c.id,
    dayKey: k,
    isZero: c.isZero,
    description: c.description,
    productCategory: c.productCategory,
    client: c.client ? { id: c.client.id, brand: c.client.brand } : null,
    owner: { id: c.owner.id, name: c.owner.name },
    closedAmount: c.closedAmount,
    agencyFee: c.agencyFee,
    directExpense: c.directExpense,
    net: c.isZero ? 0 : net,
    gross: c.isZero ? 0 : gross,
    editable: c.owner.id === viewerId && editableDays.has(k),
  };
}

export interface MoneyTotals {
  closed: number;
  fee: number;
  direct: number;
  net: number;
  gross: number;
  count: number;
}

export function emptyTotals(): MoneyTotals {
  return { closed: 0, fee: 0, direct: 0, net: 0, gross: 0, count: 0 };
}

export function addToTotals(t: MoneyTotals, c: { isZero: boolean; closedAmount: number; agencyFee: number; directExpense: number }) {
  if (c.isZero) return;
  const { net, gross } = computeMargins(c.closedAmount, c.agencyFee, c.directExpense);
  t.closed += c.closedAmount;
  t.fee += c.agencyFee;
  t.direct += c.directExpense;
  t.net += net;
  t.gross += gross;
  t.count += 1;
}

// ---------- backfill ----------

// An approved backfill can be used until that day's lock on the day it was approved.
export function backfillUsable(b: { status: string; decidedAt: Date | null }, now: Date = new Date()): boolean {
  if (b.status !== "APPROVED" || !b.decidedAt) return false;
  return dayKey(b.decidedAt) === dayKey(now) && !isLocked(now);
}

export function toBackfillDTO(
  b: { id: string; date: Date; reason: string; status: string; decidedAt: Date | null; createdAt: Date; requester: { id: string; name: string } },
  now: Date = new Date()
): BackfillDTO {
  const s = b.status === "APPROVED" || b.status === "DENIED" ? b.status : "PENDING";
  return {
    id: b.id,
    dayKey: dayKey(b.date),
    reason: b.reason,
    status: s,
    usableNow: backfillUsable(b, now),
    requester: { id: b.requester.id, name: b.requester.name },
    createdAt: b.createdAt.toISOString(),
  };
}

// Days on which this user may currently write ledger entries.
export async function writableDays(userId: string, now: Date = new Date()): Promise<Set<string>> {
  const days = new Set<string>();
  if (isLocked(now)) return days;
  days.add(dayKey(now));
  const approved = await prisma.backfillRequest.findMany({
    where: { requesterId: userId, status: "APPROVED", decidedAt: { gte: dayStart(dayKey(now)) } },
  });
  for (const b of approved) if (backfillUsable(b, now)) days.add(dayKey(b.date));
  return days;
}
