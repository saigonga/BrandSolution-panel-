import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { handle, HttpError, readJson, requireUser } from "@/lib/session";
import { amount, str } from "@/lib/validate";
import { addDays, dayKey, dayStart } from "@/lib/time";
import { parseCats } from "@/lib/dto";
import { backfillUsable, writableDays } from "@/lib/stats";

// Log a closure for today (or for an approved backfill day), or mark 000.
export const POST = handle(async (req: Request) => {
  const me = await requireUser();
  const b = await readJson(req);

  const days = await writableDays(me.id);
  if (days.size === 0) throw new HttpError(423, "Today is locked after 11:30 PM. It reopens at midnight.");

  let target = dayKey();
  if (b.backfillId) {
    const bf = await prisma.backfillRequest.findUnique({ where: { id: String(b.backfillId) } });
    if (!bf || bf.requesterId !== me.id || !backfillUsable(bf)) {
      throw new HttpError(403, "That backfill isn't open. It needs the manager's approval, and it closes at today's lock.");
    }
    target = dayKey(bf.date);
  }
  if (!days.has(target)) throw new HttpError(423, "That day is locked. Request a backfill to add to it.");

  const start = dayStart(target);
  const end = dayStart(addDays(target, 1));
  const existing = await prisma.closure.findMany({
    where: { ownerId: me.id, date: { gte: start, lt: end } },
    select: { id: true, isZero: true },
  });

  if (b.zero) {
    if (existing.some((e) => !e.isZero)) {
      throw new HttpError(400, "You've already logged a closure for this day. 000 is only for days with none.");
    }
    if (!existing.some((e) => e.isZero)) {
      await prisma.closure.create({ data: { ownerId: me.id, date: start, isZero: true } });
    }
    return NextResponse.json({ ok: true }, { status: 201 });
  }

  const client = await prisma.client.findUnique({ where: { id: String(b.clientId ?? "") } });
  if (!client) throw new HttpError(400, "Pick the client this closed with.");

  const description = str(b.description, 200);
  if (!description) throw new HttpError(400, "Say what closed, for example 2 creators · IG reels.");

  const pc = str(b.productCategory, 80);
  if (pc && !parseCats(client.productCategories).includes(pc)) {
    throw new HttpError(400, `${pc} isn't a product category for ${client.brand}.`);
  }

  const closedAmount = amount(b.closedAmount, "Closed amount");
  const agencyFee = amount(b.agencyFee, "Agency fee");
  const directExpense = amount(b.directExpense, "Direct expense");
  if (closedAmount === 0 && agencyFee === 0) {
    throw new HttpError(400, "Enter the closed amount or the agency fee.");
  }

  // A real closure replaces a 000 marked earlier the same day.
  await prisma.$transaction([
    prisma.closure.deleteMany({ where: { ownerId: me.id, isZero: true, date: { gte: start, lt: end } } }),
    prisma.closure.create({
      data: {
        ownerId: me.id,
        date: start,
        isZero: false,
        clientId: client.id,
        productCategory: pc,
        description,
        closedAmount,
        agencyFee,
        directExpense,
      },
    }),
  ]);

  return NextResponse.json({ ok: true }, { status: 201 });
});
