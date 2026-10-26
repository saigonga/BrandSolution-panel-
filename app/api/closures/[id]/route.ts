import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { handle, HttpError, requireUser } from "@/lib/session";
import { dayKey } from "@/lib/time";
import { writableDays } from "@/lib/stats";

// Entries can be removed (and re-entered) freely until the day locks.
export const DELETE = handle(async (_req: Request, ctx: { params: Promise<{ id: string }> }) => {
  const me = await requireUser();
  const c = await prisma.closure.findUnique({ where: { id: (await ctx.params).id } });
  if (!c) throw new HttpError(404, "That entry no longer exists.");
  if (c.ownerId !== me.id) throw new HttpError(403, "You can only change your own entries.");

  const days = await writableDays(me.id);
  if (!days.has(dayKey(c.date))) {
    throw new HttpError(423, "That day is locked. Request a backfill to change it.");
  }

  await prisma.closure.delete({ where: { id: c.id } });
  return NextResponse.json({ ok: true });
});
