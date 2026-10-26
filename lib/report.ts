import { prisma } from "@/lib/prisma";
import { TEAM, findMember, teamOrder } from "@/config/team";
import { addDays, dayKey, dayStart, isWorkingDay, monthStartKey } from "@/lib/time";
import { STAGES } from "@/lib/constants";
import {
  addToTotals, closureInclude, emptyTotals, projectInclude, toProjectDTO, visibleProjectsWhere,
  type MoneyTotals,
} from "@/lib/stats";
import type { MemberDTO, ProjectDTO } from "@/lib/dto";

export async function getTeam(): Promise<MemberDTO[]> {
  const rows = await prisma.user.findMany();
  return rows
    .map((u) => ({ u, m: findMember(u.email) }))
    .filter((x) => !!x.m)
    .sort((a, b) => teamOrder(a.u.email) - teamOrder(b.u.email))
    .map(({ u, m }) => ({ id: u.id, name: m!.name, title: m!.title, role: m!.role, image: u.image, joinedKey: dayKey(u.createdAt) }));
}

export async function totalsByOwner(fromKey: string, toKeyExclusive: string) {
  const rows = await prisma.closure.findMany({
    where: { isZero: false, date: { gte: dayStart(fromKey), lt: dayStart(toKeyExclusive) } },
    select: { ownerId: true, isZero: true, closedAmount: true, agencyFee: true, directExpense: true },
  });
  const by = new Map<string, MoneyTotals>();
  const team = emptyTotals();
  for (const r of rows) {
    if (!by.has(r.ownerId)) by.set(r.ownerId, emptyTotals());
    addToTotals(by.get(r.ownerId)!, r);
    addToTotals(team, r);
  }
  return { by, team };
}

export async function monthTotals(now: Date = new Date()) {
  return totalsByOwner(monthStartKey(now), addDays(dayKey(now), 1));
}

export async function closuresOn(key: string) {
  return prisma.closure.findMany({
    where: { isZero: false, date: { gte: dayStart(key), lt: dayStart(addDays(key, 1)) } },
    include: closureInclude,
    orderBy: { createdAt: "asc" },
  });
}

export async function closuresBetween(fromKey: string, toKeyExclusive: string) {
  return prisma.closure.findMany({
    where: { isZero: false, date: { gte: dayStart(fromKey), lt: dayStart(toKeyExclusive) } },
    include: closureInclude,
    orderBy: [{ date: "asc" }, { createdAt: "asc" }],
  });
}

// ownerId -> day keys with any entry (closure or 000) in [from, to)
export async function filledBetween(fromKey: string, toKeyExclusive: string) {
  const rows = await prisma.closure.findMany({
    where: { date: { gte: dayStart(fromKey), lt: dayStart(toKeyExclusive) } },
    select: { ownerId: true, date: true },
  });
  const map = new Map<string, Set<string>>();
  for (const r of rows) {
    if (!map.has(r.ownerId)) map.set(r.ownerId, new Set());
    map.get(r.ownerId)!.add(dayKey(r.date));
  }
  return map;
}

export function workingKeys(fromKey: string, toKeyExclusive: string): string[] {
  const out: string[] = [];
  let k = fromKey;
  let guard = 0;
  while (k < toKeyExclusive && guard++ < 400) {
    if (isWorkingDay(k)) out.push(k);
    k = addDays(k, 1);
  }
  return out;
}

export async function visibleProjects(now: Date = new Date()): Promise<ProjectDTO[]> {
  const rows = await prisma.project.findMany({
    where: visibleProjectsWhere(now),
    include: projectInclude,
    orderBy: { updatedAt: "desc" },
  });
  return rows.map((p) => toProjectDTO(p, now));
}

export function stageCounts(projects: ProjectDTO[]): { stage: string; count: number }[] {
  return STAGES.map((s) => ({ stage: s, count: projects.filter((p) => p.stage === s).length }));
}

export async function pendingBackfills() {
  return prisma.backfillRequest.findMany({
    where: { status: "PENDING" },
    include: { requester: { select: { id: true, name: true } } },
    orderBy: { createdAt: "asc" },
  });
}

export async function movementsBetween(fromKey: string, toKeyExclusive: string) {
  return prisma.projectUpdate.findMany({
    where: {
      type: { in: ["STAGE", "CREATE"] },
      createdAt: { gte: dayStart(fromKey), lt: dayStart(toKeyExclusive) },
    },
    include: {
      author: { select: { name: true } },
      project: { select: { name: true, owner: { select: { name: true } } } },
    },
    orderBy: { createdAt: "asc" },
  });
}

export function rosterEmails(role?: "MANAGER" | "EMPLOYEE"): string[] {
  return TEAM.filter((m) => !role || m.role === role).map((m) => m.email);
}
