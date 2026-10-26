import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { handle, HttpError, readJson, requireUser } from "@/lib/session";
import { str } from "@/lib/validate";
import { addDays, dayKey, dayStart, fmtShort, isValidKey } from "@/lib/time";
import { BACKFILL_MAX_DAYS } from "@/config/settings";

// Ask the manager to reopen a past, locked day.
export const POST = handle(async (req: Request) => {
  const me = await requireUser();
  const b = await readJson(req);

  if (!isValidKey(b.date)) throw new HttpError(400, "Pick the day you missed.");
  const today = dayKey();
  if (b.date >= today) throw new HttpError(400, "Today is still open. Log it directly in the ledger.");
  if (b.date < addDays(today, -BACKFILL_MAX_DAYS)) {
    throw new HttpError(400, `Backfills only reach back ${BACKFILL_MAX_DAYS} days.`);
  }

  const reason = str(b.reason, 300);
  if (!reason) throw new HttpError(400, "Add a one-line reason for the manager.");

  const date = dayStart(b.date);
  const dup = await prisma.backfillRequest.findFirst({
    where: { requesterId: me.id, date, status: { in: ["PENDING", "APPROVED"] } },
  });
  if (dup && (dup.status === "PENDING" || (dup.decidedAt && dayKey(dup.decidedAt) === today))) {
    throw new HttpError(409, `You already have an open request for ${fmtShort(date)}.`);
  }

  await prisma.backfillRequest.create({ data: { requesterId: me.id, date, reason } });
  return NextResponse.json({ ok: true }, { status: 201 });
});
