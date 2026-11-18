import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { findMember, teamsFor, TEAM, type Role } from "@/config/team";
import { teamDef } from "@/config/teams";
import { dayKey } from "@/lib/time";

export interface CurrentUser {
  id: string;
  email: string;
  name: string;
  title: string;
  role: Role;
  money: boolean; // on a team that tracks closures and clients
  image: string | null;
  joinedKey: string;
}

const REQUIRE_LOGIN = true;

// The roster in config/team.ts is the source of truth for who can get in
// and what role they hold. The DB row supplies the stable id.
export async function getUser(): Promise<CurrentUser | null> {
  const session = await getServerSession(authOptions).catch(() => null);
  const email = session?.user?.email;
  const member = findMember(email) ?? (!REQUIRE_LOGIN ? TEAM[0] : undefined);
  if (!member) return null;
  // Read first: a write on every request is the slow path.
  const row =
    (await prisma.user.findUnique({ where: { email: member.email } })) ??
    (await prisma.user.upsert({
      where: { email: member.email },
      update: {},
      create: { email: member.email, name: member.name, role: member.role, image: session?.user?.image ?? null },
    }));
  return {
    id: row.id,
    email: row.email,
    name: member.name,
    title: member.title,
    role: member.role,
    money: teamsFor(member).some((t) => teamDef(t).money),
    image: row.image,
    joinedKey: dayKey(row.createdAt),
  };
}

export class HttpError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export async function requireUser(): Promise<CurrentUser> {
  const u = await getUser();
  if (!u) throw new HttpError(401, "Sign in to continue.");
  return u;
}

// Closures, clients and backfills belong to teams that track money.
export async function requireMoneyUser(): Promise<CurrentUser> {
  const u = await requireUser();
  if (!u.money) throw new HttpError(403, "Your team does not use this.");
  return u;
}

export async function requireManager(): Promise<CurrentUser> {
  const u = await requireUser();
  if (u.role !== "MANAGER") throw new HttpError(403, "Only the manager can do this.");
  return u;
}

export function handle<T extends unknown[]>(fn: (...args: T) => Promise<Response>) {
  return async (...args: T): Promise<Response> => {
    try {
      return await fn(...args);
    } catch (e) {
      if (e instanceof HttpError) {
        return NextResponse.json({ error: e.message }, { status: e.status });
      }
      console.error(e);
      return NextResponse.json({ error: "Something went wrong. Try again." }, { status: 500 });
    }
  };
}

export async function readJson(req: Request): Promise<Record<string, any>> {
  try {
    const body = await req.json();
    return body && typeof body === "object" ? body : {};
  } catch {
    throw new HttpError(400, "Request body must be JSON.");
  }
}
